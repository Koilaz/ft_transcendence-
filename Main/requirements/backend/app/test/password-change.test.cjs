const { before, beforeEach, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const bcrypt = require('bcrypt');
const { AuthModule } = require('../dist/auth/auth.module');
const { PrismaService } = require('../dist/prisma/prisma.service');

let app;
let url;
let token;
let users;
let initialHash;
const currentPassword = 'current-password';
const newPassword = 'new-password';

before(async () => {
  process.env.JWT_SECRET = 'password-change-test-secret';
  initialHash = await bcrypt.hash(currentPassword, 4);
  const module = await Test.createTestingModule({ imports: [AuthModule] })
    .overrideProvider(PrismaService)
    .useValue({
      user: {
        findUnique: async ({ where }) => structuredClone(users.find((user) =>
          Object.entries(where).every(([key, value]) => user[key] === value),
        ) ?? null),
        updateMany: async ({ where, data }) => {
          const matching = users.filter((user) =>
            Object.entries(where).every(([key, value]) => user[key] === value),
          );
          for (const user of matching) Object.assign(user, data);
          return { count: matching.length };
        },
      },
    })
    .compile();

  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, forbidNonWhitelisted: true, transform: true,
  }));
  await app.listen(0, '127.0.0.1');
  url = await app.getUrl();
  token = await app.get(JwtService).signAsync({ sub: 1, username: 'first' });
});

beforeEach(() => {
  users = [1, 2].map((id) => ({
    id, username: `user${id}`, email: `user${id}@example.test`, passwordHash: initialHash,
  }));
});

after(async () => { await app?.close(); });

function request(path, method, body, accessToken = token) {
  return fetch(`${url}/api/auth/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

test('both password endpoints require a valid authenticated session', async () => {
  for (const accessToken of [null, 'invalid-token']) {
    assert.equal((await request('me/password/verify', 'POST', { currentPassword }, accessToken)).status, 401);
    assert.equal((await request('me/password', 'PATCH', { currentPassword, newPassword }, accessToken)).status, 401);
  }
  assert.equal(users[0].passwordHash, initialHash);
});

test('verification checks the current password without changing it or returning credentials', async () => {
  const wrong = await request('me/password/verify', 'POST', { currentPassword: 'wrong-password' });
  assert.equal(wrong.status, 401);
  assert.equal((await wrong.json()).message, 'Current password is incorrect');
  const correct = await request('me/password/verify', 'POST', { currentPassword });
  assert.equal(correct.status, 204);
  assert.equal(await correct.text(), '');
  assert.equal(users[0].passwordHash, initialHash);
});

test('saving rechecks the current password even after successful verification', async () => {
  assert.equal((await request('me/password/verify', 'POST', { currentPassword })).status, 204);
  const result = await request('me/password', 'PATCH', { currentPassword: 'wrong-password', newPassword });
  assert.equal(result.status, 401);
  assert.equal(users[0].passwordHash, initialHash);
});

test('invalid payloads and passwords too long for bcrypt are rejected without mutation', async () => {
  for (const body of [
    {}, { newPassword }, { currentPassword },
    { currentPassword: 12345678, newPassword },
    { currentPassword, newPassword: 12345678 },
    { currentPassword, newPassword: 'short' },
    { currentPassword, newPassword: 'a'.repeat(73) },
    { currentPassword, newPassword: 'é'.repeat(37) },
    { currentPassword, newPassword, userId: 2 },
  ]) {
    assert.equal((await request('me/password', 'PATCH', body)).status, 400);
    assert.equal(users[0].passwordHash, initialHash);
  }
});

test('change stores a bcrypt hash for the authenticated user; only the new password logs in', async () => {
  const result = await request('me/password', 'PATCH', { currentPassword, newPassword });
  assert.equal(result.status, 204);
  assert.equal(await result.text(), '');
  assert.notEqual(users[0].passwordHash, newPassword);
  assert.equal(await bcrypt.compare(newPassword, users[0].passwordHash), true);
  assert.equal(bcrypt.getRounds(users[0].passwordHash), 12);
  assert.equal(users[1].passwordHash, initialHash);
  assert.equal((await request('login', 'POST', { email: users[0].email, password: currentPassword }, null)).status, 401);
  assert.equal((await request('login', 'POST', { email: users[0].email, password: newPassword }, null)).status, 201);
});

test('a password changed after verification cannot be overwritten with the old password', async () => {
  assert.equal((await request('me/password/verify', 'POST', { currentPassword })).status, 204);
  const otherHash = await bcrypt.hash('changed-elsewhere', 4);
  users[0].passwordHash = otherHash;
  assert.equal((await request('me/password', 'PATCH', { currentPassword, newPassword })).status, 401);
  assert.equal(users[0].passwordHash, otherHash);
});

test('concurrent changes using the same old password cannot both succeed', async () => {
  const results = await Promise.all([
    request('me/password', 'PATCH', { currentPassword, newPassword: 'candidate-one' }),
    request('me/password', 'PATCH', { currentPassword, newPassword: 'candidate-two' }),
  ]);
  assert.deepEqual(results.map((result) => result.status).sort(), [204, 401]);
  const winner = results[0].status === 204 ? 'candidate-one' : 'candidate-two';
  assert.equal(await bcrypt.compare(winner, users[0].passwordHash), true);
});

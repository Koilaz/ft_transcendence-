const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { FriendsController } = require('../dist/friends/friends.controller');
const { FriendsService } = require('../dist/friends/friends.service');
const { JwtAuthGuard } = require('../dist/auth/jwt-auth.guard');

// Le BoundedIntPipe doit renvoyer 400 avant que la valeur n'atteigne
// Prisma : un identifiant hors int4 PostgreSQL fait echouer la requete
// (P2020), que Nest repond sinon en 500 non gere.
//
// Le ValidationPipe global (transform: true) convertit d'abord les
// parametres en number d'apres le type TS declare : le pipe borne donc
// le resultat de cette conversion, pas la string brute de l'URL.
let app;
let url;

before(async () => {
  const module = await Test.createTestingModule({
    controllers: [FriendsController],
    providers: [
      {
        provide: FriendsService,
        useValue: {
          sendFriendRequest: async () => ({ status: 'sent' }),
          acceptFriendRequest: async () => ({ status: 'accepted' }),
          removeFriendship: async () => ({ status: 'removed' }),
        },
      },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context) => {
        context.switchToHttp().getRequest().user = { userId: 1, username: 'me' };
        return true;
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
});

after(async () => { await app?.close(); });

async function postFriend(userId)
{
  const response = await fetch(`${url}/api/friends/${userId}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer test' },
  });
  return { status: response.status, body: await response.json() };
}

test('un identifiant valide atteint le service', async () => {
  const { status, body } = await postFriend('5');
  assert.equal(status, 201);
  assert.deepEqual(body, { status: 'sent' });
});

test('un identifiant non entier est refuse en 400', async () => {
  for (const invalid of ['abc', '5.5'])
  {
    const { status } = await postFriend(encodeURIComponent(invalid));
    assert.equal(status, 400, `${JSON.stringify(invalid)} doit donner 400`);
  }
});

test('un identifiant hors int4 est refuse en 400, pas 500', async () => {
  for (const out of ['2147483648', '-2147483649', '99999999999999999999'])
  {
    const { status } = await postFriend(out);
    assert.equal(status, 400, `${out} doit donner 400, pas 500`);
  }
});

test('les bornes int4 exactes passent le pipe', async () => {
  assert.equal((await postFriend('2147483647')).status, 201);
  assert.equal((await postFriend('-2147483648')).status, 201);
});

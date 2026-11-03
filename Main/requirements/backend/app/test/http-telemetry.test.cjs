const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { Controller, Get, UseGuards, UnauthorizedException } = require('@nestjs/common');
const { register } = require('prom-client');
const { httpTelemetry } = require('../dist/metrics/metrics.middleware');

test('HTTP telemetry counts final responses including guards/404s without logging secrets or scrapes', async () => {
  class Endpoints {
    ok() { return { ok: true }; }
    protected() { return {}; }
    metrics() { return register.metrics(); }
  }
  Controller()(Endpoints);
  for (const [method, path] of [['ok', 'users/:id'], ['protected', 'protected'], ['metrics', 'metrics']]) {
    Get(path)(Endpoints.prototype, method, Object.getOwnPropertyDescriptor(Endpoints.prototype, method));
  }
  UseGuards({ canActivate() { throw new UnauthorizedException(); } })(
    Endpoints.prototype, 'protected', Object.getOwnPropertyDescriptor(Endpoints.prototype, 'protected'));
  const module = await Test.createTestingModule({ controllers: [Endpoints] }).compile();
  const app = module.createNestApplication({ logger: false });
  const logs = [];
  app.use(httpTelemetry({ http: (...args) => logs.push(args) }));
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  try {
    for (const [path, expected] of [
      ['/api/users/private-id?token=secret', 200],
      ['/api/protected?token=secret', 401],
      ['/api/missing/private-id?token=secret', 404],
      ['/api/metrics?token=secret', 200],
    ]) {
      const response = await fetch(url + path);
      await response.text();
      assert.equal(response.status, expected);
    }
    assert.deepEqual(logs.map(([method, route, status]) => ({ method, route, status })), [
      { method: 'GET', route: '/api/users/:id', status: 200 },
      { method: 'GET', route: '/api/protected', status: 401 },
      { method: 'GET', route: 'unmatched', status: 404 },
    ]);
    const metrics = await register.metrics();
    assert.match(metrics, /http_requests_total\{method="GET",route="\/api\/protected",status="401"\} 1/);
    assert.match(metrics, /http_requests_total\{method="GET",route="unmatched",status="404"\} 1/);
    assert.doesNotMatch(metrics + JSON.stringify(logs), /secret|private-id/);
  } finally { await app.close(); }
});

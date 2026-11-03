const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { register } = require('prom-client');
const { NavigationController } = require('../dist/metrics/navigation.controller');
const { LogstashLogger } = require('../dist/logger/logstash.logger');

test('anonymous page views count known routes and reject arbitrary paths or extra data', async () => {
  const logs = [];
  const module = await Test.createTestingModule({
    controllers: [NavigationController],
    providers: [{ provide: LogstashLogger, useValue: { pageView: route => logs.push(route) } }],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  try {
    for (const [body, expected] of [
      [{ route: '/' }, 204], [{ route: '/game' }, 204], [{ route: '/' }, 204],
      [{ route: '/private?token=secret' }, 400], [{ route: '/', token: 'secret' }, 400], [{}, 400],
    ]) {
      const response = await fetch(url + '/api/telemetry/pageview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      await response.text(); assert.equal(response.status, expected);
    }
    assert.deepEqual(logs, ['/', '/game', '/']);
    const metrics = await register.metrics();
    assert.match(metrics, /page_views_total\{route="\/"\} 2/);
    assert.doesNotMatch(metrics, /private|secret/);
  } finally { await app.close(); }
});

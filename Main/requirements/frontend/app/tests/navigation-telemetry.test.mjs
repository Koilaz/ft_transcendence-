import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/services/navigationTelemetry.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { createNavigationTracker } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('home -> game -> home records real navigation; duplicate effects are ignored', () => {
  const events = [];
  const track = createNavigationTracker(route => events.push(route));
  for (const path of ['/', '/', '/game', '/game', '/', '/unknown/private-id']) track(path);
  assert.deepEqual(events, ['/', '/game', '/', 'not-found']);
});

test('tracking sends only a normalized route, not the URL or private query', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); return new Response(null, { status: 204 }); };
  try {
    createNavigationTracker()('/unknown?token=private');
    await Promise.resolve();
    assert.equal(calls[0][0], '/api/telemetry/pageview');
    assert.deepEqual(JSON.parse(calls[0][1].body), { route: 'not-found' });
    assert.doesNotMatch(JSON.stringify(calls), /token|private/);
  } finally { globalThis.fetch = original; }
});

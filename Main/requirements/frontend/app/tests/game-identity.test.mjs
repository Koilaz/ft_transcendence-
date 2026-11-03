import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Meme chargement que reconnection.test.mjs : on teste le module reel du
// frontend, pas une copie qui deriverait.
async function transpile(path)
{
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return outputText;
}

function toDataUrl(code)
{
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

// gameIdentity n'a aucun import runtime : chargeable tel quel.
const { hasGameIdentity } = await import(
  toDataUrl(await transpile('../src/services/gameIdentity.ts'))
);

// Un Storage minimal : la garde ne lit, jamais n'ecrit.
const storageWith = (entries) => ({
  getItem: (key) => entries[key] ?? null,
});

test('un compte connecte (accessToken) a une identite de jeu', () => {
  assert.equal(hasGameIdentity(storageWith({ accessToken: 'jwt' })), true);
});

test('un invite nomme (guestName) a une identite de jeu', () => {
  assert.equal(hasGameIdentity(storageWith({ guestName: 'Moutarde' })), true);
});

test('les deux ensemble passent aussi', () => {
  assert.equal(
    hasGameIdentity(storageWith({ accessToken: 'jwt', guestName: 'Moutarde' })),
    true
  );
});

test('sans jeton ni pseudo, le deep-link est renvoye a l\'accueil', () => {
  assert.equal(hasGameIdentity(storageWith({})), false);
});

test('ni sessionStorage ni resumeToken n\'entrent en compte : la garde ne regarde que l\'identite', () => {
  assert.equal(
    hasGameIdentity(storageWith({ resumeToken: 'xyz', autreChose: '1' })),
    false
  );
});

test('un pseudo vide n\'est pas une identite (Home ne stocke que >= 2 caracteres, on ne triche pas)', () => {
  assert.equal(hasGameIdentity(storageWith({ guestName: '' })), false);
});

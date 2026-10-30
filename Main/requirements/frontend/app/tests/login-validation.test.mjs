import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Meme chargement que reconnection.test.mjs : on teste les modules reels
// du frontend, pas des copies qui deriverait.
async function transpile(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf-8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return outputText;
}

function toDataUrl(code) {
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

// registerValidation n'a aucun import runtime : chargeable tel quel.
const registerCode = await transpile('../src/services/registerValidation.ts');

// loginValidation importe './registerValidation' en runtime : depuis une URL
// data:, un import relatif ne se resout pas, on reecrit donc le specifier
// vers l'URL data du vrai module (meme graphe de modules, pas une copie).
const loginCode = (await transpile('../src/services/loginValidation.ts'))
  .replaceAll(`'./registerValidation'`, `'${toDataUrl(registerCode)}'`);

const { validateField, validateAll } = await import(toDataUrl(loginCode));

const empty = { email: '', password: '' };

const valid = { email: 'raph@example.com', password: 'motdepasse' };

test('un formulaire vide bloque les deux champs', () => {
  const errors = validateAll(empty);
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'password']);
  assert.equal(errors.email, 'Email is required');
  assert.equal(errors.password, 'Password is required');
});

test("l'email reprend la meme regle que register (partagee avec le backend)", () => {
  assert.equal(validateField('email', { ...valid, email: 'bonjour' }), 'Enter a valid email address');
  assert.equal(validateField('email', { ...valid, email: 'a.@5.zz' }), 'Enter a valid email address');
  assert.equal(validateField('email', { ...valid, email: 'a@b.5' }), 'Enter a valid email address');
  // Le backend trim l'email : les espaces autour ne comptent pas.
  assert.equal(validateField('email', { ...valid, email: '  raph@example.com  ' }), '');
  assert.equal(validateField('email', { ...valid, email: 'Raph@Example.COM' }), '');
});

test('le mot de passe fait au moins 8 caracteres, comme le DTO de login', () => {
  assert.equal(
    validateField('password', { ...valid, password: '1234567' }),
    'Password must be at least 8 characters',
  );
  assert.equal(validateField('password', { ...valid, password: '12345678' }), '');
  // Pas de trim sur le mot de passe : les espaces comptent, comme au backend.
  assert.equal(validateField('password', { ...valid, password: ' 1234567 ' }), '');
});

test('un formulaire valide ne produit aucune erreur', () => {
  assert.deepEqual(validateAll(valid), {});
});

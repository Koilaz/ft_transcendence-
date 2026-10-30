import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Meme chargement que reconnection.test.mjs : on teste le module reel
// du frontend, pas une copie qui deriverait.
async function loadTypeScript(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf-8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const { validateField, validateAll } =
  await loadTypeScript('../src/services/registerValidation.ts');

const empty = { username: '', email: '', password: '', confirmPassword: '' };

const valid = {
  username: 'Raph_99',
  email: 'raph@example.com',
  password: 'motdepasse',
  confirmPassword: 'motdepasse',
};

test('un formulaire vide bloque les quatre champs', () => {
  const errors = validateAll(empty);
  assert.deepEqual(
    Object.keys(errors).sort(),
    ['confirmPassword', 'email', 'password', 'username'],
  );
  assert.equal(errors.username, 'Username is required');
  assert.equal(errors.email, 'Email is required');
  assert.equal(errors.password, 'Password is required');
  assert.equal(errors.confirmPassword, 'Confirm your password');
});

test('le username suit le DTO du backend : 3 a 20 caracteres, lettres chiffres underscore', () => {
  assert.equal(
    validateField('username', { ...valid, username: 'ab' }),
    'Username must be 3 to 20 characters',
  );
  assert.equal(
    validateField('username', { ...valid, username: 'x'.repeat(21) }),
    'Username must be 3 to 20 characters',
  );
  assert.equal(
    validateField('username', { ...valid, username: 'raph!' }),
    'Only letters, numbers and underscores',
  );
  assert.equal(validateField('username', { ...valid, username: 'Raph_99' }), '');
  // Le backend trim le username : les espaces autour ne comptent pas.
  assert.equal(validateField('username', { ...valid, username: '  Raph_99  ' }), '');
});

test("l'email doit en etre un", () => {
  assert.equal(
    validateField('email', { ...valid, email: 'bonjour' }),
    'Enter a valid email address',
  );
  assert.equal(validateField('email', { ...valid, email: 'raph@example.com' }), '');
});

// Cas limites verifies contre l'API live (@IsEmail / validator.js) : le front
// doit refuser ce que le serveur refuse, sinon l'erreur revient en alerte
// globale apres un champ pourtant valide cote client.
test("l'email colle au validateur du backend (TLD alpha d'au moins 2 lettres)", () => {
  for (const email of ['a@b.5', 'a@b.c', 'a@b.c5', 'a@5.5', 'a@b..com', 'a@-b.com', 'a@b.c_d', 'a@b-.zz', 'a@example.com.']) {
    assert.equal(
      validateField('email', { ...valid, email }),
      'Enter a valid email address',
      email,
    );
  }
  for (const email of ['a@b.co', 'a@b.museum', 'user+tag@example.com', 'Raph@Example.COM', 'a@5.zz', 'a@5.example.com', 'élève@example.com']) {
    assert.equal(validateField('email', { ...valid, email }), '', email);
  }
});

// Partie locale en dot-atom : a.@5.zz n'est PAS valide (le point final est
// refuse par le serveur), mais un label de domaine peut commencer par un
// chiffre (a@5.zz est accepte).
test("la partie locale de l'email est un dot-atom", () => {
  for (const email of ['a.@5.zz', 'a.@example.com', '.a@example.com', 'a..b@example.com']) {
    assert.equal(
      validateField('email', { ...valid, email }),
      'Enter a valid email address',
      email,
    );
  }
  for (const email of ['a.b@example.com', "o'hara@example.com"]) {
    assert.equal(validateField('email', { ...valid, email }), '', email);
  }
});

test('le mot de passe fait au moins 8 caracteres', () => {
  assert.equal(
    validateField('password', { ...valid, password: '1234567' }),
    'Password must be at least 8 characters',
  );
  assert.equal(validateField('password', { ...valid, password: '12345678' }), '');
  // Pas de trim sur le mot de passe : les espaces comptent, comme au backend.
  assert.equal(validateField('password', { ...valid, password: ' 1234567 ' }), '');
});

test('la confirmation doit recopier le mot de passe', () => {
  assert.equal(
    validateField('confirmPassword', { ...valid, confirmPassword: 'autrechose' }),
    'Passwords do not match',
  );
  assert.equal(validateField('confirmPassword', { ...valid, confirmPassword: 'motdepasse' }), '');
});

test('un formulaire valide ne produit aucune erreur', () => {
  assert.deepEqual(validateAll(valid), {});
});

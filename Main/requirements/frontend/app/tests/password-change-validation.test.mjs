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

const {
  STEP_CHANGE_FIELDS,
  STEP_VERIFY_FIELDS,
  validateField,
  validateAll,
} = await loadTypeScript('../src/services/passwordChangeValidation.ts');

const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };

const valid = {
  currentPassword: 'ancien-motdepasse',
  newPassword: 'nouveau-motdepasse',
  confirmPassword: 'nouveau-motdepasse',
};

test("l'etape 1 ne valide que le mot de passe actuel", () => {
  const errors = validateAll(empty, STEP_VERIFY_FIELDS);
  assert.deepEqual(Object.keys(errors), ['currentPassword']);
  assert.equal(errors.currentPassword, 'Current password is required');
});

test("l'etape 2 ne valide que le nouveau mot de passe et sa confirmation", () => {
  const errors = validateAll(empty, STEP_CHANGE_FIELDS);
  assert.deepEqual(Object.keys(errors).sort(), ['confirmPassword', 'newPassword']);
  assert.equal(errors.newPassword, 'New password is required');
  assert.equal(errors.confirmPassword, 'Confirm your password');
});

test('le mot de passe actuel suit VerifyPasswordDto : 8 a 100 caracteres', () => {
  assert.equal(
    validateField('currentPassword', { ...valid, currentPassword: '1234567' }),
    'Password must be at least 8 characters',
  );
  assert.equal(
    validateField('currentPassword', { ...valid, currentPassword: 'x'.repeat(101) }),
    'Password must be at most 100 characters',
  );
  // Pas de limite d'octets sur le mot de passe actuel : un mot de passe long
  // mais valide (pose a l'inscription, max 100) doit etre accepte.
  assert.equal(validateField('currentPassword', { ...valid, currentPassword: 'é'.repeat(80) }), '');
  assert.equal(validateField('currentPassword', { ...valid, currentPassword: 'x'.repeat(100) }), '');
});

test('le nouveau mot de passe suit ChangePasswordDto : 8 a 72 caracteres', () => {
  assert.equal(
    validateField('newPassword', { ...valid, newPassword: '1234567' }),
    'Password must be at least 8 characters',
  );
  assert.equal(
    validateField('newPassword', { ...valid, newPassword: 'x'.repeat(73) }),
    'Password must be at most 72 characters',
  );
  assert.equal(validateField('newPassword', { ...valid, newPassword: 'x'.repeat(72) }), '');
});

test('le nouveau mot de passe est limite a 72 octets (bcrypt tronque au-dela)', () => {
  // 72 caracteres ASCII = 72 octets : accepte. 36 accents = 72 caracteres
  // mais 72 octets aussi (un accent = 2 octets en UTF-8) : accepte.
  assert.equal(validateField('newPassword', { ...valid, newPassword: 'é'.repeat(36) }), '');
  // 40 accents = 80 octets : le backend refuse (IsByteLength), le front aussi.
  assert.equal(
    validateField('newPassword', { ...valid, newPassword: 'é'.repeat(40) }),
    'Password must be at most 72 bytes (accented characters count double)',
  );
  // 72 accents = 72 caracteres mais 144 octets : refuse.
  assert.equal(
    validateField('newPassword', { ...valid, newPassword: 'é'.repeat(72) }),
    'Password must be at most 72 bytes (accented characters count double)',
  );
});

test('la confirmation doit recopier le nouveau mot de passe', () => {
  assert.equal(
    validateField('confirmPassword', { ...valid, confirmPassword: 'autrechose' }),
    'Passwords do not match',
  );
  assert.equal(validateField('confirmPassword', { ...valid, confirmPassword: 'nouveau-motdepasse' }), '');
});

test('un formulaire complet valide ne produit aucune erreur', () => {
  assert.deepEqual(validateAll(valid), {});
});

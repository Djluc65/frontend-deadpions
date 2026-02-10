import assert from 'assert';
import { validatePassword, validateEmail } from '../src/utils/validation.js';

console.log('🧪 Lancement du test unitaire Frontend : Validation');

let passed = 0;
let failed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✅ ${description}`);
        passed++;
    } catch (error) {
        console.error(`❌ ${description}`);
        console.error(`   Erreur: ${error.message}`);
        failed++;
    }
}

// Tests Password
test('Password vide doit échouer', () => {
    const result = validatePassword('');
    assert.strictEqual(result.isValid, false);
});

test('Password court doit échouer', () => {
    const result = validatePassword('Short1!');
    assert.strictEqual(result.isValid, false);
});

test('Password valide doit réussir', () => {
    const result = validatePassword('ValidPassword123!');
    assert.strictEqual(result.isValid, true);
});

test('Password sans majuscule doit échouer', () => {
    const result = validatePassword('validpassword123!');
    assert.strictEqual(result.isValid, false);
});

// Tests Email
test('Email vide doit échouer', () => {
    const result = validateEmail('');
    assert.strictEqual(result.isValid, false);
});

test('Email invalide doit échouer', () => {
    const result = validateEmail('invalid-email');
    assert.strictEqual(result.isValid, false);
});

test('Email valide doit réussir', () => {
    const result = validateEmail('test@example.com');
    assert.strictEqual(result.isValid, true);
});

console.log(`\n📊 Résultat : ${passed} succès, ${failed} échecs`);

if (failed > 0) process.exit(1);

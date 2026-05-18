import { validatePassword, validateEmail } from '../src/utils/validation';

// ─── validatePassword ─────────────────────────────────────────────────────────

describe('validatePassword — cas invalides', () => {
  it('retourne invalide si le mot de passe est null', () => {
    const result = validatePassword(null);
    expect(result.isValid).toBe(false);
    expect(result.messageKey).toBeTruthy();
  });

  it('retourne invalide si le mot de passe est une chaîne vide', () => {
    const result = validatePassword('');
    expect(result.isValid).toBe(false);
    expect(result.messageKey).toMatch(/required|requis/i);
  });

  it('retourne invalide si moins de 12 caractères (8 caractères)', () => {
    const result = validatePassword('Court1!A');
    expect(result.isValid).toBe(false);
    expect(result.messageKey).toContain('min_length');
  });

  it('retourne invalide si exactement 11 caractères', () => {
    const result = validatePassword('Valide123!ok'); // 12 chars = valide, testons 11
    const short = validatePassword('Valide123!o'); // 11 chars
    expect(short.isValid).toBe(false);
  });

  it('retourne invalide sans majuscule', () => {
    const result = validatePassword('sansmajuscule1!'); // 15 chars, pas de majuscule
    expect(result.isValid).toBe(false);
  });

  it('retourne invalide sans minuscule', () => {
    const result = validatePassword('SANSMINUS1234!'); // pas de minuscule
    expect(result.isValid).toBe(false);
  });

  it('retourne invalide sans chiffre', () => {
    const result = validatePassword('SansChiffreIci!'); // pas de chiffre
    expect(result.isValid).toBe(false);
  });

  it('retourne invalide sans caractère spécial', () => {
    const result = validatePassword('SansSpecial1234'); // pas de spécial
    expect(result.isValid).toBe(false);
  });
});

describe('validatePassword — cas valides', () => {
  it('valide un mot de passe respectant tous les critères', () => {
    const result = validatePassword('Valide1234!ok');
    expect(result.isValid).toBe(true);
    expect(result.messageKey).toBe('');
  });

  it('accepte chacun des caractères spéciaux autorisés (@$!%*?&#)', () => {
    const specials = ['@', '$', '!', '%', '*', '?', '&', '#'];
    for (const char of specials) {
      const result = validatePassword(`MotDePasse1${char}`);
      expect(result.isValid).toBe(true);
    }
  });

  it('valide avec exactement 12 caractères', () => {
    const result = validatePassword('Abcde12345!f'); // exactement 12
    expect(result.isValid).toBe(true);
  });

  it('valide un mot de passe long', () => {
    const result = validatePassword('UnMotDePasseTresLong123&Securise');
    expect(result.isValid).toBe(true);
  });
});

// ─── validateEmail ────────────────────────────────────────────────────────────

describe('validateEmail — cas invalides', () => {
  it('retourne invalide si l\'email est null', () => {
    const result = validateEmail(null);
    expect(result.isValid).toBe(false);
    expect(result.messageKey).toBeTruthy();
  });

  it('retourne invalide si l\'email est vide', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
  });

  it('retourne invalide sans arobase (@)', () => {
    const result = validateEmail('pasdarobinat.com');
    expect(result.isValid).toBe(false);
  });

  it('retourne invalide sans partie locale (avant @)', () => {
    const result = validateEmail('@exemple.com');
    expect(result.isValid).toBe(false);
  });

  it('retourne invalide sans domaine après @', () => {
    const result = validateEmail('user@');
    expect(result.isValid).toBe(false);
  });

  it('retourne invalide sans extension de domaine', () => {
    const result = validateEmail('user@domain');
    expect(result.isValid).toBe(false);
  });

  it('retourne invalide avec des espaces', () => {
    const result = validateEmail('user @exemple.com');
    expect(result.isValid).toBe(false);
  });
});

describe('validateEmail — cas valides', () => {
  it('valide un email standard', () => {
    const result = validateEmail('alice@exemple.com');
    expect(result.isValid).toBe(true);
    expect(result.messageKey).toBe('');
  });

  it('valide un email avec sous-domaine', () => {
    const result = validateEmail('user@mail.exemple.org');
    expect(result.isValid).toBe(true);
  });

  it('valide un email avec des chiffres', () => {
    const result = validateEmail('user123@test42.net');
    expect(result.isValid).toBe(true);
  });

  it('valide un email avec des points dans la partie locale', () => {
    const result = validateEmail('prenom.nom@exemple.fr');
    expect(result.isValid).toBe(true);
  });
});

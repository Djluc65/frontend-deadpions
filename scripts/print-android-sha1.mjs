#!/usr/bin/env node
/**
 * Affiche les empreintes SHA-1/SHA-256 à enregistrer dans Google Cloud Console
 * pour le client OAuth Android DeadPions.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const keystore = join(root, 'android', 'app', 'debug.keystore');

const PACKAGE = 'com.deadpions.app';
const ANDROID_CLIENT_ID = '982071763340-juep8lchntjqcbfi1jg7cq6i383a6esq.apps.googleusercontent.com';
const PRODUCTION_SHA1 = 'E9:A5:7D:E6:7B:3B:33:41:4C:BF:F6:E8:05:2B:18:F1:02:F2:11:4F';

function findKeytool() {
  try {
    const javaHome = execSync('/usr/libexec/java_home', { encoding: 'utf8' }).trim();
    return join(javaHome, 'bin', 'keytool');
  } catch {
    return 'keytool';
  }
}

function printKeystoreFingerprints(path, label) {
  if (!existsSync(path)) {
    console.log(`\n[${label}] Keystore introuvable : ${path}`);
    return null;
  }
  try {
    const keytool = findKeytool();
    const out = execSync(
      `"${keytool}" -list -v -keystore "${path}" -alias androiddebugkey -storepass android -keypass android`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const sha1 = out.match(/SHA\s*1:\s*([0-9A-F:]+)/i)?.[1] ?? out.match(/SHA1:\s*([0-9A-F:]+)/i)?.[1];
    const sha256 = out.match(/SHA\s*256:\s*([0-9A-F:]+)/i)?.[1] ?? out.match(/SHA256:\s*([0-9A-F:]+)/i)?.[1];
    console.log(`\n[${label}]`);
    console.log(`  Fichier : ${path}`);
    if (sha1) console.log(`  SHA-1   : ${sha1}`);
    if (sha256) console.log(`  SHA-256 : ${sha256}`);
    return sha1 ?? null;
  } catch (err) {
    console.error(`\n[${label}] Erreur keytool :`, err.message);
    return null;
  }
}

console.log('=== DeadPions — Empreintes Android pour Google OAuth ===');
console.log(`Package       : ${PACKAGE}`);
console.log(`Client ID     : ${ANDROID_CLIENT_ID}`);
console.log(`SHA-1 prod    : ${PRODUCTION_SHA1} (EAS / Play Store — déjà dans Google Cloud)`);

const projectSha1 = printKeystoreFingerprints(keystore, 'Keystore projet (android/app/debug.keystore)');

const homeKeystore = join(process.env.HOME || process.env.USERPROFILE || '', '.android', 'debug.keystore');
printKeystoreFingerprints(homeKeystore, 'Keystore global (~/.android/debug.keystore)');

console.log('\n--- Google Cloud Console ---');
console.log('1. https://console.cloud.google.com/apis/credentials');
console.log('2. Ouvrir le client OAuth « Android » DeadPions');
console.log(`3. Vérifier le package : ${PACKAGE}`);
console.log('4. Ajouter TOUTES les empreintes SHA-1 ci-dessus (ne pas supprimer celle de production)');
console.log('5. Enregistrer, attendre 5–10 min, puis relancer l\'app');

if (projectSha1 && projectSha1 !== PRODUCTION_SHA1) {
  console.log(`\n→ Empreinte locale à ajouter : ${projectSha1}`);
}

console.log('\nAstuce : si vous testez un APK EAS/Play Store, ajoutez aussi le SHA-1');
console.log('         affiché par Play Console > Setup > App integrity > App signing');

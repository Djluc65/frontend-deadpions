const fs = require('fs');
const path = require('path');

function readFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function extractSingle(regex, text, label) {
  const match = text.match(regex);
  if (!match) {
    throw new Error(`Match introuvable (${label})`);
  }
  return match[1];
}

describe('Release versioning', () => {
  test('La version 1.0.2 est cohérente (Expo, iOS, Android)', () => {
    const app = require('../app.json');
    const pkg = require('../package.json');

    expect(app.expo.version).toBe(pkg.version);

    const androidGradle = readFile('android/app/build.gradle');
    const androidVersionName = extractSingle(/versionName\s+"([^"]+)"/, androidGradle, 'android versionName');
    expect(androidVersionName).toBe(app.expo.version);

    const pbxproj = readFile('ios/DeadPions.xcodeproj/project.pbxproj');
    const iosMarketingVersions = Array.from(pbxproj.matchAll(/MARKETING_VERSION\s*=\s*([^;]+);/g)).map((m) =>
      m[1].trim()
    );
    expect(iosMarketingVersions.length).toBeGreaterThan(0);
    expect(new Set(iosMarketingVersions)).toEqual(new Set([app.expo.version]));

    const iosBuildNumbers = Array.from(pbxproj.matchAll(/CURRENT_PROJECT_VERSION\s*=\s*(\d+);/g)).map((m) => m[1]);
    expect(iosBuildNumbers.length).toBeGreaterThan(0);
    expect(new Set(iosBuildNumbers)).toEqual(new Set([String(app.expo.ios.buildNumber)]));
  });
});


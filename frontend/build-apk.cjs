const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendDir = path.resolve(__dirname);
const androidDir = path.join(frontendDir, 'android');
const rootDir = path.resolve(frontendDir, '..');

// Find valid Java JDK
const potentialJavaHomes = [
  'C:\\Program Files\\Java\\jdk-17',
  'C:\\Program Files\\Android\\Android Studio\\jbr',
  process.env.JAVA_HOME
].filter(Boolean);

let validJavaHome = potentialJavaHomes.find(p => fs.existsSync(p));

const env = {
  ...process.env,
  JAVA_HOME: validJavaHome || process.env.JAVA_HOME,
  ANDROID_HOME: process.env.ANDROID_HOME || 'C:\\Users\\DELL\\AppData\\Local\\Android\\Sdk',
  PATH: validJavaHome ? `${path.join(validJavaHome, 'bin')};${process.env.PATH}` : process.env.PATH
};

console.log('🚀 Step 1: Building web assets with Vite...');
execSync('npm run build', { cwd: frontendDir, stdio: 'inherit', env });

console.log('🔄 Step 2: Syncing Capacitor Android...');
execSync('npx cap sync android', { cwd: frontendDir, stdio: 'inherit', env });

console.log('📱 Step 3: Compiling Android Release APK with Gradle...');
const gradlewCmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
execSync(`${gradlewCmd} assembleRelease assembleDebug`, { cwd: androidDir, stdio: 'inherit', env });

// Source and destination paths
const releaseOutputDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release');
const releaseApk = path.join(releaseOutputDir, 'Cashly.apk');
const appReleaseApk = path.join(releaseOutputDir, 'app-release.apk');

if (fs.existsSync(releaseApk)) {
  fs.copyFileSync(releaseApk, appReleaseApk);
  fs.copyFileSync(releaseApk, path.join(rootDir, 'Cashly.apk'));
  fs.copyFileSync(releaseApk, path.join(rootDir, 'app-release.apk'));
  console.log('\n✅ BUILD SUCCESSFUL!');
  console.log(`📦 Release APK: ${appReleaseApk}`);
  console.log(`📦 Cashly.apk: ${path.join(rootDir, 'Cashly.apk')}`);
} else {
  console.log('⚠️ Could not find output APK at ' + releaseApk);
}

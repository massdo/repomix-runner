import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const backupPath = path.resolve(__dirname, '..', 'package.json.bak');

// Check if a backup exists (indicating a previous failed run)
if (fs.existsSync(backupPath)) {
  console.warn('⚠️  Warning: Found a backup package.json. This indicates a previous run failed.');
  console.warn('Restoring from backup...');
  try {
    fs.copyFileSync(backupPath, packageJsonPath);
  } catch (err) {
    console.error('Failed to restore from backup:', err);
    process.exit(1);
  }
}

// Read the clean/restored package.json
const originalPackageJson = fs.readFileSync(packageJsonPath, 'utf-8');
const packageData = JSON.parse(originalPackageJson);

const restorePackageJson = () => {
  try {
    fs.writeFileSync(packageJsonPath, originalPackageJson);
    console.log('Restored original package.json');
  } catch (err) {
    console.error('Error restoring package.json:', err);
  }
};

// Handle signals to ensure cleanup
['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    console.log(`\nReceived ${signal}. Cleaning up...`);
    restorePackageJson();
    process.exit(1);
  });
});
// Create a backup file
try {
  fs.writeFileSync(backupPath, originalPackageJson);
} catch (err) {
  console.error('Failed to create backup file:', err);
  process.exit(1);
}

let exitCode = 0;

try {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
  const originalVersion = packageData.version;

  // Strip existing -alpha... suffix if present to prevent stacking (e.g. -alpha.1-alpha.2)
  const versionBase = originalVersion.split('-alpha.')[0];

  packageData.version = `${versionBase}-alpha.${timestamp}`;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2));

  console.log(`Packaging local version: ${packageData.version}`);

  // Run the existing package:vsix script
  execSync('npm run package:vsix', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });

  console.log('Packaging complete.');
} catch (error) {
  console.error('Error packaging local version:', error);
  exitCode = 1;
} finally {
  // Always restore original package.json and remove backup
  try {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, packageJsonPath);
      fs.unlinkSync(backupPath);
      console.log('Restored original package.json and removed backup.');
    }
  } catch (cleanupError) {
    console.error('Error during cleanup:', cleanupError);
    // If cleanup fails, we shouldn't mask the original error if there was one
    if (exitCode === 0) exitCode = 1;
  }
}

process.exit(exitCode);

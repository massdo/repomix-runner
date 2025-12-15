import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { platform } from 'os';
import { join } from 'path';

const isWindows = platform() === 'win32';
const targetDir = join('assets', 'bin');
const rustDir = join('rust');
const target = 'x86_64-pc-windows-gnu';

console.log('Building Rust clipboard tool...');

if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true });
}

try {
  // If we are on Windows, we can build directly.
  // If we are on Linux/Mac, we attempt to cross-compile if target is installed.
  // We assume the user has set up the environment if they are running this script.

  // Actually, we can check if we are on windows
  let buildCommand = 'cargo build --release';

  if (!isWindows) {
    console.log(`Not on Windows, attempting cross-compilation for ${target}...`);
    buildCommand += ` --target ${target}`;
  }

  execSync(buildCommand, { cwd: rustDir, stdio: 'inherit' });

  const releaseDir = isWindows
    ? join(rustDir, 'target', 'release')
    : join(rustDir, 'target', target, 'release');

  const binaryName = 'repomix-clipboard.exe';
  const sourcePath = join(releaseDir, binaryName);
  const destPath = join(targetDir, binaryName);

  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, destPath);
    console.log(`Successfully built and copied ${binaryName} to ${destPath}`);
  } else {
    console.error(`Error: Could not find built binary at ${sourcePath}`);
    process.exit(1);
  }

} catch (error) {
  console.error('Failed to build Rust clipboard tool:', error);
  process.exit(1);
}

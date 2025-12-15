import * as vscode from 'vscode';
import { execPromisify } from '../../shared/execPromisify.js';
import { copyFile, access } from 'fs/promises';
import { tempDirManager } from './tempDirManager.js';
import * as path from 'path';
import * as fs from 'fs';

type OperatingSystem = 'darwin' | 'win32' | 'linux';

async function checkXclipInstalled(dep: { execPromisify: typeof execPromisify }): Promise<boolean> {
  try {
    await dep.execPromisify('command -v xclip');
    return true;
  } catch {
    return false;
  }
}

function toUri(path: string): string {
  return `file://${path.replace(/ /g, '%20')}`;
}

const CLIPBOARD_COMMANDS = {
  darwin: (path: string) =>
    `osascript -e 'tell application "Finder" to set the clipboard to (POSIX file "${path}")'`,
  win32: (path: string) => {
    return `"${getWin32BinaryPath()}" "${path}"`;
  },
  linux: (path: string) => `echo "${toUri(path)}" | xclip -selection clipboard -t text/uri-list`,
} as const;

function getWin32BinaryPath(): string {
    const possiblePaths = [
        path.join(__dirname, '..', 'assets', 'bin', 'repomix-clipboard.exe'), // dist/../assets = assets
        path.join(__dirname, 'assets', 'bin', 'repomix-clipboard.exe'),       // dist/assets?
        path.join(__dirname, '..', '..', '..', 'assets', 'bin', 'repomix-clipboard.exe'), // src/core/files/../../../assets (dev)
        path.join(process.cwd(), 'assets', 'bin', 'repomix-clipboard.exe') // Fallback to CWD
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    return 'repomix-clipboard.exe';
}

export async function copyToClipboard(
  outputFileAbs: string,
  tmpFilePath: string,
  os: OperatingSystem = process.platform as OperatingSystem,
  dep: {
    copyFile: typeof copyFile;
    execPromisify: typeof execPromisify;
    access: typeof access;
    createTempDir: typeof tempDirManager.createTempDir;
  } = {
    copyFile,
    execPromisify,
    access,
    createTempDir: tempDirManager.createTempDir,
  }
) {
  if (os === 'linux') {
    const isXclipInstalled = await checkXclipInstalled(dep);
    if (!isXclipInstalled) {
      vscode.window.showErrorMessage(
        'xclip is not installed on this system, you need it to copy file to clipboard: sudo apt-get install xclip'
      );
      return;
    }
  }

  // Check if the temporary file exists before proceeding
  try {
    await dep.access(tmpFilePath);
  } catch {
    dep.createTempDir('repomix_runner');
  }

  // First copy the file to the tmp folder to keep the file if config.runner.keepOutputFile is false
  try {
    await dep.copyFile(outputFileAbs, tmpFilePath);
  } catch (copyError) {
    vscode.window.showErrorMessage(`Could not copy output file to temp folder: ${copyError}`);
    throw copyError;
  }

  if (!(os in CLIPBOARD_COMMANDS)) {
    throw new Error(`Unsupported operating system: ${os}`);
  }

  try {
    const command = CLIPBOARD_COMMANDS[os](tmpFilePath);
    await dep.execPromisify(command);
  } catch (err: any) {
    if (os === 'win32') {
         vscode.window.showErrorMessage(`Error setting file to clipboard using helper tool: ${err.message}. Ensure repomix-clipboard.exe is correctly installed.`);
    } else {
        vscode.window.showErrorMessage(`Error setting file to clipboard: ${err.message}`);
    }
    throw err;
  }
}

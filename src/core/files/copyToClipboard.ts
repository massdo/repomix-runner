import * as vscode from 'vscode';
import { execPromisify } from '../../shared/execPromisify';
import { copyFile } from 'fs/promises';

type OperatingSystem = 'darwin' | 'win32' | 'linux';

const CLIPBOARD_COMMANDS = {
  //TEST -> integration todo
  darwin: (path: string) =>
    `osascript -e 'tell application "Finder" to set the clipboard to (POSIX file "${path}")'`,
  win32: (path: string) => `clip < "${path}"`,
  linux: (path: string) => `xclip -selection clipboard -t text/uri-list "${path}"`,
} as const;

export async function copyToClipboard(
  outputFileAbs: string,
  tmpFilePath: string,
  os: OperatingSystem = process.platform as OperatingSystem,
  dep: { copyFile: typeof copyFile; execPromisify: typeof execPromisify } = {
    copyFile,
    execPromisify,
  }
) {
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
    vscode.window.showErrorMessage(`Error setting file to clipboard: ${err.message}`);
    throw err;
  }
}

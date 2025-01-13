import * as vscode from 'vscode';
import { copyFile, readFile } from 'fs/promises';
import { execPromisify } from '../../shared/execPromisify';

export async function copyToClipboard(outputFileAbs: string, tmpFilePath: string) {
  try {
    await copyFile(outputFileAbs, tmpFilePath);
  } catch (copyError) {
    vscode.window.showErrorMessage(`Could not copy output file to temp folder: ${copyError}`);
    throw copyError;
  }

  const copyMode = vscode.workspace.getConfiguration('repomix.runner').get('copyMode');

  if (copyMode === 'file') {
    const macOsScript = `osascript -e 'tell application "Finder" to set the clipboard to (POSIX file "${tmpFilePath}")'`;

    try {
      await execPromisify(macOsScript);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Error setting file to clipboard: ${err.message}`);
      throw err;
    }
  } else {
    const fileContent = await readFile(tmpFilePath, 'utf8');
    await vscode.env.clipboard.writeText(fileContent);
  }
}

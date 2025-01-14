import * as vscode from 'vscode';

/**
 * Returns the absolute path of the root workspace folder.
 * @returns {string} The absolute path of the root workspace folder.
 * @throws Will throw an error if no root workspace folder is found.
 */
export function getCwd(): string {
  const folders = vscode.workspace.workspaceFolders;

  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage('No root workspace folder found!');
    throw new Error('No root folder');
  }

  return folders[0].uri.fsPath;
}

import * as vscode from 'vscode';

export function getCwd(): string {
  const folders = vscode.workspace.workspaceFolders;

  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage('No root workspace folder found!');
    throw new Error('No root folder');
  }

  return folders[0].uri.fsPath;
}

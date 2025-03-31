import { accessSync } from 'fs';
import * as vscode from 'vscode';
import { getCwd } from '../config/getCwd';

/**
 * Checks if a file exists and is accessible.
 * @param path - A relative path to the file from the workspace root.
 * @returns {boolean} - True if the file exists and is accessible, false otherwise.
 */
export function fileAccess(path: string): boolean {
  try {
    accessSync(absoluteUri(path).fsPath);
  } catch (error) {
    vscode.window.showErrorMessage(`The file "${path}" does not exist`);
    return false;
  }
  return true;
}

export function absoluteUri(relativePath: string): vscode.Uri {
  const cwd = getCwd();
  return vscode.Uri.joinPath(vscode.Uri.file(cwd), relativePath);
}

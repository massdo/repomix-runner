import { accessSync } from 'fs';
import * as vscode from 'vscode';
import { getCwd } from '../config/getCwd';
import path from 'path';

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

/**
 * Checks if a relative path to the Workspace root is a directory or a file.
 * @param relativePath The relative path to check (e.g., "src/folder" or "src/file.txt")
 * @returns Promise<boolean> Returns `true` if it is a directory, `false` if it is a file
 * @throws Error If no Workspace is open or if the path is invalid
 */
export async function isDirectory(relativePath: string): Promise<boolean> {
  if (!vscode.workspace.workspaceFolders) {
    throw new Error('Aucun Workspace ouvert');
  }

  const workspaceFolder = vscode.workspace.workspaceFolders[0];

  const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);

  try {
    const fileStat = await vscode.workspace.fs.stat(absolutePath);

    return fileStat.type === vscode.FileType.Directory;
  } catch (error) {
    console.error(`Erreur lors de la vérification du chemin ${relativePath}:`, error);
    throw error;
  }
}

/**
 * Converts a file path to use forward slashes for storage in bundles.
 * This ensures cross-platform compatibility regardless of the operating system.
 * @param filePath The path to normalize
 * @returns The normalized path with forward slashes
 */
export function normalizePathForStorage(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

/**
 * Converts a storage path with forward slashes to use OS-specific separators.
 * This is useful when interacting with the file system.
 * @param storagePath The path with forward slashes
 * @returns The path with OS-specific separators
 */
export function convertToOSPath(storagePath: string): string {
  return storagePath.split('/').join(path.sep);
}

import * as vscode from 'vscode';
import * as path from 'path';
import { logger } from '../shared/logger';

/**
 * Retrieve all files in the workspace using VS Code's native API.
 * Excludes common ignore patterns and node_modules.
 */
export async function getWorkspaceFiles(workspaceRoot: string): Promise<string[]> {
  try {
    // Define patterns to exclude
    const excludePattern = '**/{node_modules,git,dist,build,out,coverage,.next,.vscode,.idea}/**';

    // Use VS Code's findFiles API with a relative pattern
    const relativePattern = new vscode.RelativePattern(
      workspaceRoot,
      '**/*'
    );

    // Find all files matching the pattern
    const uris = await vscode.workspace.findFiles(relativePattern, excludePattern);

    // Convert URIs to relative paths
    const filePaths = uris
      .map(uri => vscode.workspace.asRelativePath(uri, false))
      .filter(filePath => filePath); // Filter out empty paths

    logger.both.info(`Found ${filePaths.length} files in workspace`);
    return filePaths;
  } catch (error) {
    logger.both.error('Failed to get workspace files:', error);
    return [];
  }
}

/**
 * Read the content of specific files using VS Code's native API.
 * Returns a Map of file paths to their content.
 */
export async function getFileContents(
  workspaceRoot: string,
  filePaths: string[]
): Promise<Map<string, string>> {
  const contentMap = new Map<string, string>();

  for (const filePath of filePaths) {
    try {
      // Convert relative path to absolute URI
      const absolutePath = path.resolve(workspaceRoot, filePath);
      const uri = vscode.Uri.file(absolutePath);

      // Check if file exists and is not a directory
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type === vscode.FileType.Directory) {
        continue; // Skip directories
      }

      // Read file content
      const content = Buffer.from(
        await vscode.workspace.fs.readFile(uri)
      ).toString('utf-8');

      contentMap.set(filePath, content);
    } catch (error) {
      logger.both.warn(`Failed to read file ${filePath}:`, error);
      // Continue with other files even if one fails
    }
  }

  return contentMap;
}

/**
 * Check if a file exists using VS Code's native API.
 */
export async function fileExists(workspaceRoot: string, filePath: string): Promise<boolean> {
  try {
    const absolutePath = path.resolve(workspaceRoot, filePath);
    const uri = vscode.Uri.file(absolutePath);
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file statistics (size, type) using VS Code's native API.
 */
export async function getFileStats(
  workspaceRoot: string,
  filePath: string
): Promise<{ type: vscode.FileType; size?: number } | null> {
  try {
    const absolutePath = path.resolve(workspaceRoot, filePath);
    const uri = vscode.Uri.file(absolutePath);
    const stat = await vscode.workspace.fs.stat(uri);
    return { type: stat.type, size: stat.size };
  } catch {
    return null;
  }
}
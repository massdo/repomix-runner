import * as vscode from 'vscode';
import { showTempNotification } from '../shared/showTempNotification';
import { logger } from '../shared/logger';
import { BundleManager } from '../core/bundles/bundleManager';
import path from 'path';
import { Bundle } from '../core/bundles/types';
import fs from 'fs';
import { normalizePathForStorage, convertToOSPath } from '../shared/files';

/**
 * Adds files to the active bundle.
 * @param uris The URIs of the files to add
 * @param options Options containing the bundle manager and working directory
 */
export async function addFilesToActiveBundle(
  uris: vscode.Uri[],
  options: {
    bundleManager: BundleManager;
    cwd: string;
  }
) {
  if (!uris || uris.length === 0) {
    logger.both.info('No files selected');
    showTempNotification('No files selected to add! :)');
    return;
  }

  const activeBundleId = options.bundleManager.getActiveBundleId();

  if (!activeBundleId) {
    logger.both.info('No active bundle');
    showTempNotification('No active bundle to add files! :)');
    return;
  }

  const bundle = await options.bundleManager.getBundle(activeBundleId);

  if (!bundle) {
    logger.both.info('No bundle found');
    showTempNotification('No bundle found to add files! :)');
    return;
  }

  // Get relative paths and convert backslashes to forward slashes for storage
  const selectedFiles = uris.map(uri => {
    const relativePath = path.relative(options.cwd, uri.fsPath);
    // Always store paths with forward slashes in the bundle for cross-platform compatibility
    return normalizePathForStorage(relativePath);
  });

  const combinedFiles = [...bundle.files, ...selectedFiles];

  const normalizedFiles = normalizeFiles(combinedFiles, options.cwd);

  const updatedBundle: Bundle = {
    ...bundle,
    files: normalizedFiles,
  };

  await options.bundleManager.saveBundle(activeBundleId, updatedBundle);
}

/**
 * Removes files from the active bundle.
 * @param uris The URIs of the files to remove
 * @param options Options containing the bundle manager and working directory
 */
export async function removeFilesFromActiveBundle(
  uris: vscode.Uri[],
  options: {
    bundleManager: BundleManager;
    cwd: string;
  }
) {
  if (!uris || uris.length === 0) {
    logger.both.info('No files selected');
    showTempNotification('No files selected to remove! :)');
    return;
  }

  const activeBundleId = options.bundleManager.getActiveBundleId();

  if (!activeBundleId) {
    logger.both.info('No active bundle');
    showTempNotification('No active bundle to remove files! :)');
    return;
  }

  const bundle = await options.bundleManager.getBundle(activeBundleId);

  if (!bundle) {
    logger.both.info('No bundle found');
    showTempNotification('No bundle found to remove files! :)');
    return;
  }

  // Get relative paths and convert backslashes to forward slashes for storage
  const selectedFiles = uris.map(uri => {
    const relativePath = path.relative(options.cwd, uri.fsPath);
    // Always store paths with forward slashes in the bundle for cross-platform compatibility
    return normalizePathForStorage(relativePath);
  });

  const updatedFiles = removeFilesFromBundle(bundle.files, selectedFiles, options.cwd);

  const updatedBundle: Bundle = {
    ...bundle,
    files: updatedFiles,
  };

  await options.bundleManager.saveBundle(activeBundleId, updatedBundle);
}

function normalizeFiles(files: string[], cwd: string): string[] {
  // Remove exact duplicates with a Set
  const allFiles = [...new Set(files)];

  // Identify directories in the list
  const directories = allFiles.filter(file => {
    // Convert to OS path for directory check, then back to forward slashes for storage
    const osPath = convertToOSPath(file);
    return isDirectory(path.join(cwd, osPath));
  });

  // Filter to exclude subpaths of directories already present
  // Always ensure paths use forward slashes for cross-platform compatibility
  return allFiles
    .filter(
      file => !directories.some(dir => isSubPath(convertToOSPath(file), convertToOSPath(dir)))
    )
    .map(normalizePathForStorage);
}

function removeFilesFromBundle(
  bundleFiles: string[],
  filesToRemove: string[],
  cwd: string
): string[] {
  let resultFiles: string[] = [];

  // Prepare directory paths using OS-specific separator for file system operations
  const directoriesToRemove = filesToRemove.filter(file => {
    const osPath = convertToOSPath(file);
    return isDirectory(path.join(cwd, osPath));
  });

  const bundleDirectoriesToExpand = new Set<string>();
  const bundleDirectories = bundleFiles.filter(file => {
    const osPath = convertToOSPath(file);
    return isDirectory(path.join(cwd, osPath));
  });

  // Identify bundle directories that contain files to remove
  for (const dir of bundleDirectories) {
    for (const fileToRemove of filesToRemove) {
      if (isSubPath(convertToOSPath(fileToRemove), convertToOSPath(dir))) {
        bundleDirectoriesToExpand.add(dir);
        break;
      }
    }
  }

  // Keep files that are neither removed nor in directories to remove
  for (const bundleFile of bundleFiles) {
    // Normalize both paths for comparison
    const normalizedBundleFile = bundleFile.normalize ? bundleFile.normalize() : bundleFile;

    // Check if file is in the remove list
    if (
      filesToRemove.some(file => {
        const normalizedFile = file.normalize ? file.normalize() : file;
        return normalizedBundleFile === normalizedFile;
      })
    ) {
      continue;
    }

    // Check if file is in directories to remove
    if (
      directoriesToRemove.some(dir => isSubPath(convertToOSPath(bundleFile), convertToOSPath(dir)))
    ) {
      continue;
    }

    if (bundleDirectoriesToExpand.has(bundleFile)) {
      continue;
    }

    resultFiles.push(bundleFile);
  }

  // Process bundle directories containing files to remove
  for (const dir of bundleDirectoriesToExpand) {
    const osDirPath = convertToOSPath(dir);
    const expandedEntries = expandDirectoryWithSubdirs(path.join(cwd, osDirPath), osDirPath, cwd);
    const allFiles = new Set<string>();
    const allDirs = new Set<string>();

    // Separate files and directories
    for (const entry of expandedEntries) {
      const osEntryPath = convertToOSPath(entry);
      if (isDirectory(path.join(cwd, osEntryPath))) {
        allDirs.add(entry);
      } else {
        allFiles.add(entry);
      }
    }

    // Remove directories to remove and their subdirectories
    for (const dirToRemove of directoriesToRemove) {
      allDirs.delete(dirToRemove);
      for (const dir of [...allDirs]) {
        if (isSubPath(convertToOSPath(dir), convertToOSPath(dirToRemove))) {
          allDirs.delete(dir);
        }
      }
    }

    // Remove specified files and those in directories to remove
    for (const fileToRemove of filesToRemove) {
      allFiles.delete(fileToRemove);
    }

    for (const file of [...allFiles]) {
      if (directoriesToRemove.some(dir => isSubPath(convertToOSPath(file), convertToOSPath(dir)))) {
        allFiles.delete(file);
      }
    }

    // Identify compressible directories
    const compressibleDirs = new Set<string>();
    for (const directory of allDirs) {
      if (
        filesToRemove.some(file => file === directory) ||
        directoriesToRemove.some(dir => isSubPath(convertToOSPath(directory), convertToOSPath(dir)))
      ) {
        continue;
      }

      const containsFileToRemove = filesToRemove.some(file =>
        isSubPath(convertToOSPath(file), convertToOSPath(directory))
      );

      if (!containsFileToRemove) {
        const dirOsPath = convertToOSPath(directory);
        const dirFiles = Array.from(allFiles).filter(file =>
          isSubPath(convertToOSPath(file), convertToOSPath(directory))
        );

        const allDirFilesPresent =
          dirFiles.length === getAllFilesInDir(path.join(cwd, dirOsPath)).length;

        if (allDirFilesPresent) {
          compressibleDirs.add(directory);
        }
      }
    }

    // Add compressible directories and remove their files
    for (const compressibleDir of compressibleDirs) {
      resultFiles.push(compressibleDir);
      for (const file of allFiles) {
        if (isSubPath(convertToOSPath(file), convertToOSPath(compressibleDir))) {
          allFiles.delete(file);
        }
      }
    }

    // Add remaining files
    resultFiles = [...resultFiles, ...Array.from(allFiles)];
  }

  // Normalize final result
  return normalizeFiles(resultFiles, cwd);
}

// Recursively expand a directory to get files and subdirectories
function expandDirectoryWithSubdirs(fullPath: string, relativePath: string, cwd: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(fullPath);
    for (const entry of entries) {
      const entryFullPath = path.join(fullPath, entry);
      // Join with OS-specific separator for filesystem operations
      const entryRelativePath = path.join(relativePath, entry);
      // Convert to forward slashes for storage
      const storagePath = normalizePathForStorage(entryRelativePath);

      if (isDirectory(entryFullPath)) {
        results.push(storagePath);
        const subEntries = expandDirectoryWithSubdirs(entryFullPath, entryRelativePath, cwd);
        results.push(...subEntries);
      } else {
        results.push(storagePath);
      }
    }
  } catch (error) {
    console.error(`Error while exploring directory: ${fullPath}`, error);
  }
  return results;
}

// Get all files (not directories) in a directory
function getAllFilesInDir(fullPath: string): string[] {
  const files: string[] = [];
  const normalizedFullPath = path.normalize(fullPath);

  try {
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const entryPath = path.join(dir, entry);
        if (isDirectory(entryPath)) {
          walk(entryPath);
        } else {
          // Convertir le chemin absolu en chemin relatif avec des séparateurs de chemin "/"
          const relativePath = path.relative(normalizedFullPath, entryPath);
          files.push(normalizePathForStorage(relativePath));
        }
      }
    };
    walk(normalizedFullPath);
  } catch (error) {
    console.error(`Error while exploring directory: ${fullPath}`, error);
  }

  return files;
}

function isSubPath(child: string, parent: string): boolean {
  // Normalize paths to use OS-specific separators for path operations
  const normalizedChild = path.normalize(child);
  const normalizedParent = path.normalize(parent);

  const relative = path.relative(normalizedParent, normalizedChild);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function isDirectory(fullPath: string): boolean {
  try {
    const normalizedPath = path.normalize(fullPath);
    return fs.statSync(normalizedPath).isDirectory();
  } catch (error) {
    console.error(`Error while checking path: ${fullPath}`, error);
    return false;
  }
}

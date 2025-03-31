import * as vscode from 'vscode';
import { showTempNotification } from '../shared/showTempNotification';
import { logger } from '../shared/logger';
import { BundleManager } from '../core/bundles/bundleManager';
import path from 'path';
import { Bundle } from '../core/bundles/types';
import fs from 'fs';

export async function mutateActiveBundle(
  uris: vscode.Uri[],
  options: {
    bundleManager: BundleManager;
    cwd: string;
    action: 'add' | 'remove';
  }
) {
  // TEST passer les options dans options  et test modulaire
  if (!uris || uris.length === 0) {
    logger.both.info('No files selected');
    showTempNotification('No files selected to run this command! :)');
    return;
  }

  const activeBundleId = options.bundleManager.getActiveBundleId();

  if (!activeBundleId) {
    logger.both.info('No active bundle');
    showTempNotification('No active bundle to run this command! :)');
    return;
  }

  const bundle = await options.bundleManager.getBundle(activeBundleId);

  if (!bundle) {
    logger.both.info('No bundle found');
    showTempNotification('No bundle found to run this command! :)');
    return;
  }

  const selectedFiles = uris.map(uri => path.relative(options.cwd, uri.fsPath));

  let updatedBundle: Bundle;

  if (options.action === 'add') {
    // Combiner les fichiers existants avec les nouveaux fichiers
    const combinedFiles = [...bundle.files, ...selectedFiles];

    // Normaliser la liste combinée
    const normalizedFiles = normalizeFiles(combinedFiles, options.cwd);

    updatedBundle = {
      ...bundle,
      files: normalizedFiles,
    };

    console.log('updatedBundle', updatedBundle);
  } else if (options.action === 'remove') {
    // TODO comprendre
    // TEST
    updatedBundle = {
      ...bundle,
      files: removeFilesFromBundle(bundle.files, selectedFiles, options.cwd),
    };
  } else {
    throw new Error('Invalid action');
  }

  await options.bundleManager.saveBundle(activeBundleId, updatedBundle);
}

// Fonction pour normaliser la liste des fichiers
function normalizeFiles(files: string[], cwd: string): string[] {
  // Supprimer les doublons exacts avec un Set
  const allFiles = [...new Set(files)];

  // Identifier les répertoires dans la liste
  const directories = allFiles.filter(file => isDirectory(path.join(cwd, file)));

  // Filtrer pour exclure les sous-chemins des répertoires déjà présents
  return allFiles.filter(file => !directories.some(dir => isSubPath(file, dir)));
}

function removeFilesFromBundle(
  bundleFiles: string[],
  filesToRemove: string[],
  cwd: string
): string[] {
  // TODO comprendre
  // TEST
  // Liste des fichiers résultants après suppression
  let resultFiles: string[] = [];

  // Identifie les répertoires à supprimer pour vérifier les fichiers enfants
  const directoriesToRemove = filesToRemove.filter(file => isDirectory(path.join(cwd, file)));

  // Identifie si des fichiers à supprimer sont des sous-chemins de répertoires du bundle
  const bundleDirectoriesToExpand = new Set<string>();

  // Vérifier si des fichiers à supprimer sont des sous-chemins des répertoires du bundle
  const bundleDirectories = bundleFiles.filter(file => isDirectory(path.join(cwd, file)));

  for (const dir of bundleDirectories) {
    for (const fileToRemove of filesToRemove) {
      if (isSubPath(fileToRemove, dir)) {
        bundleDirectoriesToExpand.add(dir);
        break;
      }
    }
  }

  // Pour chaque fichier du bundle, vérifie s'il doit être conservé ou remplacé
  for (const bundleFile of bundleFiles) {
    // Si c'est un fichier à supprimer directement, on le saute
    if (filesToRemove.includes(bundleFile)) {
      continue;
    }

    // Vérifie si ce fichier est contenu dans un des répertoires à supprimer
    const isInDirectoryToRemove = directoriesToRemove.some(dir => isSubPath(bundleFile, dir));
    if (isInDirectoryToRemove) {
      continue;
    }

    // Si c'est un répertoire qui contient un fichier à supprimer, on ne l'ajoute pas
    // car on va l'expendre plus tard
    if (bundleDirectoriesToExpand.has(bundleFile)) {
      continue;
    }

    // Sinon on le garde
    resultFiles.push(bundleFile);
  }

  // Traite les répertoires du bundle qui contiennent des fichiers à supprimer
  for (const dir of bundleDirectoriesToExpand) {
    // Récupère tous les fichiers et sous-répertoires du répertoire
    const expandedEntries = expandDirectoryWithSubdirs(path.join(cwd, dir), dir, cwd);

    // Structure pour organiser les fichiers et répertoires
    const allFiles = new Set<string>();
    const allDirs = new Set<string>();

    // Séparer les fichiers et répertoires
    for (const entry of expandedEntries) {
      if (isDirectory(path.join(cwd, entry))) {
        allDirs.add(entry);
      } else {
        allFiles.add(entry);
      }
    }

    // Supprimer les répertoires à supprimer de allDirs
    for (const dirToRemove of directoriesToRemove) {
      allDirs.delete(dirToRemove);
      // Supprimer aussi les répertoires enfants des répertoires à supprimer
      for (const dir of [...allDirs]) {
        if (isSubPath(dir, dirToRemove)) {
          allDirs.delete(dir);
        }
      }
    }

    // Supprimer les fichiers à supprimer et les fichiers contenus dans des répertoires à supprimer
    for (const fileToRemove of filesToRemove) {
      allFiles.delete(fileToRemove);
    }

    // Supprimer tous les fichiers qui sont sous un répertoire à supprimer
    for (const file of [...allFiles]) {
      if (directoriesToRemove.some(dir => isSubPath(file, dir))) {
        allFiles.delete(file);
      }
    }

    // Calculer les sous-répertoires qui peuvent encore être compressés
    const compressibleDirs = new Set<string>();

    for (const directory of allDirs) {
      // Vérifier que ce n'est pas un répertoire à supprimer ou dans un répertoire à supprimer
      if (
        filesToRemove.includes(directory) ||
        directoriesToRemove.some(dir => isSubPath(directory, dir))
      ) {
        continue;
      }

      // Si un fichier à supprimer est sous ce répertoire, on ne peut pas le compresser
      const containsFileToRemove = filesToRemove.some(file => isSubPath(file, directory));

      if (!containsFileToRemove) {
        // Vérifier si tous les fichiers enfants sont présents
        const dirFiles = Array.from(allFiles).filter(file => isSubPath(file, directory));
        const allDirFilesPresent =
          dirFiles.length === getAllFilesInDir(path.join(cwd, directory)).length;

        if (allDirFilesPresent) {
          compressibleDirs.add(directory);
        }
      }
    }

    // Ajouter les répertoires compressibles
    for (const compressibleDir of compressibleDirs) {
      resultFiles.push(compressibleDir);

      // Retirer les fichiers qui sont inclus dans ces répertoires
      for (const file of allFiles) {
        if (isSubPath(file, compressibleDir)) {
          allFiles.delete(file);
        }
      }
    }

    // Ajouter les fichiers restants
    resultFiles = [...resultFiles, ...Array.from(allFiles)];
  }

  // Normalise le résultat final pour maintenir la compression
  return normalizeFiles(resultFiles, cwd);
}

// Fonction pour développer récursivement un répertoire et obtenir tous ses fichiers et sous-répertoires
// Cette version retourne aussi les sous-répertoires
function expandDirectoryWithSubdirs(fullPath: string, relativePath: string, cwd: string): string[] {
  const results: string[] = [];

  try {
    // Obtient la liste des entrées dans le répertoire
    const entries = fs.readdirSync(fullPath);

    for (const entry of entries) {
      const entryFullPath = path.join(fullPath, entry);
      const entryRelativePath = path.join(relativePath, entry);

      if (isDirectory(entryFullPath)) {
        // Pour les sous-répertoires, on les ajoute
        results.push(entryRelativePath);
        // Et on ajoute leurs contenus
        const subEntries = expandDirectoryWithSubdirs(entryFullPath, entryRelativePath, cwd);
        results.push(...subEntries);
      } else {
        // Pour les fichiers, on les ajoute simplement
        results.push(entryRelativePath);
      }
    }
  } catch (error) {
    console.error(`Erreur lors de l'exploration du répertoire: ${fullPath}`, error);
  }

  return results;
}

// Fonction pour obtenir tous les fichiers (pas les répertoires) dans un répertoire
function getAllFilesInDir(fullPath: string): string[] {
  const files: string[] = [];

  try {
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        const entryPath = path.join(dir, entry);

        if (isDirectory(entryPath)) {
          walk(entryPath);
        } else {
          files.push(entryPath);
        }
      }
    };

    walk(fullPath);
  } catch (error) {
    console.error(`Erreur lors de l'exploration du répertoire: ${fullPath}`, error);
  }

  return files;
}

// Fonction pour vérifier si un chemin est un sous-chemin d'un autre
function isSubPath(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

// Fonction pour vérifier si un chemin est un répertoire
function isDirectory(fullPath: string): boolean {
  try {
    const normalizedPath = path.normalize(fullPath);
    return fs.statSync(normalizedPath).isDirectory();
  } catch (error) {
    console.error(`Erreur lors de la vérification du chemin : ${fullPath}`, error);
    return false;
  }
}

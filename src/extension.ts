import * as vscode from 'vscode';
import { exec } from 'child_process';
import { readFile, unlink, copyFile, access } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { setTimeout } from 'timers/promises';

let lastTempFilePath: string | undefined;

// Interface pour la configuration Repomix
interface RepomixConfig {
  output: {
    filePath: string;
    style: 'plain' | 'xml' | 'markdown';
    fileSummary: boolean;
    directoryStructure: boolean;
    removeComments: boolean;
    removeEmptyLines: boolean;
    topFilesLength: number;
    showLineNumbers: boolean;
    copyToClipboard: boolean;
  };
  include: string[];
  ignore: {
    useGitignore: boolean;
    useDefaultPatterns: boolean;
    customPatterns: string[];
  };
  security: {
    enableSecurityCheck: boolean;
  };
}

// Récupérer le chemin du dossier racine du workspace
function getRootWorkspacePath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
}

// Lire et valider la configuration Repomix
async function readRepomixConfig(rootFolderPath: string): Promise<RepomixConfig> {
  const configPath = path.join(rootFolderPath, 'repomix.config.json');
  try {
    await access(configPath); // Vérifie que le fichier existe
    const data = await readFile(configPath, 'utf8');
    const parsedConfig = JSON.parse(data);

    // Validation et valeurs par défaut
    return {
      output: {
        filePath: parsedConfig?.output?.filePath || 'repomix-output.txt', // Valeur par défaut
        style: parsedConfig?.output?.style || 'plain',
        fileSummary: parsedConfig?.output?.fileSummary ?? true,
        directoryStructure: parsedConfig?.output?.directoryStructure ?? true,
        removeComments: parsedConfig?.output?.removeComments ?? false,
        removeEmptyLines: parsedConfig?.output?.removeEmptyLines ?? false,
        topFilesLength: parsedConfig?.output?.topFilesLength ?? 5,
        showLineNumbers: parsedConfig?.output?.showLineNumbers ?? false,
        copyToClipboard: parsedConfig?.output?.copyToClipboard ?? false,
      },
      include: parsedConfig?.include || [],
      ignore: {
        useGitignore: parsedConfig?.ignore?.useGitignore ?? true,
        useDefaultPatterns: parsedConfig?.ignore?.useDefaultPatterns ?? true,
        customPatterns: parsedConfig?.ignore?.customPatterns || [],
      },
      security: {
        enableSecurityCheck: parsedConfig?.security?.enableSecurityCheck ?? true,
      },
    };
  } catch {
    // Si pas de config ou parsing échoue, retourne une config par défaut complète
    return {
      output: {
        filePath: 'repomix-output.txt',
        style: 'plain',
        fileSummary: true,
        directoryStructure: true,
        removeComments: false,
        removeEmptyLines: false,
        topFilesLength: 5,
        showLineNumbers: false,
        copyToClipboard: false,
      },
      include: [],
      ignore: {
        useGitignore: true,
        useDefaultPatterns: true,
        customPatterns: [],
      },
      security: {
        enableSecurityCheck: true,
      },
    };
  }
}

async function runRepomixCommand(
  uri: vscode.Uri,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    token.onCancellationRequested(() => {
      vscode.window.showWarningMessage('Repomix operation cancelled.');
      reject('Operation cancelled.');
    });

    (async () => {
      try {
        const rootFolderPath = getRootWorkspacePath(); // Récupère la racine du projet
        if (!rootFolderPath) {
          vscode.window.showErrorMessage('No root workspace folder found!');
          reject('No root folder');
          return;
        }

        // Lire la configuration Repomix à partir de la racine
        const config = await readRepomixConfig(rootFolderPath);

        // Récupérer le fichier de sortie depuis la configuration
        const outputFileName = config.output.filePath; // Dynamique depuis config
        const subFolderPath = uri.fsPath; // Dossier cliqué
        const outputFilePath = path.join(subFolderPath, outputFileName); // Chemin complet du fichier de sortie

        progress.report({
          increment: 0,
          message: `in /${path.basename(subFolderPath)} using config in /${path.basename(
            rootFolderPath
          )}`,
        });

        // On génère la commande
        const cmd = `npx repomix "${subFolderPath}" --output "${outputFilePath}"`;

        // Exécution de la commande avec `exec` en Promise
        exec(cmd, { cwd: rootFolderPath }, (error, stdout, stderr) => {
          if (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
            reject(error.message);
            return;
          }
          if (stderr) {
            vscode.window.showErrorMessage(`Error: ${stderr}`);
            reject(stderr);
            return;
          }

          progress.report({ increment: 50, message: 'Repomix executed, processing output...' });

          // Process output file après exécution
          processOutputFile(outputFilePath, progress, outputFileName)
            .then(() => {
              resolve();
            })
            .catch(err => {
              reject(err);
            });
        });
      } catch (err) {
        reject(err);
      }
    })();
  });
}

async function processOutputFile(
  originalFilePath: string,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  outputFileName: string // <==== Ajout pour utiliser le nom depuis la config
) {
  // Extraire le nom de fichier de outputFileName (même si c'est un chemin)
  const baseFileName = path.basename(outputFileName); // <==== Utilisation de path.basename
  const tmpFilePath = path.join(os.tmpdir(), baseFileName);
  lastTempFilePath = tmpFilePath;

  try {
    await copyFile(originalFilePath, tmpFilePath);
  } catch (copyError) {
    vscode.window.showErrorMessage(`Could not copy output file to temp folder: ${copyError}`);
    throw copyError;
  }

  const copyMode = vscode.workspace.getConfiguration('repomixRunner').get('copyMode');
  if (copyMode === 'file') {
    await new Promise<void>((resolve, reject) => {
      exec(
        `osascript -e 'on run argv' -e 'set the clipboard to item 1 of argv as «class furl»' -e 'end run' "${tmpFilePath}"`,
        (err, stdout, stderr) => {
          if (err) {
            vscode.window.showErrorMessage(`Error setting file to clipboard: ${err.message}`);
            reject(err);
          } else if (stderr) {
            vscode.window.showErrorMessage(`Error: ${stderr}`);
            reject(stderr);
          } else {
            resolve();
          }
        }
      );
    });
  } else {
    const fileContent = await readFile(tmpFilePath, 'utf8');
    await vscode.env.clipboard.writeText(fileContent);
  }

  setTimeout(3 * 60_000).then(() => {
    try {
      unlink(tmpFilePath);
    } catch (tmpUnlinkError) {
      console.error('Error deleting temp file:', tmpUnlinkError);
    }
  });

  const keepOutputFile = vscode.workspace.getConfiguration('repomixRunner').get('keepOutputFile');
  if (!keepOutputFile) {
    try {
      await unlink(originalFilePath);
    } catch (unlinkError) {
      console.error('Error deleting output file:', unlinkError);
    }
  }

  progress.report({ increment: 100, message: 'Repomix output copied to clipboard ✅' });
  await setTimeout(3000);
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('repomixRunner.run', (uri: vscode.Uri) => {
    if (!uri || !uri.fsPath) {
      vscode.window.showErrorMessage('Please select a folder first');
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Running Repomix',
        cancellable: true,
      },
      (progress, token) => runRepomixCommand(uri, progress, token)
    );
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

export function getLastTempFilePath() {
  return lastTempFilePath;
}

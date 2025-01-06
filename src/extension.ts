import * as vscode from 'vscode';
import { exec } from 'child_process';
import { readFile, unlink, copyFile, access } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { setTimeout } from 'timers/promises';
import * as util from 'util';

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

function configToCliFlags(config: RepomixConfig): string {
  const flags: string[] = [];

  // Output options
  if (config.output.filePath) {
    flags.push(`--output "${config.output.filePath}"`);
  }
  if (config.output.style) {
    flags.push(`--style ${config.output.style}`);
  }
  if (!config.output.fileSummary) {
    flags.push('--no-file-summary');
  }
  if (!config.output.directoryStructure) {
    flags.push('--no-directory-structure');
  }
  if (config.output.removeComments) {
    flags.push('--remove-comments');
  }
  if (config.output.removeEmptyLines) {
    flags.push('--remove-empty-lines');
  }
  if (config.output.showLineNumbers) {
    flags.push('--output-show-line-numbers');
  }
  // if (config.output.copyToClipboard) { // conflit avec le clipboard de lextension
  //   flags.push('--copy');
  // }
  if (config.output.topFilesLength !== 5) {
    flags.push(`--top-files-len ${config.output.topFilesLength}`);
  }

  // Include patterns
  if (config.include.length > 0) {
    flags.push(`--include "${config.include.join(',')}"`);
  }

  // Ignore patterns
  if (config.ignore.customPatterns.length > 0) {
    flags.push(`--ignore "${config.ignore.customPatterns.join(',')}"`);
  }

  // Security check
  if (!config.security.enableSecurityCheck) {
    flags.push('--no-security-check');
  }

  return flags.join(' ');
}

async function readRepomixConfig(rootFolderPath: string): Promise<RepomixConfig> {
  // TODO ajouter un watcher sur le fichier repomix.config.json
  const configPath = path.join(rootFolderPath, 'repomix.config.json');

  try {
    await access(configPath); // Vérifie que le fichier existe
    const data = await readFile(configPath, 'utf8');
    const parsedConfig = JSON.parse(data);

    // Validation et valeurs par défaut
    return {
      output: {
        filePath: parsedConfig?.output?.filePath || 'repomix-output.txt',
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
    // Si pas de config ou parsing échoue, on utilise la config VS Code
    const vsCodeConfig = vscode.workspace.getConfiguration('repomix');

    return {
      output: {
        filePath: vsCodeConfig.get('output.filePath') || 'repomix-output.txt',
        style: vsCodeConfig.get('output.style') || 'plain',
        fileSummary: vsCodeConfig.get('output.fileSummary') ?? true,
        directoryStructure: vsCodeConfig.get('output.directoryStructure') ?? true,
        removeComments: vsCodeConfig.get('output.removeComments') ?? false,
        removeEmptyLines: vsCodeConfig.get('output.removeEmptyLines') ?? false,
        topFilesLength: vsCodeConfig.get('output.topFilesLength') ?? 5,
        showLineNumbers: vsCodeConfig.get('output.showLineNumbers') ?? false,
        copyToClipboard: vsCodeConfig.get('output.copyToClipboard') ?? false,
      },
      include: vsCodeConfig.get('include') || [],
      ignore: {
        useGitignore: vsCodeConfig.get('ignore.useGitignore') ?? true,
        useDefaultPatterns: vsCodeConfig.get('ignore.useDefaultPatterns') ?? true,
        customPatterns: vsCodeConfig.get('ignore.customPatterns') || [],
      },
      security: {
        enableSecurityCheck: vsCodeConfig.get('security.enableSecurityCheck') ?? true,
      },
    };
  }
}

async function runRepomixCommand(
  uri: vscode.Uri,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
): Promise<void> {
  token.onCancellationRequested(() => {
    vscode.window.showWarningMessage('Repomix operation cancelled.');
    throw new Error('Operation cancelled.');
  });

  const targetFolderPath = uri.fsPath;
  const rootFolderPath = getRootWorkspacePath();

  if (!rootFolderPath) {
    vscode.window.showErrorMessage('No root workspace folder found!');
    throw new Error('No root folder');
  }

  let config = await readRepomixConfig(rootFolderPath); // TODO faire un merge des config repomix et extensions pour utiliser un seul config

  const useTargetAsOutput = vscode.workspace // TODO a mettre dans traitement config
    .getConfiguration('repomix.runner')
    .get('useTargetAsOutput');

  if (useTargetAsOutput) {
    config.output.filePath = path.join(targetFolderPath, config.output.filePath);
  }

  // On génère la commande avec les flags
  const cliFlags = configToCliFlags(config);

  progress.report({
    increment: 0,
    message: `in /${path.basename(targetFolderPath)}`,
  });

  // On génère la commande
  const cmd = `npx -y repomix "${targetFolderPath}" ${cliFlags}`;

  // Utiliser promisify pour transformer exec en Promise
  const execPromise = util.promisify(exec);

  try {
    const { stderr } = await execPromise(cmd, { cwd: rootFolderPath });

    if (stderr) {
      vscode.window.showErrorMessage(`Error: ${stderr}`);
      throw new Error(stderr);
    }

    progress.report({ increment: 50, message: 'Repomix executed, processing output...' });

    const outputFilePathAbs = path.resolve(targetFolderPath, config.output.filePath); // TODO couplage ici ?

    await processOutputFile(outputFilePathAbs, progress);
  } catch (error: any) {
    vscode.window.showErrorMessage(error.message);
    throw error;
  }
}

async function processOutputFile(
  outputFilePathAbs: string,
  progress: vscode.Progress<{ message?: string; increment?: number }>
) {
  console.log('outputFilePathAbs', outputFilePathAbs);
  const baseFileName = path.basename(outputFilePathAbs);
  const tmpFilePath = path.join(os.tmpdir(), 'repomix-runner-' + baseFileName);
  lastTempFilePath = tmpFilePath;

  try {
    await copyFile(outputFilePathAbs, tmpFilePath);
  } catch (copyError) {
    vscode.window.showErrorMessage(`Could not copy output file to temp folder: ${copyError}`);
    throw copyError;
  }

  const copyMode = vscode.workspace.getConfiguration('repomix.runner').get('copyMode'); // TODO a mettre dans traitement config
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

  cleanupTempFile(tmpFilePath); // TODO refator the clean up using meca that delete the dir content except last file

  const keepOutputFile = vscode.workspace.getConfiguration('repomix.runner').get('keepOutputFile'); // TODO à mettre dans la config
  if (!keepOutputFile) {
    try {
      await unlink(outputFilePathAbs);
    } catch (unlinkError) {
      console.error('Error deleting output file:', unlinkError);
    }
  }

  progress.report({ increment: 100, message: 'Repomix output copied to clipboard ✅' });
  await setTimeout(3000); // keep the popup open for 3s
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

async function cleanupTempFile(tmpFilePath: string): Promise<void> {
  try {
    await setTimeout(1 * 60_000);
    // Check if file exists before trying to delete
    try {
      await access(tmpFilePath);
      await unlink(tmpFilePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, nothing to do
    }
  } catch (error) {
    console.log(`Failed to delete temp file ${tmpFilePath}:`, error);
  }
}

export function deactivate() {
  // TODO add a cleanup function that delete the temp dir
}

export function getLastTempFilePath() {
  return lastTempFilePath;
}

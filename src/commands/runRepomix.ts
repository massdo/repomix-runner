import * as vscode from 'vscode';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';
import { readRepomixConfig, configToCliFlags } from '../config';
import { copyToClipboard, cleanOutputFile, cleanupTempFile } from '../features';
import { setTimeout } from 'timers/promises';

export function getWorkspacePath(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
}

export async function runRepomix(
  uri: vscode.Uri,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
): Promise<void> {
  token.onCancellationRequested(() => {
    vscode.window.showWarningMessage('Repomix operation cancelled.');
    throw new Error('Operation cancelled.');
  });

  const targetFolderPath = uri.fsPath;
  const rootFolderPath = getWorkspacePath();

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

    await copyToClipboard(outputFilePathAbs);
    await cleanOutputFile(outputFilePathAbs);
    await cleanupTempFile(outputFilePathAbs);

    progress.report({ increment: 100, message: 'Repomix output copied to clipboard ✅' });

    await setTimeout(3000); // keep the popup open for 3s
  } catch (error: any) {
    vscode.window.showErrorMessage(error.message);
    throw error;
  }
}

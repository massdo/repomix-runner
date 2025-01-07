import * as vscode from 'vscode';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';
import { setTimeout } from 'timers/promises';
import { mergeConfigs, readRunnerConfig, readBaseConfig, getCwd } from '../config';
import { copyToClipboard, cleanOutputFile, cleanupTempFile } from '../features';
import { generateCliFlags } from '../core/cli/generateCliFlags';

export async function runRepomix( // TODO il faut passer en param le chemin du fichier temporaire ici
  uri: vscode.Uri,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
): Promise<void> {
  token.onCancellationRequested(() => {
    vscode.window.showWarningMessage('Repomix operation cancelled.');
    throw new Error('Operation cancelled.');
  });

  const targetFolderPath = uri.fsPath;

  progress.report({
    increment: 0,
    message: `in /${path.basename(targetFolderPath)}`,
  });

  const cwd = getCwd();

  // Load config and write repomix command with corresponding flags
  const runnerConfig = readRunnerConfig();
  const baseConfig = await readBaseConfig(cwd);
  const config = mergeConfigs(cwd, runnerConfig, baseConfig, targetFolderPath);

  const cliFlags = generateCliFlags(config);

  const cmd = `npx -y repomix "${targetFolderPath}" ${cliFlags}`;

  const execPromise = util.promisify(exec);

  // Execute repomix
  try {
    const { stderr } = await execPromise(cmd, { cwd: cwd });

    if (stderr) {
      vscode.window.showErrorMessage(`Error: ${stderr}`);
      throw new Error(stderr);
    }

    progress.report({ increment: 50, message: 'Repomix executed, processing output...' });

    const outputFilePathAbs = path.resolve(targetFolderPath, config.output.filePath); // TODO couplage ici ?

    await copyToClipboard(outputFilePathAbs); // TODO il faut passer le chemin du fichier temporaire ici

    progress.report({ increment: 100, message: 'Repomix output copied to clipboard ✅' });

    await cleanOutputFile(outputFilePathAbs, config.keepOutputFile);
    cleanupTempFile(outputFilePathAbs);

    await setTimeout(3000); // keep the popup open for 3s
  } catch (error: any) {
    vscode.window.showErrorMessage(error.message);
    throw error;
  }
}

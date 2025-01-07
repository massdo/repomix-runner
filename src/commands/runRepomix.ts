import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
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

  const cwd = getCwd();
  const targetPathAbs = uri.fsPath;

  progress.report({
    increment: 0,
    message: `in /${path.basename(targetPathAbs)}`,
  });

  // Load config and write repomix command with corresponding flags
  const runnerConfig = readRunnerConfig();
  const baseConfig = await readBaseConfig(cwd);
  const config = mergeConfigs(runnerConfig, baseConfig, targetPathAbs);

  const cliFlags = generateCliFlags(config);

  const cmd = `npx -y repomix "${targetPathAbs}" ${cliFlags}`;

  const execPromise = util.promisify(exec);

  // Execute repomix
  try {
    const { stderr } = await execPromise(cmd, { cwd: cwd });

    if (stderr) {
      vscode.window.showErrorMessage(`Error: ${stderr}`);
      throw new Error(stderr);
    }

    progress.report({ increment: 50, message: 'Repomix executed, processing output...' });

    const outputFileRel = path.relative(cwd, config.output.filePath);
    const tmpFilePath = path.join(os.tmpdir(), 'repomix_' + outputFileRel.split('/').join('_'));

    await copyToClipboard(config.output.filePath, tmpFilePath);

    progress.report({ increment: 100, message: 'Repomix output copied to clipboard ✅' });

    await cleanOutputFile(config.output.filePath, config.keepOutputFile);

    cleanupTempFile(tmpFilePath);

    await setTimeout(3000); // keep the popup open for 3s
  } catch (error: any) {
    vscode.window.showErrorMessage(error.message);
    throw error;
  }
}

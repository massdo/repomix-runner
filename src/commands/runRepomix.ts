import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as util from 'util';
import { logger } from '../shared/logger';
import { exec } from 'child_process';
import { mergeConfigs, readRunnerConfig, readBaseConfig, getCwd } from '../config';
import { copyToClipboard, cleanOutputFile, cleanupTempFile } from '../features';
import { generateCliFlags } from '../core/cli/generateCliFlags';
import { showTempNotification } from '../shared/showTempNotification';

export async function runRepomix(uri: vscode.Uri): Promise<void> {
  const cwd = getCwd();
  const targetDir = uri.fsPath;

  // Load config and write repomix command with corresponding flags
  const runnerConfig = readRunnerConfig();
  const baseConfig = await readBaseConfig(cwd);
  const config = mergeConfigs(cwd, runnerConfig, baseConfig, targetDir);

  const cliFlags = generateCliFlags(config);

  const cmd = `npx -y repomix "${config.targetDir}" ${cliFlags}`;

  logger.both.debug('config: \n', config);
  logger.both.debug('cmd: \n', cmd);
  logger.both.debug('cwd: \n', cwd);

  const execPromise = util.promisify(exec);

  try {
    const cmdPromise = execPromise(cmd, { cwd: cwd });

    showTempNotification(`⚙️ Running Repomix in "${config.targetDirBasename}" ...`, {
      promise: cmdPromise,
    });

    const { stderr, stdout } = await cmdPromise;

    if (stdout) {
      logger.both.info('stdout: \n', stdout);
    }

    if (stderr) {
      logger.both.error('stderr: \n', stderr);
    }

    const tmpFilePath = path.join(
      os.tmpdir(),
      'repomix_' + config.targetPathRelative.split('/').join('_')
    );

    await copyToClipboard(config.output.filePath, tmpFilePath);

    showTempNotification(
      `✅ Repomix successfully executed in "${config.targetDirBasename}",
       details in output`,
      {
        duration: 5000,
        cancellable: true,
      }
    );

    await cleanOutputFile(config.output.filePath, config.keepOutputFile);

    cleanupTempFile(tmpFilePath);
  } catch (error: any) {
    logger.both.error(error);
    vscode.window.showErrorMessage(error.message);
    throw error;
  }
}

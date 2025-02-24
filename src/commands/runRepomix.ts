import * as vscode from 'vscode';
import * as path from 'path';
import { execPromisify } from '../shared/execPromisify.js';
import { logger } from '../shared/logger.js';
import { mergeConfigs } from '../config/configLoader.js';
import { getCwd } from '../config/getCwd.js';
import { copyToClipboard } from '../core/files/copyToClipboard.js';
import { cleanOutputFile } from '../core/files/cleanOutputFile.js';
import { cliFlagsBuilder } from '../core/cli/cliFlagsBuilder.js';
import { showTempNotification } from '../shared/showTempNotification.js';
import { readRepomixFileConfig } from '../config/configLoader.js';
import { readRepomixRunnerVscodeConfig } from '../config/configLoader.js';
import { tempDirManager } from '../core/files/tempDirManager.js';
import { RepomixConfigFile } from '../config/configSchema.js';

export type RunRepomixDeps = {
  getCwd: typeof getCwd;
  copyToClipboard: typeof copyToClipboard;
  cleanOutputFile: typeof cleanOutputFile;
  readRepomixRunnerVscodeConfig: typeof readRepomixRunnerVscodeConfig;
  readRepomixFileConfig: typeof readRepomixFileConfig;
  mergeConfigs: typeof mergeConfigs;
  cliFlagsBuilder: typeof cliFlagsBuilder;
  execPromisify: typeof execPromisify;
  mergeConfigOverride: RepomixConfigFile | null;
};

export const defaultRunRepomixDeps: RunRepomixDeps = {
  getCwd,
  copyToClipboard,
  cleanOutputFile,
  readRepomixRunnerVscodeConfig,
  readRepomixFileConfig,
  mergeConfigs,
  cliFlagsBuilder,
  execPromisify,
  mergeConfigOverride: null,
} as const;

export async function runRepomix(
  targetDir: string,
  tempDir: string,
  deps: RunRepomixDeps = defaultRunRepomixDeps
): Promise<void> {
  const cwd = deps.getCwd();

  // Load config and write repomix command with corresponding flags
  const vscodeConfig = deps.readRepomixRunnerVscodeConfig();
  const configFile = await deps.readRepomixFileConfig(cwd);
  const config = deps.mergeConfigs(
    cwd,
    configFile,
    vscodeConfig,
    targetDir,
    deps.mergeConfigOverride
  );

  const cliFlags = deps.cliFlagsBuilder(config);

  const cmd = `npx -y repomix@latest "${config.targetDir}" ${cliFlags}`;

  logger.both.debug('config: \n', config);
  logger.both.debug('cmd: \n', cmd);
  logger.both.debug('cwd: \n', cwd);

  try {
    const cmdPromise = deps.execPromisify(cmd, { cwd: cwd });

    showTempNotification(`⚙️ Running Repomix in "${config.targetDirBasename}" ...`, {
      promise: cmdPromise,
    });

    const { stderr, stdout } = await cmdPromise;

    if (stdout) {
      logger.both.info('stdout: \n', stdout);
    }

    if (stderr) {
      logger.both.error('stderr: \n', stderr);
      throw new Error(stderr);
    }

    const tmpFilePath = path.join(tempDir, config.targetPathRelative.split('/').join('_'));

    if (config.output.copyToClipboard && config.runner.copyMode === 'file') {
      await deps.copyToClipboard(config.output.filePath, tmpFilePath);
    }

    showTempNotification(
      `✅ Repomix successfully executed in "${config.targetDirBasename}",
       details in output`,
      {
        duration: 3000,
        cancellable: true,
      }
    );

    if (!config.runner.keepOutputFile) {
      await deps.cleanOutputFile(config.output.filePath);
    }

    tempDirManager.cleanupFile(tmpFilePath).catch(error => {
      logger.both.error('Error cleaning up temp file:', error);
    });
  } catch (error: any) {
    logger.both.error(error);
    vscode.window.showErrorMessage(error.message);
    throw error;
  }
}

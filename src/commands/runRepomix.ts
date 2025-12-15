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
import { tempDirManager, TempDirManager } from '../core/files/tempDirManager.js';
import { MergedConfig, RepomixConfigFile } from '../config/configSchema.js';

let isRunning = false;

export type RunRepomixDeps = {
  tempDirManager: TempDirManager;
  getCwd: typeof getCwd;
  copyToClipboard: typeof copyToClipboard;
  cleanOutputFile: typeof cleanOutputFile;
  readRepomixRunnerVscodeConfig: typeof readRepomixRunnerVscodeConfig;
  readRepomixFileConfig: typeof readRepomixFileConfig;
  mergeConfigs: typeof mergeConfigs;
  cliFlagsBuilder: typeof cliFlagsBuilder;
  execPromisify: typeof execPromisify;
  mergeConfigOverride: RepomixConfigFile | null;
  signal?: AbortSignal;
};

export const defaultRunRepomixDeps: RunRepomixDeps = {
  tempDirManager,
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

export async function runRepomix(deps: RunRepomixDeps = defaultRunRepomixDeps): Promise<void> {
  if (isRunning) {
    return;
  }
  isRunning = true;

  try {
    const cwd = deps.getCwd();

    const vscodeConfig = deps.readRepomixRunnerVscodeConfig();
    logger.setVerbose(vscodeConfig.runner.verbose);

    const configFile = await deps.readRepomixFileConfig(cwd);
    if (!configFile) {
      logger.both.debug('No root repomix.config.json file found');
    }

    const config = await deps.mergeConfigs(cwd, configFile, vscodeConfig, deps.mergeConfigOverride);

    // Security check: validate paths
    const workspaceRoot = cwd; // cwd is guaranteed to be workspace root or valid
    const relativeOutputPath = path.relative(workspaceRoot, config.output.filePath);
    if (relativeOutputPath.startsWith('..') && !path.isAbsolute(relativeOutputPath)) {
         throw new Error(`Security Violation: Output path "${config.output.filePath}" attempts to traverse outside the workspace.`);
    }

    const cliFlags = deps.cliFlagsBuilder(config);

    // Security: Validate config.cwd usage if it differs from workspaceRoot (though mergeConfigs sets it to cwd usually)
    // config.cwd is derived from getCwd().

    // Construct command
    // We trust npx and repomix.
    // config.cwd is quoted.
    const cmd = `npx -y repomix@latest "${config.cwd}" ${cliFlags}`;

    logger.both.debug('config: \n', config);
    logger.both.debug('cmd: \n', cmd);
    logger.both.debug('cwd: \n', cwd);
    const cmdPromise = deps.execPromisify(cmd, { cwd: cwd, signal: deps.signal });

    showTempNotification(`⚙️ Running Repomix in "${path.basename(cwd)}" please wait ...`, {
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

    const tmpFilePath = path.join(
      deps.tempDirManager.getTempDir(),
      `${Date.now().toString().slice(-3)}_${path.basename(config.output.filePath)}`
    );

    if (config.output.copyToClipboard && config.runner.copyMode === 'file') {
      await deps.copyToClipboard(config.output.filePath, tmpFilePath);
    }

    const notifContent = generateNotifContent(cwd, config);

    showTempNotification(notifContent, {
      duration: 15000,
      cancellable: true,
    });

    if (!config.runner.keepOutputFile) {
      await deps.cleanOutputFile(config.output.filePath);
    }

    tempDirManager.cleanupFile(tmpFilePath).catch(error => {
      logger.both.error('Error cleaning up temp file:', error);
    });

    isRunning = false;
  } catch (error: any) {
    isRunning = false;

    if (error.name === 'AbortError') {
      logger.both.info('Repomix execution cancelled');
      // Re-throw to let caller handle it if needed, or suppress
      throw error;
    }

    logger.both.error(error);
    vscode.window.showErrorMessage(error.message);
    throw error;
  }
}

function generateNotifContent(cwd: string, config: MergedConfig): string {
  let message = `✅ Repomix successfully executed in "${path.basename(config.cwd)}"`;

  if (config.output.copyToClipboard && config.runner.copyMode === 'file') {
    message += `, ✅ output Copied to clipboard as File`;
  }

  if (config.output.copyToClipboard && config.runner.copyMode === 'content') {
    message += `, ✅ output Copied to clipboard as raw Text`;
  }

  if (config.runner.keepOutputFile) {
    message += ` ➡️ output path: "${path.relative(cwd, config.output.filePath)}"`;
  }

  return message;
}

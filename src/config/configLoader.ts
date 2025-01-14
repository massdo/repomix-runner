import * as vscode from 'vscode';
import * as path from 'path';
import { readFile } from 'fs/promises';
import {
  type RepomixConfigFile,
  type MergedConfig,
  repomixConfigBaseSchema,
  defaultConfig,
  defaultFilePathMap,
  RepomixRunnerConfigDefault,
  repomixRunnerConfigDefaultSchema,
  mergedConfigSchema,
} from './configSchema';
import { logger } from '../shared/logger';

export function readRepomixRunnerVscodeConfig(): RepomixRunnerConfigDefault {
  const config = vscode.workspace.getConfiguration('repomix');
  const validatedConfig = repomixRunnerConfigDefaultSchema.parse(config);
  return validatedConfig;
}

export async function readRepomixFileConfig(cwd: string): Promise<RepomixConfigFile | void> {
  const configPath = path.join(cwd, 'repomix.config.json'); // TODO support --config flag

  try {
    await readFile(configPath, { encoding: 'utf8' });
  } catch (error) {
    logger.both.debug('repomix.config.json file does not exist');
    return;
  }

  try {
    const data = await readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    return repomixConfigBaseSchema.parse(config);
  } catch (error) {
    logger.both.error('Invalid repomix.config.json format');
    vscode.window.showErrorMessage(`Invalid repomix.config.json format: ${error}`);
    throw new Error('Invalid repomix.config.json format');
  }
}

export function mergeConfigs(
  cwd: string,
  configFromRepomixFile: RepomixConfigFile | void,
  configFromRepomixRunnerVscode: RepomixRunnerConfigDefault,
  targetDir: string
): MergedConfig {
  const baseConfig: RepomixRunnerConfigDefault = defaultConfig;

  let repomixMergedConfig = {
    ...configFromRepomixRunnerVscode,
    ...configFromRepomixFile,
  };

  // add the minimal default fields if not given in the vscode settings or the config file
  if (
    configFromRepomixFile?.output?.filePath === null &&
    configFromRepomixRunnerVscode?.output?.filePath === null
  ) {
    const style = repomixMergedConfig.output?.style || baseConfig.output.style;
    baseConfig.output.filePath = defaultFilePathMap[style];

    logger.both.trace('Default output file path is set to:', baseConfig.output.filePath);
  }

  const mergedConfig = {
    targetDirBasename: path.relative(cwd, targetDir) || path.basename(cwd),
    targetDir,
    targetPathRelative: path.relative(cwd, path.resolve(targetDir, baseConfig.output.filePath)),
    ...baseConfig,
    ...repomixMergedConfig,
    output: {
      ...baseConfig.output,
      ...repomixMergedConfig.output,
      filePath: configFromRepomixRunnerVscode.runner.useTargetAsOutput
        ? path.resolve(targetDir, repomixMergedConfig.output.filePath || baseConfig.output.filePath)
        : path.resolve(cwd, repomixMergedConfig.output.filePath || baseConfig.output.filePath),
    },
  };

  return mergedConfigSchema.parse(mergedConfig);
}

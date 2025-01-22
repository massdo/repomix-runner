import * as vscode from 'vscode';
import * as path from 'path';
import { readFile } from 'fs/promises';
import {
  type RepomixConfigFile,
  type MergedConfig,
  repomixConfigBaseSchema,
  defaultConfig,
  RepomixRunnerConfigDefault,
  repomixRunnerConfigDefaultSchema,
  mergedConfigSchema,
} from './configSchema';
import { logger } from '../shared/logger';

function addFileExtension(filePath: string, style: string): string {
  const extensionMap: Record<string, string> = {
    xml: '.xml',
    markdown: '.md',
    plain: '.txt',
  };
  const extension = extensionMap[style];

  if (filePath.endsWith(extension)) {
    return filePath;
  }

  return `${filePath}${extension}`;
}

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
    const { default: stripJsonComments } = await import('strip-json-comments');
    const config = JSON.parse(stripJsonComments(data));
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

  let outputFilePath =
    configFromRepomixFile?.output?.filePath ||
    configFromRepomixRunnerVscode.output.filePath ||
    baseConfig.output.filePath;

  const outputStyle =
    configFromRepomixFile?.output?.style ||
    configFromRepomixRunnerVscode.output.style ||
    baseConfig.output.style;

  outputFilePath = addFileExtension(outputFilePath, outputStyle);

  const mergedConfig = {
    targetDirBasename: path.relative(cwd, targetDir) || path.basename(cwd),
    targetDir,
    targetPathRelative: path.relative(cwd, path.resolve(targetDir, outputFilePath)),
    runner: {
      ...baseConfig.runner,
      ...configFromRepomixRunnerVscode.runner,
    },
    output: {
      ...baseConfig.output,
      ...configFromRepomixRunnerVscode.output,
      ...configFromRepomixFile?.output,
      filePath: configFromRepomixRunnerVscode.runner.useTargetAsOutput
        ? path.resolve(targetDir, outputFilePath)
        : path.resolve(cwd, outputFilePath),
    },
    include:
      // MEMO on cumule  dans repomix -> issue ?
      configFromRepomixFile?.include || configFromRepomixRunnerVscode.include || baseConfig.include,
    ignore: {
      ...baseConfig.ignore,
      ...configFromRepomixRunnerVscode.ignore,
      ...configFromRepomixFile?.ignore,
      customPatterns:
        // MEMO on cumule  dans repomix -> issue ?
        configFromRepomixFile?.ignore?.customPatterns ||
        configFromRepomixRunnerVscode.ignore.customPatterns ||
        baseConfig.ignore.customPatterns,
    },
    security: {
      ...baseConfig.security,
      ...configFromRepomixRunnerVscode.security,
      ...configFromRepomixFile?.security,
    },
  };

  return mergedConfigSchema.parse(mergedConfig);
}

import * as vscode from 'vscode';
import * as path from 'path';
import { access, readFile } from 'fs/promises';
import {
  type RepomixConfigFile,
  type MergedConfig,
  repomixConfigBaseSchema,
  defaultConfig,
  RepomixRunnerConfigDefault,
  repomixRunnerConfigDefaultSchema,
  mergedConfigSchema,
} from './configSchema.js';
import { logger } from '../shared/logger.js';
import { isDirectory } from '../shared/files.js';

function stripJsonComments(json: string): string {
  // Remove multi-line comments but preserve line breaks
  json = json.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\r\n]/g, ' '));

  // Remove single-line comments but preserve line breaks
  json = json.replace(/\/\/[^\n\r]*/g, match => match.replace(/[^\r\n]/g, ' '));

  return json;
}

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

export async function readRepomixFileConfig(
  cwd: string,
  customConfigPathRelative?: string
): Promise<RepomixConfigFile | void> {
  const configPath = path.join(cwd, customConfigPathRelative || 'repomix.config.json'); // TODO support --config flag

  try {
    await access(configPath);
  } catch (error) {
    if (customConfigPathRelative) {
      vscode.window.showErrorMessage(`Can't access config file at ${configPath}`);
    }
    logger.both.debug(`Can't access config file at ${configPath}`);
    return;
  }

  try {
    const data = await readFile(configPath, 'utf8');
    const config = JSON.parse(stripJsonComments(data));
    return repomixConfigBaseSchema.parse(config);
  } catch (error) {
    logger.both.error('Invalid repomix.config.json format');
    vscode.window.showErrorMessage(`Invalid repomix.config.json format: ${error}`);
    throw new Error('Invalid repomix.config.json format');
  }
}

/**
 * Merges configurations from different sources with the following priority order (highest to lowest):
 * 1. overrideConfig (passed directly to the function)
 * 2. configFromRepomixFile (from repomix.config.json)
 * 3. configFromRepomixRunnerVscode (from VS Code settings)
 * 4. baseConfig (default configuration)
 *
 * @param cwd Current working directory
 * @param configFromRepomixFile Configuration from repomix.config.json file
 * @param configFromRepomixRunnerVscode Configuration from VS Code settings
 * @param overrideConfig Optional configuration to override all other sources
 * @returns Merged configuration following the priority order
 */
export async function mergeConfigs(
  cwd: string,
  configFromRepomixFile: RepomixConfigFile | void,
  configFromRepomixRunnerVscode: RepomixRunnerConfigDefault,
  overrideConfig: RepomixConfigFile | null = null
): Promise<MergedConfig> {
  const baseConfig: RepomixRunnerConfigDefault = defaultConfig;

  const include =
    overrideConfig?.include ||
    configFromRepomixFile?.include ||
    configFromRepomixRunnerVscode.include ||
    baseConfig.include;

  let outputFilePath =
    overrideConfig?.output?.filePath ||
    configFromRepomixFile?.output?.filePath ||
    configFromRepomixRunnerVscode.output.filePath ||
    baseConfig.output.filePath;

  // If usetargetasoutput option is true and include is a directory, then use the directory as output
  if (
    configFromRepomixRunnerVscode.runner.useTargetAsOutput &&
    !overrideConfig?.output?.filePath &&
    include.length === 1 &&
    !include[0].includes('*') &&
    (await isDirectory(include[0]))
  ) {
    const targetDir = path.resolve(cwd, include[0]);
    outputFilePath = path.resolve(targetDir, outputFilePath);
  }

  const outputStyle =
    overrideConfig?.output?.style ||
    configFromRepomixFile?.output?.style ||
    configFromRepomixRunnerVscode.output.style ||
    baseConfig.output.style;

  outputFilePath = addFileExtension(outputFilePath, outputStyle);

  const mergedConfig = {
    cwd,
    runner: {
      ...baseConfig.runner,
      ...configFromRepomixRunnerVscode.runner,
    },
    output: {
      ...baseConfig.output,
      ...configFromRepomixRunnerVscode.output,
      ...configFromRepomixFile?.output,
      ...overrideConfig?.output,
      filePath: path.resolve(cwd, outputFilePath),
    },
    include: include,
    ignore: {
      ...baseConfig.ignore,
      ...configFromRepomixRunnerVscode.ignore,
      ...configFromRepomixFile?.ignore,
      ...overrideConfig?.ignore,
      customPatterns:
        // MEMO on cumule  dans repomix -> issue ?
        overrideConfig?.ignore?.customPatterns ||
        configFromRepomixFile?.ignore?.customPatterns ||
        configFromRepomixRunnerVscode.ignore.customPatterns ||
        baseConfig.ignore.customPatterns,
    },
    security: {
      ...baseConfig.security,
      ...configFromRepomixRunnerVscode.security,
      ...configFromRepomixFile?.security,
      ...overrideConfig?.security,
    },
    tokenCount: {
      ...baseConfig.tokenCount,
      ...configFromRepomixRunnerVscode.tokenCount,
      ...configFromRepomixFile?.tokenCount,
      ...overrideConfig?.tokenCount,
    },
  };

  return mergedConfigSchema.parse(mergedConfig);
}

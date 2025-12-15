import * as vscode from 'vscode';
import * as path from 'path';
import { Bundle } from '../bundles/types.js';
import { readRepomixRunnerVscodeConfig, readRepomixFileConfig } from '../../config/configLoader.js';
import { generateOutputFilename } from '../../commands/generateOutputFilename.js';
import { getCwd } from '../../config/getCwd.js';
import { RepomixConfigFile } from '../../config/configSchema.js';

export async function resolveBundleOutputPath(bundle: Bundle): Promise<string> {
  const cwd = getCwd();
  const config = readRepomixRunnerVscodeConfig();
  let overrideConfig: RepomixConfigFile = {};

  // If a custom bundle config file is provided, use it
  if (bundle.configPath) {
    const bundleConfig = await readRepomixFileConfig(cwd, bundle.configPath);
    overrideConfig = bundleConfig || {};
  }

  // Calculate output filename
  overrideConfig.output ??= {};
  const baseFilePath = overrideConfig.output.filePath || config.output.filePath;
  const useBundleNameAsOutputName = config.runner.useBundleNameAsOutputName;

  const outputFilename = generateOutputFilename(
    bundle,
    baseFilePath,
    useBundleNameAsOutputName
  );

  return path.resolve(cwd, outputFilename);
}

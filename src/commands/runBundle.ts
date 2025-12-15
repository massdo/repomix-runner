import * as vscode from 'vscode';
import * as path from 'path';
import { getCwd } from '../config/getCwd.js';
import { runRepomixOnSelectedFiles } from './runRepomixOnSelectedFiles.js';
import { logger } from '../shared/logger.js';
import { showTempNotification } from '../shared/showTempNotification.js';
import { readRepomixRunnerVscodeConfig, readRepomixFileConfig } from '../config/configLoader.js';
import { RepomixConfigFile } from '../config/configSchema.js';
import { BundleManager } from '../core/bundles/bundleManager.js';
import { generateOutputFilename } from './generateOutputFilename.js';
import { deepMerge } from '../utils/deepMerge.js';
import { validateOutputFilePath } from '../utils/pathValidation.js';

export async function runBundle(
  bundleManager: BundleManager,
  bundleId: string,
  signal?: AbortSignal,
  additionalOverrides?: RepomixConfigFile
) {
  const cwd = getCwd();
  const bundle = await bundleManager.getBundle(bundleId);

  // Load bundle config if exists
  let overrideConfig: RepomixConfigFile = {};
  if (bundle.configPath) {
    const bundleConfig = await readRepomixFileConfig(cwd, bundle.configPath);
    overrideConfig = bundleConfig || {};
  }

  // Validate and merge additional overrides
  if (additionalOverrides) {
    // Security Check: Validate overridden output path if present
    if (additionalOverrides.output?.filePath) {
      try {
        validateOutputFilePath(additionalOverrides.output.filePath, cwd);
      } catch (error: any) {
        logger.both.error('Security validation failed for override path:', error);
        vscode.window.showErrorMessage(error.message);
        return;
      }
    }

    // Use deep merge to ensure nested properties (like output options) are preserved
    overrideConfig = deepMerge(overrideConfig, additionalOverrides);
  }

  // Calculate final output path
  // We mirror the logic from resolveBundleOutputPath but using our merged config
  const config = readRepomixRunnerVscodeConfig();
  overrideConfig.output ??= {};

  const baseFilePath = overrideConfig.output.filePath || config.output.filePath;
  const useBundleNameAsOutputName = config.runner.useBundleNameAsOutputName;

  const outputFilename = generateOutputFilename(
    bundle,
    baseFilePath,
    useBundleNameAsOutputName
  );

  const finalOutputFilePath = path.resolve(cwd, outputFilename);

  // Security Check: Validate the final resolved path
  try {
     validateOutputFilePath(finalOutputFilePath, cwd);
  } catch (error: any) {
      logger.both.error('Security validation failed for resolved output path:', error);
      vscode.window.showErrorMessage(error.message);
      return;
  }

  // Enforce the calculated path in the config used for execution
  overrideConfig.output.filePath = finalOutputFilePath;

  try {
    // Convert file paths to URIs
    if (!bundle.files) {
      return;
    }
    const uris = bundle.files.map(filePath =>
      vscode.Uri.file(vscode.Uri.joinPath(vscode.Uri.file(cwd), filePath).fsPath)
    );

    // Validate that all files still exist
    const missingFiles: string[] = [];
    for (const uri of uris) {
      if (signal?.aborted) {
        throw new Error('Aborted');
      }
      try {
        await vscode.workspace.fs.stat(uri);
      } catch {
        missingFiles.push(uri.fsPath);
      }
    }

    if (missingFiles.length > 0) {
      const proceed = await vscode.window.showWarningMessage(
        `Some files in this bundle no longer exist:\n${missingFiles.join(
          '\n'
        )}\n\nDo you want to proceed with the remaining files?`,
        'Yes',
        'No'
      );
      if (proceed !== 'Yes') {
        return;
      }
    }

    if (signal?.aborted) {
        throw new Error('Aborted');
    }

    // Filter out missing files
    const validUris = uris.filter(uri => !missingFiles.includes(uri.fsPath));

    if (validUris.length === 0) {
      showTempNotification('No valid files remaining in bundle.');
      return;
    }

    // Run Repomix on the bundle files
    await runRepomixOnSelectedFiles(validUris, overrideConfig, signal);

    if (signal?.aborted) {
       return;
    }

    const updatedBundle = {
      ...bundle,
      lastUsed: new Date().toISOString(),
    };

    await bundleManager.saveBundle(bundleId, updatedBundle);
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message === 'Aborted') {
        logger.both.info('Bundle execution cancelled');
        throw error;
    }
    logger.both.error('Failed to run bundle:', error);
    vscode.window.showErrorMessage(`Failed to run bundle: ${error}`);
  }
}

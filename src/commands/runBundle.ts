import * as vscode from 'vscode';
import { getCwd } from '../config/getCwd.js';
import { runRepomixOnSelectedFiles } from './runRepomixOnSelectedFiles.js';
import { logger } from '../shared/logger.js';
import { showTempNotification } from '../shared/showTempNotification.js';
import { readRepomixRunnerVscodeConfig } from '../config/configLoader.js';
import { RepomixConfigFile } from '../config/configSchema.js';
import { BundleManager } from '../core/bundles/bundleManager.js';
import { readRepomixFileConfig } from '../config/configLoader.js';

export async function runBundle(bundleManager: BundleManager, bundleId: string) {
  const cwd = getCwd();
  const bundle = await bundleManager.getBundle(bundleId);
  const config = readRepomixRunnerVscodeConfig();
  let overrideConfig: RepomixConfigFile = {};

  // If a custom bundle config file is provided, use it
  if (bundle.configPath) {
    const bundleConfig = await readRepomixFileConfig(cwd, bundle.configPath);

    if (!bundleConfig) {
      return;
    }

    overrideConfig = bundleConfig;
  }

  if (config.runner.useBundleNameAsOutputName) {
    overrideConfig.output ??= {};

    const baseFilePath = overrideConfig.output.filePath || config.output.filePath;
    overrideConfig.output.filePath = baseFilePath + bundle.name;
  }

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

    // Filter out missing files
    const validUris = uris.filter(uri => !missingFiles.includes(uri.fsPath));

    if (validUris.length === 0) {
      showTempNotification('No valid files remaining in bundle.');
      return;
    }

    // Run Repomix on the bundle files
    await runRepomixOnSelectedFiles(validUris, overrideConfig);

    const updatedBundle = {
      ...bundle,
      lastUsed: new Date().toISOString(),
    };

    await bundleManager.saveBundle(bundleId, updatedBundle);
  } catch (error) {
    logger.both.error('Failed to run bundle:', error);
    vscode.window.showErrorMessage(`Failed to run bundle: ${error}`);
  }
}

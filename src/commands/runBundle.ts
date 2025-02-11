import * as vscode from 'vscode';
import { getCwd } from '../config/getCwd';
import { runRepomixOnSelectedFiles } from './runRepomixOnSelectedFiles';
import { logger } from '../shared/logger';
import { showTempNotification } from '../shared/showTempNotification';
import { Bundle } from '../core/bundles/types';
import { BundleManager } from '../core/bundles/bundleManager';

export async function runBundle(bundle: Bundle) {
  const cwd = getCwd();
  const bundleManager = new BundleManager(cwd);
  try {
    // Convert file paths to URIs
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
    await runRepomixOnSelectedFiles(validUris);

    const updatedBundle = {
      ...bundle,
      lastUsed: new Date().toISOString(),
    };

    await bundleManager.saveBundle(updatedBundle);
  } catch (error) {
    logger.both.error('Failed to run bundle:', error);
    vscode.window.showErrorMessage(`Failed to run bundle: ${error}`);
  }
}

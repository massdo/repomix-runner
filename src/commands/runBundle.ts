import * as vscode from 'vscode';
import { BundleManager } from '../core/bundles/bundleManager';
import { getCwd } from '../config/getCwd';
import { runRepomixOnSelectedFiles } from './runRepomixOnSelectedFiles';
import { logger } from '../shared/logger';
import { showTempNotification } from '../shared/showTempNotification';

export async function runBundle() {
  const cwd = getCwd();
  const bundleManager = new BundleManager(cwd);

  try {
    const metadata = await bundleManager.getAllBundles();
    const bundleNames = Object.keys(metadata.bundles);

    if (bundleNames.length === 0) {
      showTempNotification(
        'No bundles found. Create a bundle first by selecting files and using "Save as Bundle".'
      );
      return;
    }

    const items = bundleNames.map(name => {
      const bundle = metadata.bundles[name];
      return {
        label: name,
        description: bundle.description || '',
        detail: `${bundle.files.length} files • ${bundle.tags.join(', ')}`,
        bundle: bundle,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a bundle to run',
      title: 'Run Repomix Bundle',
    });

    if (!selected) {
      return;
    }

    const updatedBundle = {
      ...selected.bundle,
      lastUsed: new Date().toISOString(),
    };
    await bundleManager.saveBundle(updatedBundle);

    // Convert file paths to URIs
    const uris = selected.bundle.files.map(filePath =>
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
  } catch (error) {
    logger.both.error('Failed to run bundle:', error);
    vscode.window.showErrorMessage(`Failed to run bundle: ${error}`);
  }
}

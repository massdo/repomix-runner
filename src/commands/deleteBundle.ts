import * as vscode from 'vscode';
import { Bundle } from '../core/bundles/types.js';
import { IBundleManager } from '../core/bundles/interfaces.js';
import { showTempNotification } from '../shared/showTempNotification.js';

export async function deleteBundle(bundleManager: IBundleManager, bundle: Bundle) {
  const confirm = await vscode.window.showWarningMessage(
    `Are you sure you want to delete bundle "${bundle.name}"?`,
    'Yes',
    'No'
  );

  if (confirm !== 'Yes') {
    return;
  }

  await bundleManager.deleteBundle(bundle.name);
  showTempNotification(`Bundle "${bundle.name}" deleted successfully`);
}

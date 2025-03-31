import { TreeNode } from '../core/bundles/bundleDataProvider';
import { BundleManager } from '../core/bundles/bundleManager';
import * as vscode from 'vscode';
import { showTempNotification } from '../shared/showTempNotification.js';

export async function selectActiveBundle(
  treeNode: TreeNode,
  bundleManager: BundleManager
): Promise<string | undefined> {
  let activeBundleId = treeNode?.bundleId;

  if (!treeNode) {
    try {
      const { bundles } = await bundleManager.getAllBundles();
      const bundleIds = Object.keys(bundles);

      if (bundleIds.length === 0) {
        showTempNotification(
          'No bundles found. Create a bundle first by selecting files and using "Save as Bundle".'
        );
        return;
      }

      // Create QuickPick items with bundle details and actions
      const items = bundleIds.flatMap(id => {
        const bundle = bundles[id];
        return [
          {
            id: id,
            label: `📦 ${bundle.name}`,
            description: bundle.description || '',
          },
        ];
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a bundle to manage',
        title: 'Manage Repomix Bundles',
      });

      if (!selected) {
        return;
      }

      activeBundleId = selected.id;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to select active bundle: ${error}`);
    }
  }

  await bundleManager.setActiveBundle(activeBundleId);

  return activeBundleId;
}

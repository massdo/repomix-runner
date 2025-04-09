import { BundleManager } from '../core/bundles/bundleManager.js';
import { showTempNotification } from '../shared/showTempNotification.js';
import { TreeNode } from '../core/bundles/bundleDataProvider.js';

export async function deleteBundle(bundleManager: BundleManager, node: TreeNode) {
  await bundleManager.deleteBundle(node.bundleId);
  showTempNotification(`Bundle "${node.label}" deleted successfully`);
}

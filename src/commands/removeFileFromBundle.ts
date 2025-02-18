import { BundleManager } from '../core/bundles/bundleManager';
import { BundleTreeItem } from '../core/bundles/types';

export async function removeFileFromBundle(bundleManager: BundleManager, item: BundleTreeItem) {
  if (!item.filePath || !item.bundle) {
    return;
  }

  const metadata = await bundleManager.getAllBundles();
  const bundle = metadata.bundles[item.bundle.name];

  bundle.files = bundle.files.filter(f => f !== item.filePath);
  await bundleManager.saveBundle(bundle);
}

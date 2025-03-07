import { IBundleManager } from '../core/bundles/interfaces.js';
import { BundleTreeItem } from '../core/bundles/types.js';

export async function removeFileFromBundle(bundleManager: IBundleManager, item: BundleTreeItem) {
  if (!item.filePath || !item.bundle) {
    return;
  }

  const metadata = await bundleManager.getAllBundles();
  const bundle = metadata.bundles[item.bundle.name];

  bundle.files = bundle.files.filter(f => f !== item.filePath);
  await bundleManager.saveBundle(bundle);
}

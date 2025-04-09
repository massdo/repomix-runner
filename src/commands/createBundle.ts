import * as vscode from 'vscode';
import { BundleManager } from '../core/bundles/bundleManager.js';
import { logger } from '../shared/logger.js';
import { showTempNotification } from '../shared/showTempNotification.js';
import { bundleForm } from './utils.js';

export async function createBundle(bundleManager: BundleManager): Promise<boolean> {
  const { bundles } = await bundleManager.getAllBundles();
  const bundleIds = Object.keys(bundles);
  const bundleNames = bundleIds.map(id => bundles[id].name);

  const bundle = await bundleForm(bundleIds, bundleNames);

  if (!bundle) {
    return false;
  }

  try {
    const bundleId = bundle.name + '-' + `${Math.floor(Math.random() * 900) + 100}`;
    await bundleManager.saveBundle(bundleId, bundle);
    await bundleManager.setActiveBundle(bundleId);
    showTempNotification(
      `Bundle "${bundle.name}" created successfully you can now add files to it`
    );
    return true;
  } catch (error) {
    logger.both.error('Failed to save bundle:', error);
    vscode.window.showErrorMessage(`Failed to save bundle: ${error}`);
    return false;
  }
}

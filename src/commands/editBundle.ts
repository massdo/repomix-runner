import * as vscode from 'vscode';
import { BundleManager } from '../core/bundles/bundleManager.js';
import { Bundle } from '../core/bundles/types.js';
import { bundleForm } from './utils.js';

export async function editBundle(deps: {
  bundleManager: BundleManager;
  bundleId: string | undefined;
}) {
  let activeBundle: Bundle | undefined;
  let editedBundle: Bundle | undefined;

  if (!deps.bundleId) {
    await vscode.commands.executeCommand('repomixRunner.selectActiveBundle');
  } else {
    await deps.bundleManager.setActiveBundle(deps.bundleId);
  }

  activeBundle = await deps.bundleManager.getActiveBundle();

  if (!activeBundle) {
    return;
  }

  const { bundles } = await deps.bundleManager.getAllBundles();
  const bundleIds = Object.keys(bundles);
  const bundleNames = bundleIds.map(id => bundles[id].name);
  editedBundle = await bundleForm(bundleIds, bundleNames, {
    existingBundle: activeBundle,
    editionMode: true,
  });

  if (!editedBundle) {
    return;
  }

  const activeBundleId = deps.bundleId || deps.bundleManager.getActiveBundleId();

  if (!activeBundleId) {
    return;
  }

  try {
    await deps.bundleManager.saveBundle(activeBundleId, editedBundle);
  } catch (error) {
    console.error('Failed to edit bundle:', error);
  }
}

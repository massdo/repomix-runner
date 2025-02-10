import * as vscode from 'vscode';
import * as path from 'path';
import { Bundle } from '../core/bundles/types';
import { BundleManager } from '../core/bundles/bundleManager';
import { getCwd } from '../config/getCwd';
import { logger } from '../shared/logger';
import { showTempNotification } from '../shared/showTempNotification';

export async function saveBundle(uris: vscode.Uri[]) {
  if (!uris || uris.length === 0) {
    showTempNotification('Please select files to create a bundle');
    return;
  }

  const cwd = getCwd();
  const bundleManager = new BundleManager(cwd);
  await bundleManager.initialize();

  // Get bundle name from user
  const bundleName = await vscode.window.showInputBox({
    prompt: 'Enter a name for this bundle',
    placeHolder: 'e.g., authentication',
    validateInput: (value) => {
      if (!value) {return 'Bundle name is required';}
      if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
        return 'Bundle name can only contain letters, numbers, hyphens, and underscores';
      }
      return null;
    },
  });

  if (!bundleName) {return;}

  // Optional description
  const description = await vscode.window.showInputBox({
    prompt: 'Enter a description (optional)',
    placeHolder: 'e.g., Core authentication files',
  });

  // Optional tags
  const tagsInput = await vscode.window.showInputBox({
    prompt: 'Enter tags separated by commas (optional)',
    placeHolder: 'e.g., auth, security, core',
  });

  const bundle: Bundle = {
    name: bundleName,
    description: description || undefined,
    created: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    tags: tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [],
    files: uris.map(uri => path.relative(cwd, uri.fsPath)),
  };

  try {
    await bundleManager.saveBundle(bundle);
    showTempNotification(`Bundle "${bundleName}" saved successfully`);
    logger.both.success(`Created bundle "${bundleName}" with ${bundle.files.length} files`);
  } catch (error) {
    logger.both.error('Failed to save bundle:', error);
    vscode.window.showErrorMessage(`Failed to save bundle: ${error}`);
  }
}
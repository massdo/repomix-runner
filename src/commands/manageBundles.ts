import * as vscode from 'vscode';
import { BundleManager } from '../core/bundles/bundleManager.js';
import { getCwd } from '../config/getCwd.js';
import { Bundle } from '../core/bundles/types.js';
import { logger } from '../shared/logger.js';
import { showTempNotification } from '../shared/showTempNotification.js';
import { deleteBundle } from './deleteBundle.js';

export async function manageBundles() {
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

    // Create QuickPick items with bundle details and actions
    const items = bundleNames.flatMap(name => {
      const bundle = metadata.bundles[name];
      return [
        {
          label: `📦 ${name}`,
          description: bundle.description || '',
          detail: `${bundle.files.length} files • ${bundle.tags.join(', ')}`,
          bundle: bundle,
          action: 'view',
        },
        {
          label: `  ✏️ Edit "${name}"`,
          bundle: bundle,
          action: 'edit',
        },
        {
          label: `  🗑️ Delete "${name}"`,
          bundle: bundle,
          action: 'delete',
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

    switch (selected.action) {
      case 'view':
        await viewBundle(selected.bundle);
        break;
      case 'edit':
        await editBundle(bundleManager, selected.bundle);
        break;
      case 'delete':
        await deleteBundle(bundleManager, selected.bundle);
        break;
    }
  } catch (error) {
    logger.both.error('Failed to manage bundles:', error);
    vscode.window.showErrorMessage(`Failed to manage bundles: ${error}`);
  }
}

async function viewBundle(bundle: Bundle) {
  // Create a temporary file to show bundle details
  const content = `# Bundle: ${bundle.name}
Description: ${bundle.description || 'N/A'}
Created: ${new Date(bundle.created).toLocaleString()}
Last Used: ${new Date(bundle.lastUsed).toLocaleString()}
Tags: ${bundle.tags.join(', ') || 'N/A'}

Files:
${bundle.files.map(file => `- ${file}`).join('\n')}
`;

  const doc = await vscode.workspace.openTextDocument({
    content,
    language: 'markdown',
  });
  await vscode.window.showTextDocument(doc);
}

async function editBundle(bundleManager: BundleManager, bundle: Bundle) {
  // Edit name
  const newName = await vscode.window.showInputBox({
    prompt: 'Enter new name for bundle',
    value: bundle.name,
    validateInput: value => {
      if (!value) {
        return 'Bundle name is required';
      }
      if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
        return 'Bundle name can only contain letters, numbers, hyphens, and underscores';
      }
      return null;
    },
  });
  if (!newName) {
    return;
  }

  // Edit description
  const newDescription = await vscode.window.showInputBox({
    prompt: 'Enter new description',
    value: bundle.description,
  });
  if (newDescription === undefined) {
    return;
  }

  // Edit tags
  const newTags = await vscode.window.showInputBox({
    prompt: 'Enter new tags (comma-separated)',
    value: bundle.tags.join(', '),
  });
  if (newTags === undefined) {
    return;
  }

  const updatedBundle: Bundle = {
    ...bundle,
    name: newName,
    description: newDescription || undefined,
    tags: newTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag),
  };

  await bundleManager.saveBundle(updatedBundle);
  if (bundle.name !== newName) {
    await bundleManager.deleteBundle(bundle.name);
  }

  showTempNotification(`Bundle "${newName}" updated successfully`);
}

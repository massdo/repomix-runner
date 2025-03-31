import * as vscode from 'vscode';
import { Bundle } from '../core/bundles/types.js';
import path from 'path';

export async function bundleForm(
  existingBundleIds: string[],
  existingBundleNames: string[],
  options?: {
    existingBundle?: Bundle;
    editionMode?: boolean;
  }
): Promise<Bundle | undefined> {
  let description: string | undefined;
  let configFile: string | undefined;
  let tagsInput: string | undefined;

  const bundleName = await vscode.window.showInputBox({
    prompt: 'Enter a name for this bundle',
    placeHolder: 'e.g., authentication',
    value: options?.existingBundle?.name,
    validateInput: value => {
      if (!value) {
        return 'Bundle name is required';
      }
      if (!/^[a-zA-Z0-9-_.\/]+$/.test(value)) {
        return 'Bundle name can only contain letters, numbers, hyphens, and underscores';
      }
      if (
        (existingBundleIds.includes(value) || existingBundleNames.includes(value)) &&
        value !== options?.existingBundle?.name
      ) {
        return `Bundle with name ${value} already exists`;
      }
      return null;
    },
  });

  if (!bundleName) {
    return undefined;
  }

  if (options?.editionMode) {
    configFile = await askForConfig(options?.existingBundle?.configPath);

    if (configFile === undefined) {
      return undefined;
    }

    description = await vscode.window.showInputBox({
      prompt: '(OPTIONAL) Enter a description',
      placeHolder: 'e.g., Core authentication files',
      value: options?.existingBundle?.description,
    });

    if (description === undefined) {
      return undefined;
    }

    tagsInput = await vscode.window.showInputBox({
      prompt: '(OPTIONAL) Enter tags separated by commas',
      placeHolder: 'e.g., auth, security, core',
      value: options?.existingBundle?.tags?.join(', '),
    });

    if (tagsInput === undefined) {
      return undefined;
    }
  }

  return {
    name: bundleName,
    description: description || undefined,
    configPath: configFile || undefined,
    created: options?.existingBundle?.created ?? new Date().toISOString(),
    lastUsed: new Date().toISOString(),
    tags: tagsInput
      ? tagsInput.split(',').map(tag => tag.trim())
      : options?.existingBundle?.tags ?? [],
    files: options?.existingBundle?.files ?? [],
  };
}

/**
 * Prompts the user to select a repomix config file from the workspace.
 * @param {string} value - The relative path of the config file to highlight.
 * @returns {Promise<string | undefined>} The relative path of the selected config file, or undefined if no file is selected.
 */
export async function askForConfig(value?: string): Promise<string | undefined> {
  const normalizedValue = path.normalize(value ?? '');
  const potentialConfigFiles = await vscode.workspace.findFiles(
    '**/*repomix.config.json',
    '**/node_modules/**'
  );

  if (!potentialConfigFiles.length) {
    vscode.window.showWarningMessage('No config files found in your workspace.');
    return;
  }

  const configItems = potentialConfigFiles.map(uri => ({
    label: vscode.workspace.asRelativePath(uri.fsPath),
    uri: uri,
    isCurrent: normalizedValue === vscode.workspace.asRelativePath(uri.fsPath),
  }));

  const noFileOption = {
    label: 'No config file',
    uri: undefined,
    isCurrent: false,
  };

  const sortedConfigItems = configItems.sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) {
      return -1;
    }
    if (!a.isCurrent && b.isCurrent) {
      return 1;
    }
    return 0;
  });

  const finalConfigItems =
    sortedConfigItems.length && sortedConfigItems[0].isCurrent
      ? [sortedConfigItems[0], noFileOption, ...sortedConfigItems.slice(1)]
      : [noFileOption, ...sortedConfigItems];

  const configForm = await vscode.window.showQuickPick(
    finalConfigItems.map(item => ({
      label: item.isCurrent ? `${item.label} (CURRENT)` : item.label,
      uri: item.uri,
    })),
    {
      placeHolder: '(OPTIONAL)  e.g. .repomix/repomix.config.json',
      title: '(OPTIONAL) Select a repomix config file...',
    }
  );

  if (!configForm) {
    return undefined;
  }

  if (configForm.label === 'No config file') {
    return '';
  }

  return vscode.workspace.asRelativePath(configForm.uri!.fsPath);
}

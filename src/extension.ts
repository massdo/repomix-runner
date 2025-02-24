import * as vscode from 'vscode';
import { runRepomix } from './commands/runRepomix.js';
import { openSettings } from './commands/openSettings.js';
import { openOutput } from './commands/openOutput.js';
import { runRepomixOnOpenFiles } from './commands/runRepomixOnOpenFiles.js';
import { getCwd } from './config/getCwd.js';
import { tempDirManager } from './core/files/tempDirManager.js';
import { runRepomixOnSelectedFiles } from './commands/runRepomixOnSelectedFiles.js';
import { saveBundle } from './commands/saveBundle.js';
import { runBundle } from './commands/runBundle.js';
import { manageBundles } from './commands/manageBundles.js';
import { bundleTreeProvider } from './core/bundles/bundleTreeProvider.js';
import { BundleManager } from './core/bundles/bundleManager.js';
import { BundleTreeItem } from './core/bundles/types.js';
import { deleteBundle } from './commands/deleteBundle.js';
import { removeFileFromBundle } from './commands/removeFileFromBundle.js';

export function activate(context: vscode.ExtensionContext) {
  const bundleManager = new BundleManager(getCwd());

  const runRepomixCommand = vscode.commands.registerCommand(
    'repomixRunner.run',
    (uri?: vscode.Uri) => {
      let targetDir = uri?.fsPath;

      if (!targetDir) {
        targetDir = getCwd();
      }

      runRepomix(targetDir, tempDirManager.getTempDir());
    }
  );

  const runRepomixOnOpenFilesCommand = vscode.commands.registerCommand(
    'repomixRunner.runOnOpenFiles',
    runRepomixOnOpenFiles
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    'repomixRunner.openSettings',
    openSettings
  );

  const openOutputCommand = vscode.commands.registerCommand('repomixRunner.openOutput', openOutput);

  const runRepomixOnSelectedFilesCommand = vscode.commands.registerCommand(
    'repomixRunner.runOnSelectedFiles',
    (uri: vscode.Uri, uris: vscode.Uri[]) => {
      // When right-clicking, if multiple files are selected, VS Code passes them as the second parameter
      // If only one file is selected, it comes as the first parameter
      const selectedUris = uris || (uri ? [uri] : []);
      runRepomixOnSelectedFiles(selectedUris);
    }
  );

  const saveBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.saveBundle',
    async (uri: vscode.Uri, uris: vscode.Uri[]) => {
      // Get selected files from the explorer
      let selectedUris: vscode.Uri[] = [];

      if (uris && uris.length > 0) {
        // Multiple files selected
        selectedUris = uris;
      } else if (uri) {
        // Single file selected
        selectedUris = [uri];
      } else {
        // Try to get the current selection
        selectedUris = vscode.window.activeTextEditor
          ? [vscode.window.activeTextEditor.document.uri]
          : [];
      }

      if (selectedUris.length === 0) {
        vscode.window.showWarningMessage('Please select one or more files first');
        return;
      }

      await saveBundle(selectedUris);
    }
  );

  const runBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.runBundle',
    async (param?: BundleTreeItem) => {
      if (!param) {
        const selectedBundle = await bundleManager.selectBundle();
        if (!selectedBundle) {
          return;
        }
        return runBundle(selectedBundle);
      }
      return runBundle(param.bundle);
    }
  );

  const deleteBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.deleteBundle',
    async (param: BundleTreeItem) => {
      await deleteBundle(bundleManager, param.bundle);
    }
  );

  const manageBundlesCommand = vscode.commands.registerCommand(
    'repomixRunner.manageBundles',
    manageBundles
  );

  const removeFileFromBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.removeFileFromBundle',
    async (item: BundleTreeItem) => {
      await removeFileFromBundle(bundleManager, item);
    }
  );

  // Create and register the bundle tree view
  const bundleTreeView = vscode.window.createTreeView('repomixBundles', {
    treeDataProvider: bundleTreeProvider,
    showCollapseAll: true,
  });

  context.subscriptions.push(
    runRepomixCommand,
    openSettingsCommand,
    openOutputCommand,
    runRepomixOnOpenFilesCommand,
    runRepomixOnSelectedFilesCommand,
    saveBundleCommand,
    runBundleCommand,
    manageBundlesCommand,
    deleteBundleCommand,
    removeFileFromBundleCommand,
    bundleTreeView
  );

  // Register bundle refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand('repomixRunner.refreshBundles', () => {
      bundleTreeProvider.refresh();
    })
  );
}

export function deactivate() {
  tempDirManager.cleanup();
}

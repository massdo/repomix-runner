import * as vscode from 'vscode';
import { runRepomix } from './commands/runRepomix.js';
import { openSettings } from './commands/openSettings.js';
import { openOutput } from './commands/openOutput.js';
import { runRepomixOnOpenFiles } from './commands/runRepomixOnOpenFiles.js';
import { getCwd } from './config/getCwd.js';
import { tempDirManager } from './core/files/tempDirManager.js';
import { runRepomixOnSelectedFiles } from './commands/runRepomixOnSelectedFiles.js';
import { runBundle } from './commands/runBundle.js';
import { deleteBundle } from './commands/deleteBundle.js';
import { BundleDataProvider, TreeNode } from './core/bundles/bundleDataProvider.js';
import { BundleManager } from './core/bundles/bundleManager.js';
import { BundleFileDecorationProvider } from './core/bundles/bundleFileDecorationProvider.js';
import { selectActiveBundle } from './commands/selectActiveBundle.js';
import { createBundle } from './commands/createBundle.js';
import {
  addFilesToActiveBundle,
  removeFilesFromActiveBundle,
} from './commands/mutateActiveBundle.js';
import { editBundle } from './commands/editBundle.js';
import { goToConfigFile } from './commands/goToConfigFile.js';
import { RepomixWebviewProvider } from './webview/RepomixWebviewProvider.js';
import { createSmartRepomixGraph } from './agent/graph.js';
import { logger } from './shared/logger.js';

export function activate(context: vscode.ExtensionContext) {
  const cwd = getCwd();
  const bundleManager = new BundleManager(cwd);

  const bundleDataProvider = new BundleDataProvider(bundleManager);
  const decorationProvider = new BundleFileDecorationProvider(bundleDataProvider);
  const bundleTreeView = vscode.window.createTreeView('repomixBundles', {
    treeDataProvider: bundleDataProvider,
    showCollapseAll: true,
  });

  // Init to avoid circular dependency
  bundleDataProvider.setTreeView(bundleTreeView);
  bundleDataProvider.setDecorationProvider(decorationProvider);

  const decorationProviderSubscription =
    vscode.window.registerFileDecorationProvider(decorationProvider);

  const provider = new RepomixWebviewProvider(context.extensionUri, bundleManager, context);

  const webviewViewSubscription = vscode.window.registerWebviewViewProvider(
    RepomixWebviewProvider.viewType,
    provider
  );

  const addSelectedFilesToNewBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.addSelectedFilesToNewBundle',
    async (uri: vscode.Uri, uris: vscode.Uri[]) => {
      const selectedUris = uris || (uri ? [uri] : []);

      const isBundleCreated = await createBundle(bundleManager);

      if (!isBundleCreated) {
        return;
      }

      await addFilesToActiveBundle(selectedUris, {
        bundleManager: bundleManager,
        cwd,
      });
    }
  );

  const addSelectedFilesToActiveBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.addSelectedFilesToActiveBundle',
    async (uri: vscode.Uri, uris: vscode.Uri[]) => {
      const selectedUris = uris || (uri ? [uri] : []);

      await addFilesToActiveBundle(selectedUris, {
        bundleManager: bundleManager,
        cwd,
      });
    }
  );

  const removeSelectedFilesFromExplorerToActiveBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.removeSelectedFilesFromActiveBundle',
    async (uri: vscode.Uri, uris: vscode.Uri[]) => {
      const selectedUris = uris || (uri ? [uri] : []);

      await removeFilesFromActiveBundle(selectedUris, {
        bundleManager: bundleManager,
        cwd,
      });
    }
  );

  const removeSelectedFilesFromCustomViewToActiveBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.removeSelectedFilesFromCustomViewToActiveBundle',
    async (node: TreeNode) => {
      if (!node || !node.resourceUri) {
        return;
      }

      const uri = node.resourceUri;

      await removeFilesFromActiveBundle([uri], {
        bundleManager: bundleManager,
        cwd,
      });
    }
  );

  const createBundleCommand = vscode.commands.registerCommand('repomixRunner.createBundle', () => {
    createBundle(bundleManager);
  });

  const editBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.editBundle',
    (node: TreeNode) => {
      editBundle({ bundleManager, bundleId: node?.bundleId });
    }
  );

  const runRepomixCommand = vscode.commands.registerCommand('repomixRunner.run', () =>
    runRepomix()
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
      const selectedUris = uris || (uri ? [uri] : []);
      runRepomixOnSelectedFiles(selectedUris);
    }
  );

  const runBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.runBundle',
    async node => {
      let activeBundleId = node?.bundleId;

      if (!node) {
        activeBundleId = await selectActiveBundle(node, bundleManager);
      } else {
        bundleManager.setActiveBundle(activeBundleId);
      }

      if (!activeBundleId) {
        return;
      }

      await runBundle(bundleManager, activeBundleId);
    }
  );

  const deleteBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.deleteBundle',
    async node => {
      await deleteBundle(bundleManager, node);
    }
  );

  const selectActiveBundleCommand = vscode.commands.registerCommand(
    'repomixRunner.selectActiveBundle',
    async (treeNode: TreeNode) => {
      await selectActiveBundle(treeNode, bundleManager);
    }
  );

  const refreshBundlesCommand = vscode.commands.registerCommand(
    'repomixRunner.refreshBundles',
    () => {
      bundleDataProvider.forceRefresh();
    }
  );

  const goToConfigFileCommand = vscode.commands.registerCommand(
    'repomixRunner.goToConfigFile',
    async (node: TreeNode) => {
      await goToConfigFile(node.bundleId, {
        cwd,
        bundleManager,
      });
    }
  );

  const smartRunCommand = vscode.commands.registerCommand('repomixRunner.smartRun', async () => {
    // 1. Get the Workspace Root
    let workspaceRoot: string;
    try {
      workspaceRoot = getCwd();
    } catch (error) {
      logger.both.error("Smart Agent: Failed to get workspace root", error);
      vscode.window.showErrorMessage("Could not determine workspace root.");
      return;
    }

    // 2. Capture User Query
    let userQuery: string | undefined;
    while (!userQuery) {
      userQuery = await vscode.window.showInputBox({
        title: "Smart Repomix Agent",
        prompt: "Describe what you want to package",
        placeHolder: "e.g., 'All authentication logic excluding tests'",
        ignoreFocusOut: true
      });
      if (userQuery === undefined) {
        return;
      }
    }

    // 2. Get API Key (Secrets > Prompt)
    const apiKey = await context.secrets.get('repomix.agent.googleApiKey');

    // 3. Run the Agent with Progress Indication
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: "Repomix Agent",
      cancellable: true
    }, async (progress, token) => {
      progress.report({ message: "Initializing agent..." });

      try {
        // Initialize the Graph
        const app = createSmartRepomixGraph();

        // Prepare Initial State
        const inputs = {
          userQuery: userQuery,
          workspaceRoot: workspaceRoot,
          allFilePaths: [],
          candidateFiles: [],
          confirmedFiles: [],
          finalCommand: ""
        };

        // Run the Graph
        // We pass a dummy thread_id required by LangGraph checkpointers (even if in-memory)
        const config = { configurable: { thread_id: "1" } };

        // Invoke the agent
        progress.report({ message: "Thinking & Filtering files..." });

        const finalState = await app.invoke(inputs, config);

        // Success Message
        const fileCount = finalState.confirmedFiles.length;
        if (fileCount > 0) {
          vscode.window.showInformationMessage(
            `Agent run complete! Packaged ${fileCount} files based on: "${userQuery}"`
          );
        } else {
          vscode.window.showWarningMessage(
            `No relevant files found for: "${userQuery}"`
          );
        }

      } catch (error: any) {
        logger.both.error("Smart Agent Failed:", error);

        // specific error handling for missing API key
        if (error.message.includes("Google API Key")) {
          const selection = await vscode.window.showErrorMessage(
            "Google API Key missing.",
            "Open Settings"
          );
          if (selection === "Open Settings") {
            vscode.commands.executeCommand('workbench.action.openSettings', 'repomix.agent.googleApiKey');
          }
        } else {
          vscode.window.showErrorMessage(`Agent failed: ${error.message}`);
        }
      }
    });
  });

  // Ajouter toutes les souscriptions au contexte
  context.subscriptions.push(
    goToConfigFileCommand,
    runRepomixCommand,
    openSettingsCommand,
    openOutputCommand,
    runRepomixOnOpenFilesCommand,
    runRepomixOnSelectedFilesCommand,
    runBundleCommand,
    editBundleCommand,
    deleteBundleCommand,
    selectActiveBundleCommand,
    createBundleCommand,
    decorationProviderSubscription,
    webviewViewSubscription,
    bundleTreeView,
    addSelectedFilesToActiveBundleCommand,
    addSelectedFilesToNewBundleCommand,
    removeSelectedFilesFromExplorerToActiveBundleCommand,
    removeSelectedFilesFromCustomViewToActiveBundleCommand,
    refreshBundlesCommand,
    smartRunCommand
  );
}

export function deactivate() {
  tempDirManager.cleanup();
}

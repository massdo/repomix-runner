import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BundleManager } from '../core/bundles/bundleManager.js';
import { runBundle } from '../commands/runBundle.js';
import { runRepomix, defaultRunRepomixDeps } from '../commands/runRepomix.js';
import { resolveBundleOutputPath } from '../core/files/outputPathResolver.js';
import { calculateBundleStats, invalidateStatsCache } from '../core/files/fileStats.js';
import { getCwd } from '../config/getCwd.js';
import { WebviewBundle } from '../core/bundles/types.js';
import { copyToClipboard } from '../core/files/copyToClipboard.js';
import { tempDirManager } from '../core/files/tempDirManager.js';
import { mergeConfigs, readRepomixFileConfig, readRepomixRunnerVscodeConfig } from '../config/configLoader.js';
import { WebviewMessageSchema } from './messageSchemas.js';

const DEFAULT_REPOMIX_ID = '__default__';

interface QueueItem {
  bundleId: string;
  compress?: boolean;
}

export class RepomixWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'repomixRunner.controlPanel';
  private _view?: vscode.WebviewView;
  private _executionQueue: QueueItem[] = [];
  private _isProcessingQueue = false;
  private _runningBundles: Map<string, AbortController> = new Map();
  private _outputFileWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
  private _defaultRepomixWatcher?: vscode.FileSystemWatcher;
  private _lastWatchedRepomixOutputPath?: string;
  private _debounceTimer?: NodeJS.Timeout;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _bundleManager: BundleManager,
    private readonly _context: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist')],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      let message;
      try {
        message = WebviewMessageSchema.parse(data);
      } catch (error) {
        console.error('Invalid webview message:', error);
        return;
      }

      switch (message.command) {
        case 'webviewLoaded': {
          await this._sendBundles();
          await this._sendDefaultRepomixState();
          await this._sendVersion();
          break;
        }
        case 'runBundle': {
          const { bundleId, compress } = message;
          await this._handleRunBundle(bundleId, compress);
          break;
        }
        case 'cancelBundle': {
          const { bundleId } = message;
          await this._handleCancelBundle(bundleId);
          break;
        }
        case 'copyBundleOutput': {
          const { bundleId } = message;
          await this._handleCopyBundleOutput(bundleId);
          break;
        }
        case 'runDefaultRepomix': {
          const { compress } = message;
          await this._handleRunDefaultRepomix(compress);
          break;
        }
        case 'cancelDefaultRepomix': {
          await this._handleCancelDefaultRepomix();
          break;
        }
        case 'copyDefaultRepomixOutput': {
          await this._handleCopyDefaultRepomixOutput();
          break;
        }
        case 'checkApiKey': {
          const key = await this._context.secrets.get('repomix.agent.googleApiKey');
          this._view?.webview.postMessage({
            command: 'apiKeyStatus',
            hasKey: !!key
          });
          break;
        }
        case 'saveApiKey': {
          const { apiKey } = message;
          await this._handleSaveApiKey(apiKey);
          break;
        }
        case 'runSmartAgent': {
          const { query } = message;
          await this._handleRunSmartAgent(query);
          break;
        }
      }
    });

    // Listen for bundle changes
    const changeSubscription = this._bundleManager.onDidChangeBundles.event(() => {
      invalidateStatsCache(); // Invalidate stats when bundles change
      if (this._view?.visible) {
        this._sendBundles();
      }
    });

    // Listen for window focus to re-check file existence
    const focusSubscription = vscode.window.onDidChangeWindowState((e) => {
       if (e.focused && this._view?.visible) {
         this._sendBundles();
         this._sendDefaultRepomixState();
       }
    });

    // Clean up subscription when webview is disposed
    webviewView.onDidDispose(() => {
      changeSubscription.dispose();
      focusSubscription.dispose();
      this._disposeWatchers();
    });

    // Initial state send
    if (this._view?.visible) {
        this._sendDefaultRepomixState();
    }
  }

  private _disposeWatchers() {
      this._outputFileWatchers.forEach(w => w.dispose());
      this._outputFileWatchers.clear();
      this._defaultRepomixWatcher?.dispose();
      if (this._debounceTimer) {
          clearTimeout(this._debounceTimer);
      }
  }

  private async _resolveDefaultRepomixOutputPath(): Promise<string> {
      const cwd = getCwd();
      const vscodeConfig = readRepomixRunnerVscodeConfig();
      const configFile = await readRepomixFileConfig(cwd);
      const mergedConfig = await mergeConfigs(cwd, configFile, vscodeConfig, null);
      return mergedConfig.output.filePath;
  }

  private _debouncedSendDefaultRepomixState() {
      if (this._debounceTimer) {
          clearTimeout(this._debounceTimer);
      }
      this._debounceTimer = setTimeout(() => {
          this._sendDefaultRepomixState();
      }, 500); // Debounce for 500ms
  }

  private async _sendDefaultRepomixState() {
      if (!this._view) {
          return;
      }
      try {
          const outputPath = await this._resolveDefaultRepomixOutputPath();
          const exists = fs.existsSync(outputPath);

          // Update watcher only if path changed
          if (outputPath !== this._lastWatchedRepomixOutputPath) {
              if (this._defaultRepomixWatcher) {
                 this._defaultRepomixWatcher.dispose();
              }

              const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path.dirname(outputPath), path.basename(outputPath)));
              watcher.onDidCreate(() => this._debouncedSendDefaultRepomixState());
              watcher.onDidDelete(() => this._debouncedSendDefaultRepomixState());
              this._defaultRepomixWatcher = watcher;
              this._lastWatchedRepomixOutputPath = outputPath;
          }

          this._view.webview.postMessage({
              command: 'updateDefaultRepomix',
              data: {
                  outputFileExists: exists,
                  outputFilePath: outputPath
              }
          });

      } catch (e) {
          console.error('Failed to send default repomix state:', e);
      }
  }

  private async _sendBundles() {
    if (!this._view) {
      return;
    }
    const bundleMetadata = await this._bundleManager.getAllBundles();
    const cwd = getCwd();

    this._outputFileWatchers.forEach(w => w.dispose());
    this._outputFileWatchers.clear();

    const webviewBundles: WebviewBundle[] = await Promise.all(
        Object.entries(bundleMetadata.bundles).map(async ([id, bundle]) => {
            const outputPath = await resolveBundleOutputPath(bundle);
            const exists = fs.existsSync(outputPath);

            // Watch for changes on this file
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path.dirname(outputPath), path.basename(outputPath)));
            watcher.onDidCreate(() => this._sendBundles());
            watcher.onDidDelete(() => this._sendBundles());
            // watcher.onDidChange(() => this._sendBundles()); // Maybe overkill?
            this._outputFileWatchers.set(id, watcher);

            // Calculate stats
            const stats = await calculateBundleStats(cwd, id, bundle.files);

            return {
                id,
                ...bundle,
                outputFilePath: outputPath,
                outputFileExists: exists,
                stats
            };
        })
    );

    this._view.webview.postMessage({
      command: 'updateBundles',
      bundles: webviewBundles,
    });
  }

  private async _sendVersion() {
    if (!this._view) {
      return;
    }
    try {
      const packageJsonPath = vscode.Uri.joinPath(this._extensionUri, 'package.json');
      const packageJsonData = await vscode.workspace.fs.readFile(packageJsonPath);
      const packageJson = JSON.parse(Buffer.from(packageJsonData).toString());
      const version = packageJson.version;

      this._view.webview.postMessage({
        command: 'updateVersion',
        version,
      });
    } catch (error) {
      console.error('Failed to get version:', error);
    }
  }

  private async _handleCopyBundleOutput(bundleId: string) {
    const bundle = await this._bundleManager.getBundle(bundleId);
    if (!bundle) {return;}

    try {
        const outputPath = await resolveBundleOutputPath(bundle);
        if (!fs.existsSync(outputPath)) {
            vscode.window.showErrorMessage(`Output file not found: ${outputPath}`);
            return;
        }

        const tmpFilePath = path.join(
            tempDirManager.getTempDir(),
            `${Date.now().toString().slice(-3)}_${path.basename(outputPath)}`
        );

        await copyToClipboard(outputPath, tmpFilePath);
        vscode.window.showInformationMessage(`Copied "${path.basename(outputPath)}" to clipboard.`);

        await tempDirManager.cleanupFile(tmpFilePath);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to copy output: ${errorMessage}`);
    }
  }

  private async _handleCopyDefaultRepomixOutput() {
      try {
          const outputPath = await this._resolveDefaultRepomixOutputPath();
          if (!fs.existsSync(outputPath)) {
              vscode.window.showErrorMessage(`Output file not found: ${outputPath}`);
              return;
          }
          const tmpFilePath = path.join(
            tempDirManager.getTempDir(),
            `${Date.now().toString().slice(-3)}_${path.basename(outputPath)}`
          );

          await copyToClipboard(outputPath, tmpFilePath);
          vscode.window.showInformationMessage(`Copied "${path.basename(outputPath)}" to clipboard.`);
          await tempDirManager.cleanupFile(tmpFilePath);

      } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          vscode.window.showErrorMessage(`Failed to copy output: ${errorMessage}`);
      }
  }

  private async _handleRunDefaultRepomix(compress?: boolean) {
      if (!this._view) { return; }

      // Add to queue
      this._executionQueue.push({ bundleId: DEFAULT_REPOMIX_ID, compress });

      // Notify queued
      this._view.webview.postMessage({
        command: 'executionStateChange',
        bundleId: DEFAULT_REPOMIX_ID,
        status: 'queued',
      });

      vscode.window.showInformationMessage(`Default Repomix run queued${compress ? ' (compressed)' : ''}.`);
      this._processQueue();
  }

  private async _handleCancelDefaultRepomix() {
     await this._handleCancelBundle(DEFAULT_REPOMIX_ID);
  }

  private async _handleRunBundle(bundleId: string, compress?: boolean) {
    if (!this._view) {
      return;
    }

    // Add to queue
    this._executionQueue.push({ bundleId, compress });

    // Notify queued
    this._view.webview.postMessage({
      command: 'executionStateChange',
      bundleId,
      status: 'queued',
    });

    // Get bundle name for notification
    const bundle = await this._bundleManager.getBundle(bundleId);
    const bundleName = bundle?.name ?? "Unknown Bundle";

    vscode.window.showInformationMessage(`Bundle "${bundleName}" queued${compress ? ' (compressed)' : ''}.`);

    this._processQueue();
  }

  private async _handleCancelBundle(bundleId: string) {
    // Case 1: Bundle is currently running
    const controller = this._runningBundles.get(bundleId);
    if (controller) {
        controller.abort();
        // The _processQueue loop will handle the cleanup and notification via catch/finally
        // But we can notify immediately that cancellation was requested
        let name = "Unknown";
        if (bundleId === DEFAULT_REPOMIX_ID) {
            name = "Default Repomix";
        } else {
            const bundle = await this._bundleManager.getBundle(bundleId);
            name = bundle?.name ?? "Unknown Bundle";
        }
        vscode.window.showInformationMessage(`Cancelling "${name}"...`);
        return;
    }

    // Case 2: Bundle is in the queue (waiting)
    const queueIndex = this._executionQueue.findIndex(item => item.bundleId === bundleId);
    if (queueIndex !== -1) {
      this._executionQueue.splice(queueIndex, 1);

      if (this._view) {
        this._view.webview.postMessage({
            command: 'executionStateChange',
            bundleId,
            status: 'idle',
        });
      }

      let name = "Unknown";
      if (bundleId === DEFAULT_REPOMIX_ID) {
          name = "Default Repomix";
      } else {
          const bundle = await this._bundleManager.getBundle(bundleId);
          name = bundle?.name ?? "Unknown Bundle";
      }
      vscode.window.showInformationMessage(`"${name}" removed from queue.`);
      return;
    }
  }

  private async _processQueue() {
    if (this._isProcessingQueue) {
      return;
    }

    this._isProcessingQueue = true;

    while (this._executionQueue.length > 0) {
      const queueItem = this._executionQueue[0];
      const { bundleId, compress } = queueItem;

      if (!this._view) {
        break;
      }

      // Notify running
      this._view.webview.postMessage({
        command: 'executionStateChange',
        bundleId,
        status: 'running',
      });

      const isDefault = bundleId === DEFAULT_REPOMIX_ID;
      let bundleName = "Default Repomix";
      if (!isDefault) {
          const bundle = await this._bundleManager.getBundle(bundleId);
          bundleName = bundle ? `Bundle "${bundle.name}"` : "Unknown Bundle";
      }

      vscode.window.showInformationMessage(`Starting ${bundleName}${compress ? ' (compressed)' : ''}...`);

      const controller = new AbortController();
      this._runningBundles.set(bundleId, controller);

      try {
        if (isDefault) {
            await runRepomix({
              ...defaultRunRepomixDeps,
              mergeConfigOverride: compress ? { output: { compress: true } } : null,
              signal: controller.signal,
            });
            this._sendDefaultRepomixState();
        } else {
            // Need to update runBundle signature to accept overrides or compress flag
            const overrides = compress ? { output: { compress: true } } : undefined;
            await runBundle(this._bundleManager, bundleId, controller.signal, overrides);
            // Refresh bundles to update "exists" status for the newly generated file
            this._sendBundles();
        }

        vscode.window.showInformationMessage(`${bundleName} completed successfully.`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage === 'Aborted' || (error instanceof Error && error.name === 'AbortError')) {
            vscode.window.showInformationMessage(`${bundleName} was cancelled.`);
        } else {
            console.error('Error running from webview:', error);
            vscode.window.showErrorMessage(`Failed to run: ${errorMessage}`);
        }
      } finally {
        // Cleanup
        this._runningBundles.delete(bundleId);

        // Remove from queue - ONLY if it's still the head (safe check)
        // Note: queueItem is the object ref, but check index 0 just to be safe
        if (this._executionQueue.length > 0 && this._executionQueue[0] === queueItem) {
             this._executionQueue.shift();
        }

        // Notify idle
        if (this._view) {
          this._view.webview.postMessage({
            command: 'executionStateChange',
            bundleId,
            status: 'idle',
          });
        }
      }
    }

    this._isProcessingQueue = false;
  }

  private async _handleCheckApiKey(): Promise<boolean> {
    const apiKey = await this._context.secrets.get('repomix.agent.googleApiKey');
    return !!apiKey;
  }

  private async _handleSaveApiKey(apiKey: string) {
    if (apiKey) {
      await this._context.secrets.store('repomix.agent.googleApiKey', apiKey);
      vscode.window.showInformationMessage('API Key saved successfully!');
    }
  }

  private async _handleRunSmartAgent(query: string) {
    const workspaceRoot = getCwd();

    // Check for API key first
    let apiKey = await this._context.secrets.get('repomix.agent.googleApiKey');
    if (!apiKey) {
      // Fallback to config
      apiKey = vscode.workspace.getConfiguration('repomix.agent').get<string>('googleApiKey');
    }

    if (!apiKey) {
      vscode.window.showErrorMessage("Google API Key missing. Please set it in the 'Smart Agent' tab.");
      return;
    }

    // Notify webview that agent is running
    if (this._view) {
      this._view.webview.postMessage({ command: 'agentStateChange', status: 'running' });
    }

    try {
      const { createSmartRepomixGraph } = await import('../agent/graph.js');
      const app = createSmartRepomixGraph();

      const inputs = {
        apiKey: apiKey,
        userQuery: query,
        workspaceRoot: workspaceRoot,
        allFilePaths: [],
        candidateFiles: [],
        confirmedFiles: [],
        finalCommand: ""
      };

      const config = { configurable: { thread_id: "1" } };
      const finalState = await app.invoke(inputs, config);

      const count = finalState.confirmedFiles.length;
      if (count > 0) {
        vscode.window.showInformationMessage(`Agent packaged ${count} files.`);
      } else {
        vscode.window.showWarningMessage("No relevant files found.");
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Agent failed: ${error.message}`);
    } finally {
      // Notify webview that agent is done
      if (this._view) {
        this._view.webview.postMessage({ command: 'agentStateChange', status: 'idle' });
      }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview.js')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Repomix Runner Control Panel</title>
      </head>
      <body>
        <div id="root"></div>
        <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { BundleManager } from './bundleManager';
import { Bundle } from './types';
import { BundleFileDecorationProvider } from './bundleFileDecorationProvider';

export interface TreeNode {
  bundleId: string;
  label: string;
  resourceUri?: vscode.Uri;
  isDirectory?: boolean;
  children?: TreeNode[];
  missing?: boolean;
}

export class BundleDataProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  public bundles: { [key: string]: Bundle } = {};
  private _treeRoots: { [key: string]: TreeNode } = {};
  private _isLoading = true;
  private _terminalFileUris: Set<string> = new Set();
  private _decorationProvider: BundleFileDecorationProvider | undefined;
  private _activeBundleId: string | null = null;

  constructor(private _bundleExplorerManager: BundleManager) {
    this._activeBundleId = this._bundleExplorerManager.getActiveBundleId();

    this._bundleExplorerManager.onDidChangeBundles.event(() => {
      this._decorationProvider!.refresh();
      this.initialize();
    });

    this._bundleExplorerManager.onDidChangeActiveBundle.event(bundleId => {
      this._activeBundleId = bundleId;
      this._decorationProvider!.refresh();
      this.refresh();
    });

    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    watcher.onDidDelete(uri => this._handleFileDeletion(uri));

    this.initialize();
  }

  public async initialize(): Promise<void> {
    await this._loadBundles();
    this._isLoading = false;
    this.refresh();
  }

  public setTreeView(treeView: vscode.TreeView<TreeNode>) {
    treeView.onDidChangeCheckboxState(event => {
      const [treeItem, checkboxState] = event.items[0];
      if (checkboxState === vscode.TreeItemCheckboxState.Checked) {
        this._bundleExplorerManager.setActiveBundle(treeItem.bundleId);
      } else {
        this._bundleExplorerManager.setActiveBundle(null);
      }
    });
  }

  public setDecorationProvider(decorationProvider: BundleFileDecorationProvider) {
    this._decorationProvider = decorationProvider;
  }

  private async _loadBundles() {
    try {
      const { bundles } = await this._bundleExplorerManager.getAllBundles();
      this.bundles = bundles;
      await this._buildTreeRoots();
    } catch (error) {
      this.bundles = {};
      this._treeRoots = {};
    }
  }

  private async _buildTreeRoots() {
    this._treeRoots = {};
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }
    for (const [bundleId, bundle] of Object.entries(this.bundles)) {
      const root: TreeNode = {
        bundleId: bundleId,
        label: bundle.name,
        isDirectory: true,
        children: [],
      };
      for (const filePath of bundle.files) {
        await this._addPathToTree(root, filePath, workspaceFolder.uri);
      }
      this._treeRoots[bundleId] = root;
    }
  }

  private async _addPathToTree(root: TreeNode, filePath: string, workspaceUri: vscode.Uri) {
    const parts = filePath.split('/');
    let current = root;
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = path.join(currentPath, part);
      const uri = vscode.Uri.joinPath(workspaceUri, currentPath);
      if (i === parts.length - 1) {
        try {
          const stat = await fs.stat(uri.fsPath);
          const isDirectory = stat.isDirectory();
          const item: TreeNode = {
            bundleId: root.bundleId,
            label: part,
            resourceUri: uri,
            isDirectory,
            children: isDirectory ? [] : undefined,
          };
          current.children!.push(item);
          if (isDirectory) {
            await this._populateDirectory(item, uri);
          }
        } catch (error) {
          current.children!.push({
            bundleId: root.bundleId,
            label: part,
            resourceUri: uri,
            isDirectory: false,
            missing: true,
          });
        }
      } else {
        let child = current.children!.find(c => c.label === part);
        if (!child) {
          child = {
            bundleId: root.bundleId,
            label: part,
            resourceUri: uri,
            isDirectory: true,
            children: [],
          };
          current.children!.push(child);
        }
        current = child;
      }
    }
  }

  private async _populateDirectory(dirItem: TreeNode, dirUri: vscode.Uri) {
    try {
      const entries = await fs.readdir(dirUri.fsPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryUri = vscode.Uri.joinPath(dirUri, entry.name);
        const isDirectory = entry.isDirectory();
        const child: TreeNode = {
          bundleId: dirItem.bundleId,
          label: entry.name,
          resourceUri: entryUri,
          isDirectory,
          children: isDirectory ? [] : undefined,
        };
        dirItem.children!.push(child);
        if (isDirectory) {
          await this._populateDirectory(child, entryUri);
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la lecture du répertoire ${dirUri.fsPath} :`, error);
    }
  }

  private _handleFileDeletion(uri: vscode.Uri) {
    const relativePath = vscode.workspace.asRelativePath(uri);
    let shouldRefresh = false;
    for (const bundle of Object.values(this.bundles)) {
      if (bundle.files.some(file => file.startsWith(relativePath))) {
        shouldRefresh = true;
        break;
      }
    }
    if (shouldRefresh) {
      this._loadBundles().then(() => {
        this._onDidChangeTreeData.fire(undefined);
      });
    }
  }

  // Détermine l'état collapsible en fonction des nœuds expandés
  private _determineCollapsibleState(element: TreeNode): vscode.TreeItemCollapsibleState {
    if (element.children && element.children.length > 0) {
      return vscode.TreeItemCollapsibleState.Collapsed;
    }
    return vscode.TreeItemCollapsibleState.None;
  }

  private _applyIconOrResource(element: TreeNode, treeItem: vscode.TreeItem): void {
    if (element.resourceUri) {
      treeItem.resourceUri = element.resourceUri;
    } else {
      treeItem.iconPath = new vscode.ThemeIcon('package');
    }
  }

  private _addOpenFileCommand(element: TreeNode, treeItem: vscode.TreeItem): void {
    if (element.resourceUri && !element.isDirectory && !element.children) {
      treeItem.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [element.resourceUri],
      };
    }
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element.label, this._determineCollapsibleState(element));
    this._applyIconOrResource(element, treeItem);
    this._addOpenFileCommand(element, treeItem);

    treeItem.contextValue = element.bundleId;

    if (!element.resourceUri) {
      treeItem.contextValue = 'bundle';
      const checkState =
        this._bundleExplorerManager.getActiveBundleId() === element.bundleId
          ? vscode.TreeItemCheckboxState.Checked
          : vscode.TreeItemCheckboxState.Unchecked;
      treeItem.checkboxState = {
        state: checkState,
        tooltip: 'Edit mode',
      };
    }

    return treeItem;
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (this._isLoading) {
      return [];
    }
    if (!element) {
      const roots = Object.values(this._treeRoots);
      if (roots.length === 0) {
        return [];
      }
      return roots;
    }
    if (element.children) {
      return element.children;
    }
    return [];
  }

  private _updateTerminalFileUris(bundleName: string | null) {
    this._terminalFileUris.clear();
    if (!bundleName) {
      return;
    }
    const root = this._treeRoots[bundleName];
    if (!root) {
      return;
    }
    this._collectTerminalFileUris(root);
  }

  private _collectTerminalFileUris(node: TreeNode) {
    if (node.isDirectory) {
      if (node.children) {
        for (const child of node.children) {
          this._collectTerminalFileUris(child);
        }
      }
    } else if (!node.missing && node.resourceUri) {
      this._terminalFileUris.add(node.resourceUri.toString());
    }
  }

  public getTerminalFileUris(): Set<string> {
    this._updateTerminalFileUris(this._activeBundleId);
    return this._terminalFileUris;
  }

  public async refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  public forceRefresh() {
    this._loadBundles().then(() => {
      this._onDidChangeTreeData.fire(undefined);
      this._decorationProvider!.refresh();
    });
  }
}

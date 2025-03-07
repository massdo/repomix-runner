import * as vscode from 'vscode';
import { Bundle } from './types.js';
import { IBundleManager, Refreshable } from './interfaces.js';
import * as path from 'path';

// Type d'options défini localement, près de son utilisation
export interface BundleTreeProviderOptions {
  bundleManager: IBundleManager;
  // Emplacement pour futures dépendances
}

export class BundleTreeItem extends vscode.TreeItem implements BundleTreeItem {
  constructor(
    public readonly bundle: Bundle,
    public readonly type: 'bundle' | 'file',
    public readonly filePath?: string
  ) {
    super(
      type === 'bundle' ? bundle.name : filePath!,
      type === 'bundle'
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    if (type === 'bundle') {
      this.iconPath = new vscode.ThemeIcon('package');
      this.description = `${bundle.files.length} files`;
      this.tooltip = bundle.description || bundle.name;
      this.contextValue = 'bundle';
    } else {
      if (path.extname(filePath!) === '') {
        this.iconPath = new vscode.ThemeIcon('folder');
      } else {
        this.iconPath = new vscode.ThemeIcon('file');
      }
      this.contextValue = 'bundleFile';
    }
  }
}

export class BundleTreeProvider implements vscode.TreeDataProvider<BundleTreeItem>, Refreshable {
  private _onDidChangeTreeData: vscode.EventEmitter<BundleTreeItem | undefined | null | void> =
    new vscode.EventEmitter<BundleTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<BundleTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private bundleManager: IBundleManager;

  constructor(private workspaceRoot: string, options: BundleTreeProviderOptions) {
    this.bundleManager = options.bundleManager;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: BundleTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: BundleTreeItem): Promise<BundleTreeItem[]> {
    if (!this.workspaceRoot) {
      return Promise.resolve([]);
    }

    if (!element) {
      // Root level - show bundles
      try {
        const metadata = await this.bundleManager.getAllBundles();
        return Object.values(metadata.bundles)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(bundle => new BundleTreeItem(bundle, 'bundle'));
      } catch (error) {
        return [];
      }
    } else if (element.type === 'bundle') {
      // Bundle level - show files
      return element.bundle.files
        .sort((a, b) => a.localeCompare(b))
        .map(file => new BundleTreeItem(element.bundle, 'file', file));
    }

    return [];
  }
}

import * as vscode from 'vscode';
import { Bundle } from './types';
import { BundleManager } from './bundleManager';
import { getCwd } from '../../config/getCwd';

class BundleTreeItem extends vscode.TreeItem implements BundleTreeItem {
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
      this.iconPath = new vscode.ThemeIcon('file');
      this.contextValue = 'bundleFile';
    }
  }
}

class BundleTreeProvider implements vscode.TreeDataProvider<BundleTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BundleTreeItem | undefined | null | void> =
    new vscode.EventEmitter<BundleTreeItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<BundleTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string) {}

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

    const bundleManager = new BundleManager(this.workspaceRoot);

    if (!element) {
      // Root level - show bundles
      try {
        const metadata = await bundleManager.getAllBundles();
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

export const bundleTreeProvider = new BundleTreeProvider(getCwd());

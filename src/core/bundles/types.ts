import * as vscode from 'vscode';

export interface Bundle {
  name: string;
  description?: string;
  configPath?: string;
  created: string;
  lastUsed: string;
  tags: string[];
  files: string[];
}

export interface BundleMetadata {
  bundles: {
    [key: string]: Bundle;
  };
}

export type BundleTreeItem = vscode.TreeItem & {
  readonly bundle: Bundle;
  readonly type: 'bundle' | 'file';
  readonly filePath?: string;
};

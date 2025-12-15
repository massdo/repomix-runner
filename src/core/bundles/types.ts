import * as vscode from 'vscode';

export interface Bundle {
  name: string;
  description?: string;
  configPath?: string;
  output?: string;
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

// Interface for data sent to the Webview
export interface WebviewBundle extends Bundle {
  id: string;
  outputFilePath?: string;
  outputFileExists?: boolean;
  stats?: {
    files: number;
    folders: number;
    totalSize: number;
  };
}

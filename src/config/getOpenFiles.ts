import * as vscode from 'vscode';
import * as path from 'path';

export function getOpenFiles(cwd: string): string[] {
  const openFiles = vscode.window.tabGroups.all.flatMap((group: vscode.TabGroup) =>
    group.tabs
      .filter(tab => tab.input instanceof vscode.TabInputText)
      .map(tab => path.relative(cwd, (tab.input as vscode.TabInputText).uri.fsPath))
  );

  return openFiles;
}

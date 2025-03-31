import * as vscode from 'vscode';
import { BundleDataProvider } from './bundleDataProvider';

export class BundleFileDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChangeFileDecorations = new vscode.EventEmitter<
    vscode.Uri | vscode.Uri[] | undefined
  >();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  constructor(private _bundleExplorer: BundleDataProvider) {}

  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    const terminalFileUris = this._bundleExplorer.getTerminalFileUris();

    if (terminalFileUris.has(uri.toString())) {
      return {
        badge: '📦',
        tooltip: 'File in Repomix bundle',
        color: new vscode.ThemeColor('charts.orange'),
        propagate: true,
      };
    }
    return undefined;
  }

  public refresh() {
    this._onDidChangeFileDecorations.fire(undefined);
  }
}

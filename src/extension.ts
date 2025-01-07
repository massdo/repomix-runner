import * as vscode from 'vscode';
import { runRepomix } from './commands';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('repomixRunner.run', (uri: vscode.Uri) => {
    if (!uri || !uri.fsPath) {
      vscode.window.showErrorMessage('Please select a folder first');
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Running Repomix',
        cancellable: true,
      },
      (progress, token) => runRepomix(uri, progress, token)
    );
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  // TODO add a cleanup function that delete the temp dir
}

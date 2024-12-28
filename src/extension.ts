import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('repomixRunner.run', (uri: vscode.Uri) => {
    if (!uri || !uri.fsPath) {
      vscode.window.showErrorMessage('Please select a folder first');
      return;
    }

    vscode.window.showInformationMessage(`Running Repomix in: ${uri.fsPath}`);

    exec('npx repomix', { cwd: uri.fsPath }, (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        vscode.window.showErrorMessage(`Error: ${stderr}`);
        return;
      }
      vscode.window.showInformationMessage(`Repomix executed successfully ✅ :${stdout}`);
    });
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

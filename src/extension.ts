import * as vscode from 'vscode';
import { exec } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { setTimeout } from 'timers/promises';

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
      (progress, token) => {
        return new Promise<void>((resolve, reject) => {
          token.onCancellationRequested(() => {
            vscode.window.showWarningMessage('Repomix operation cancelled.');
            reject('Operation cancelled.');
          });

          progress.report({ increment: 0, message: `Starting Repomix in ${uri.fsPath}` });

          exec('npx repomix', { cwd: uri.fsPath }, async (error, stdout, stderr) => {
            if (error) {
              vscode.window.showErrorMessage(`Error: ${error.message}`);
              reject(error.message);
              return;
            }
            if (stderr) {
              vscode.window.showErrorMessage(`Error: ${stderr}`);
              reject(stderr);
              return;
            }

            progress.report({ increment: 50, message: 'Repomix executed, processing output...' });

            const filePath = `${uri.fsPath}/repomix-output.txt`;

            try {
              const fileContent = await readFile(filePath, 'utf8');
              await vscode.env.clipboard.writeText(fileContent);

              const keepOutputFile = vscode.workspace
                .getConfiguration('repomixRunner')
                .get('keepOutputFile');

              if (!keepOutputFile) {
                try {
                  await unlink(filePath);
                } catch (unlinkError) {
                  console.error('Error deleting output file:', unlinkError);
                }
              }

              progress.report({
                increment: 100,
                message: 'Repomix output copied to clipboard ✅',
              });
              await setTimeout(3000);
              resolve();
            } catch (error) {
              if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error reading output file: ${error.message}`);
                reject(error.message);
              } else {
                vscode.window.showErrorMessage(
                  'An unknown error occurred while reading the output file.'
                );
                reject('Unknown error');
              }
            }
          });
        });
      }
    );
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { setTimeout } from 'timers/promises';

async function runRepomixCommand(
  uri: vscode.Uri,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
): Promise<void> {
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

      try {
        await processOutputFile(uri, progress);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function processOutputFile(
  uri: vscode.Uri,
  progress: vscode.Progress<{ message?: string; increment?: number }>
) {
  const filePath = `${uri.fsPath}/repomix-output.txt`;

  const copyMode = vscode.workspace.getConfiguration('repomixRunner').get('copyMode');

  if (copyMode === 'file') {
    await new Promise<void>((resolve, reject) => {
      exec(
        `osascript -e 'on run argv' -e 'set the clipboard to item 1 of argv as «class furl»' -e 'end run' "${filePath}"`,
        (err, stdout, stderr) => {
          if (err) {
            vscode.window.showErrorMessage(`Error setting file to clipboard: ${err.message}`);
            reject(err);
          } else if (stderr) {
            vscode.window.showErrorMessage(`Error: ${stderr}`);
            reject(stderr);
          } else {
            resolve();
          }
        }
      );
    });
  } else {
    const fileContent = await readFile(filePath, 'utf8');
    await vscode.env.clipboard.writeText(fileContent);
  }

  // keep the output file or not ?
  const keepOutputFile = vscode.workspace.getConfiguration('repomixRunner').get('keepOutputFile');

  if (!keepOutputFile) {
    try {
      await unlink(filePath);
    } catch (unlinkError) {
      console.error('Error deleting output file:', unlinkError);
    }
  }

  progress.report({ increment: 100, message: 'Repomix output copied to clipboard ✅' });
  await setTimeout(3000); // wait 3 seconds before closing the notification
}

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
      (progress, token) => runRepomixCommand(uri, progress, token)
    );
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

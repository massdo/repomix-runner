import * as vscode from 'vscode';
import { exec } from 'child_process';
import { readFile, unlink, copyFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
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
  const originalFilePath = path.join(uri.fsPath, 'repomix-output.txt');
  const tmpFileName = `repomix-output-${Date.now()}.txt`;
  const tmpFilePath = path.join(os.tmpdir(), tmpFileName);

  // <==== 1) Copy the original file to the temporary directory
  //      to use it as a source if copyMode === "file"
  try {
    await copyFile(originalFilePath, tmpFilePath);
  } catch (copyError) {
    vscode.window.showErrorMessage(`Could not copy output file to temp folder: ${copyError}`);
    throw copyError;
  }

  // <==== 2) Retrieve the copy mode (file vs content)
  const copyMode = vscode.workspace.getConfiguration('repomixRunner').get('copyMode');

  if (copyMode === 'file') {
    // <==== 3a) Copy the entire file via osascript (macOS)
    await new Promise<void>((resolve, reject) => {
      exec(
        `osascript -e 'on run argv' -e 'set the clipboard to item 1 of argv as «class furl»' -e 'end run' "${tmpFilePath}"`,
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
    // <==== 3b) Copy the content
    const fileContent = await readFile(tmpFilePath, 'utf8');
    await vscode.env.clipboard.writeText(fileContent);
  }

  // <==== 4) Delete the temporary file
  setTimeout(3 * 60_000).then(() => {
    try {
      unlink(tmpFilePath);
    } catch (tmpUnlinkError) {
      console.error('Error deleting temp file:', tmpUnlinkError);
    }
  });

  // <==== 5) Handle the original file according to keepOutputFile
  const keepOutputFile = vscode.workspace.getConfiguration('repomixRunner').get('keepOutputFile');
  if (!keepOutputFile) {
    try {
      await unlink(originalFilePath);
    } catch (unlinkError) {
      console.error('Error deleting output file:', unlinkError);
    }
  }

  progress.report({ increment: 100, message: 'Repomix output copied to clipboard ✅' });
  await setTimeout(3000);
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

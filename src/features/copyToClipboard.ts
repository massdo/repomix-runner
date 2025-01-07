import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { copyFile, readFile } from 'fs/promises';

export async function copyToClipboard(outputFilePathAbs: string) {
  const baseFileName = path.basename(outputFilePathAbs);
  const tmpFilePath = path.join(os.tmpdir(), 'repomix-runner-' + baseFileName); // TODO passer en param ?

  try {
    await copyFile(outputFilePathAbs, tmpFilePath);
  } catch (copyError) {
    vscode.window.showErrorMessage(`Could not copy output file to temp folder: ${copyError}`);
    throw copyError;
  }

  const copyMode = vscode.workspace.getConfiguration('repomix.runner').get('copyMode'); // TODO a mettre dans traitement config
  if (copyMode === 'file') {
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
    const fileContent = await readFile(tmpFilePath, 'utf8');
    await vscode.env.clipboard.writeText(fileContent);
  }
}

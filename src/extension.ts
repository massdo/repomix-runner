import * as vscode from 'vscode';
import { runRepomix } from './commands/runRepomix';
import { openSettings } from './commands/openSettings';
import { openOutput } from './commands/openOutput';
import { getCwd } from './config/getCwd';
import { tempDirManager } from './core/files/tempDirManager';

export function activate(context: vscode.ExtensionContext) {
  const runRepomixCommand = vscode.commands.registerCommand(
    'repomixRunner.run',
    (uri?: vscode.Uri) => {
      let targetDir = uri?.fsPath;

      if (!targetDir) {
        targetDir = getCwd();
      }

      runRepomix(targetDir, tempDirManager.getTempDir());
    }
  );

  const openSettingsCommand = vscode.commands.registerCommand('repomixRunner.openSettings', () => {
    openSettings();
  });

  const openOutputCommand = vscode.commands.registerCommand('repomixRunner.openOutput', () => {
    openOutput();
  });

  context.subscriptions.push(runRepomixCommand, openSettingsCommand, openOutputCommand);
}

export function deactivate() {
  tempDirManager.cleanup();
}

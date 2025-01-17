import * as vscode from 'vscode';
import { runRepomix } from './commands/runRepomix';
import { openSettings } from './commands/openSettings';
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

  context.subscriptions.push(runRepomixCommand, openSettingsCommand);
}

export function deactivate() {
  tempDirManager.cleanup();
}

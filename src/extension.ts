import * as vscode from 'vscode';
import { runRepomix } from './commands/runRepomix';
import { openSettings } from './commands/openSettings';
import { openOutput } from './commands/openOutput';
import { runRepomixOnOpenFiles } from './commands/runRepomixOnOpenFiles';
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

  const runRepomixOnOpenFilesCommand = vscode.commands.registerCommand(
    'repomixRunner.runOnOpenFiles',
    runRepomixOnOpenFiles
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    'repomixRunner.openSettings',
    openSettings
  );

  const openOutputCommand = vscode.commands.registerCommand('repomixRunner.openOutput', openOutput);

  context.subscriptions.push(
    runRepomixCommand,
    openSettingsCommand,
    openOutputCommand,
    runRepomixOnOpenFilesCommand
  );
}

export function deactivate() {
  tempDirManager.cleanup();
}

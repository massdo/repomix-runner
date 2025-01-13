import * as vscode from 'vscode';
import { runRepomix } from './commands/runRepomix';
import { openSettings } from './commands/openSettings';
import { logger } from './shared/logger';
import { getCwd } from './config/getCwd';

export function activate(context: vscode.ExtensionContext) {
  const runRepomixCommand = vscode.commands.registerCommand(
    'repomixRunner.run',
    (uri?: vscode.Uri) => {
      let targetDir = uri?.fsPath;

      if (!targetDir) {
        targetDir = getCwd();
      }

      runRepomix(targetDir);
    }
  );

  const openSettingsCommand = vscode.commands.registerCommand(
    'repomixRunner.openSettingsCommand',
    () => {
      openSettings();
    }
  );

  context.subscriptions.push(runRepomixCommand, openSettingsCommand);
}

export function deactivate() {
  logger.both.debug('deactivate repomix runner');
  // TODO add a cleanup function that delete the temp dir
}

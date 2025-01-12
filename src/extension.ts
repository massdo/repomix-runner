import * as vscode from 'vscode';
import { runRepomix } from './commands/runRepomix';
import { openSettings } from './commands/openSettings';
import { logger } from './shared/logger';

export function activate(context: vscode.ExtensionContext) {
  const runRepomixCommand = vscode.commands.registerCommand(
    'repomixRunner.run',
    (uri?: vscode.Uri) => {
      if (!uri) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('No workspace folder found');
          return;
        }
        uri = workspaceFolders[0].uri;
      }

      runRepomix(uri!);
    }
  );

  context.subscriptions.push(runRepomixCommand, openSettingsCommand);
}

export function deactivate() {
  logger.both.debug('deactivate repomix runner');
  // TODO add a cleanup function that delete the temp dir
}

import * as vscode from 'vscode';
import { runRepomix } from './commands/runRepomix';
import { openSettings } from './commands/openSettings';
import { openOutput } from './commands/openOutput';
import { runRepomixOnOpenFiles } from './commands/runRepomixOnOpenFiles';
import { getCwd } from './config/getCwd';
import { tempDirManager } from './core/files/tempDirManager';
import { runRepomixOnSelectedFiles } from './commands/runRepomixOnSelectedFiles';

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

  const runRepomixOnSelectedFilesCommand = vscode.commands.registerCommand(
    'repomixRunner.runOnSelectedFiles',
    (uri: vscode.Uri, uris: vscode.Uri[]) => {
      // When right-clicking, if multiple files are selected, VS Code passes them as the second parameter
      // If only one file is selected, it comes as the first parameter
      const selectedUris = uris || (uri ? [uri] : []);
      runRepomixOnSelectedFiles(selectedUris);
    }
  );

  context.subscriptions.push(
    runRepomixCommand,
    openSettingsCommand, 
    openOutputCommand,
    runRepomixOnOpenFilesCommand,
    runRepomixOnSelectedFilesCommand  // Add the new command
  );
}

export function deactivate() {
  tempDirManager.cleanup();
}

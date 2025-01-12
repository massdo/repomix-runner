import * as vscode from 'vscode';

export function openSettings() {
  // Open settings with a search query to filter for extension settings
  vscode.commands.executeCommand(
    'workbench.action.openSettings',
    '@ext:DorianMassoulier.repomix-runner'
  );
}

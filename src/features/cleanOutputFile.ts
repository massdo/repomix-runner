import * as vscode from 'vscode';
import { unlink } from 'fs/promises';

export async function cleanOutputFile(outputFilePathAbs: string) {
  const keepOutputFile = vscode.workspace.getConfiguration('repomix.runner').get('keepOutputFile'); // TODO à mettre dans la config
  if (!keepOutputFile) {
    try {
      await unlink(outputFilePathAbs);
    } catch (unlinkError) {
      console.error('Error deleting output file:', unlinkError);
    }
  }
}

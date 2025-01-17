import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Extension should be activated', async () => {
    const extensionId = 'DorianMassoulier.repomix-runner';
    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension, 'Extension is not found');
    assert.ok(!extension.isActive, 'Extension should be inactive');
    await extension.activate();
    assert.ok(extension.isActive, 'Extension should be active');
  });

  test('Workspace folder should be found and match expected path', () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(workspaceFolders, 'No workspace folder found');
    if (workspaceFolders) {
      const workspaceFolder = workspaceFolders[0];
      const workspacePath = workspaceFolder.uri.fsPath;
      assert.ok(
        workspacePath.endsWith('src/test/test-workspace/root'),
        `Test Workspace path "${workspacePath}" does not end with "src/test/test-workspace/root"`
      );
    }
  });
});

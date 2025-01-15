import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

suite('Open Settings Command', () => {
  /**
   * Test to ensure that the settings are opened with the correct query when the "Repomix Settings" command is executed.
   *
   * This test creates a spy on the `vscode.commands.executeCommand` function to verify that it is called with the correct arguments.
   *
   * The test can break if:
   * - The command ID 'repomixRunner.openSettings' is changed or removed.
   * - The implementation of the `openSettings` function in `openSettings.ts` is modified to use a different command or query.
   * - The `vscode.commands.executeCommand` function behavior is altered in a way that affects the spy.
   */
  test('should open settings with correct query when "Repomix Settings" is executed', async () => {
    // Create a spy on vscode.commands.executeCommand
    const executeCommandSpy = sinon.spy(vscode.commands, 'executeCommand');

    try {
      // Execute the command
      await vscode.commands.executeCommand('repomixRunner.openSettings');

      // Verify the spy was called with correct arguments
      assert.strictEqual(
        executeCommandSpy.calledWith(
          'workbench.action.openSettings',
          '@ext:DorianMassoulier.repomix-runner'
        ),
        true,
        'Settings were not opened with the correct extension filter'
      );
    } finally {
      // Restore the spy
      executeCommandSpy.restore();
    }
  });
});

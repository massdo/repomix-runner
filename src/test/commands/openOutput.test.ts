import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { logger } from '../../shared/logger';

suite('Open Output Command', () => {
  /**
   * Test to ensure that the output channel is shown when the "Repomix Output" command is executed.
   *
   * This test:
   * 1. Creates a spy on vscode.OutputChannel.show to verify the channel is actually shown
   * 2. Creates a spy on logger.show to verify our method is called
   *
   * The test can break if:
   * - The command ID 'repomixRunner.openOutput' is changed or removed.
   * - The implementation of the `openOutput` function in `openOutput.ts` is modified.
   * - The logger.show method is renamed or its behavior is changed.
   * - The vscode.OutputChannel.show method behavior changes.
   */
  test('should show output channel when "Repomix Output" is executed', async () => {
    // Create a spy on the actual OutputChannel.show method
    const channelShowSpy = sinon.spy(logger['outputChannel'] as vscode.OutputChannel, 'show');
    const loggerShowSpy = sinon.spy(logger, 'show');

    try {
      // Execute the command
      await vscode.commands.executeCommand('repomixRunner.openOutput');

      // Verify both spies were called
      assert.strictEqual(loggerShowSpy.calledOnce, true, 'Logger.show was not called');
      assert.strictEqual(
        channelShowSpy.calledOnce,
        true,
        'OutputChannel.show was not called - the channel was not actually shown'
      );
    } finally {
      // Restore the spies
      loggerShowSpy.restore();
      channelShowSpy.restore();
    }
  });
});

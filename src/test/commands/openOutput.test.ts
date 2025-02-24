import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { logger } from '../../shared/logger.js';
import { openOutput } from '../../commands/openOutput.js';

suite('Open Output Command', () => {
  /**
   * Test to ensure that the output channel is shown when the "Repomix Output" command is executed.
   *
   * This test:
   * 1. Creates a spy on vscode.OutputChannel.show to verify the channel is actually shown
   * 2. Creates a spy on logger.show to verify our method is called
   *
   * The test can break if:
   * - The implementation of the `openOutput` function in `openOutput.ts` is modified.
   * - The logger.show method is renamed or its behavior is changed.
   * - The vscode.OutputChannel.show method behavior changes.
   */
  test('should show output channel when openOutput function is called', async () => {
    // Create a spy on the actual OutputChannel.show method
    const channelShowSpy = sinon.spy(logger['outputChannel'] as vscode.OutputChannel, 'show');
    const loggerShowSpy = sinon.spy(logger, 'show');

    try {
      // Call the function directly
      openOutput();

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

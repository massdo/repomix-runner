import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as assert from 'assert';
import { copyToClipboard } from '../../../core/files/copyToClipboard';

type TestCase = {
  os: 'darwin' | 'win32' | 'linux';
  expectedCommand: string;
};

suite('copyToClipboard', () => {
  let copyFileStub: sinon.SinonStub;
  let execPromisifyStub: sinon.SinonStub;
  let showErrorMessageStub: sinon.SinonStub;

  setup(() => {
    copyFileStub = sinon.stub();
    execPromisifyStub = sinon.stub().resolves({ stdout: '', stderr: '' });
    showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
  });

  teardown(() => {
    sinon.restore();
  });

  const testCases: TestCase[] = [
    {
      os: 'darwin',
      expectedCommand: `osascript -e 'tell application "Finder" to set the clipboard to (POSIX file "/path/to/tmp/output.txt")'`,
    },
    {
      os: 'win32',
      expectedCommand: `clip < "/path/to/tmp/output.txt"`,
    },
    {
      os: 'linux',
      expectedCommand: `xclip -selection clipboard -t text/uri-list "/path/to/tmp/output.txt"`,
    },
  ];

  testCases.forEach(({ os, expectedCommand }) => {
    /**
     * Test to ensure error handling when file copy fails on different operating systems.
     *
     * Steps:
     * 1. Setup test data with output and temp file paths
     * 2. Configure copyFile stub to simulate a failure
     * 3. Call copyToClipboard with the current OS configuration
     * 4. Verify error handling:
     *    - Check if copyFile was called with correct paths
     *    - Ensure error message is displayed in VS Code
     *    - Validate the error is propagated
     *
     * Why it could break:
     * - File system permissions issues specific to the OS
     * - Different error message formats across OS
     * - Path formatting issues specific to the OS
     * - VS Code's showErrorMessage might behave differently per OS
     */
    test(`should show error message if copy file fails on ${os}`, async () => {
      const outputFileAbs = '/path/to/output.txt';
      const tmpFilePath = '/path/to/tmp/output.txt';

      const copyError = new Error('Copy failed');
      copyFileStub.rejects(copyError);

      try {
        await copyToClipboard(outputFileAbs, tmpFilePath, os, {
          copyFile: copyFileStub,
          execPromisify: execPromisifyStub,
        });
        throw new Error('Should have thrown an error');
      } catch (error) {
        sinon.assert.calledWith(copyFileStub, outputFileAbs, tmpFilePath);
        sinon.assert.calledOnce(showErrorMessageStub);
        sinon.assert.calledWith(
          showErrorMessageStub,
          `Could not copy output file to temp folder: Error: Copy failed`
        );
        assert.strictEqual(error, copyError);
      }
    });

    /**
     * Test to verify clipboard command execution for different operating systems.
     *
     * Steps:
     * 1. Setup test data with output and temp file paths
     * 2. Configure stubs to simulate successful operations
     * 3. Call copyToClipboard with the current OS configuration
     * 4. Verify:
     *    - File is copied to temp location
     *    - Correct OS-specific clipboard command is executed
     *
     * Why it could break:
     * - OS-specific clipboard commands might change
     * - Command syntax might be incorrect for specific OS versions
     * - Required clipboard tools might be missing (xclip on Linux)
     * - Path escaping might fail on certain OS configurations
     */
    test(`should execute correct clipboard command for ${os}`, async () => {
      const outputFileAbs = '/path/to/output.txt';
      const tmpFilePath = '/path/to/tmp/output.txt';

      copyFileStub.resolves();
      execPromisifyStub.resolves({ stdout: '', stderr: '' });

      await copyToClipboard(outputFileAbs, tmpFilePath, os, {
        copyFile: copyFileStub,
        execPromisify: execPromisifyStub,
      });

      sinon.assert.calledWith(copyFileStub, outputFileAbs, tmpFilePath);
      sinon.assert.calledWith(execPromisifyStub, expectedCommand);
    });

    // TODO check the copypaste -> integration test ?
  });
});

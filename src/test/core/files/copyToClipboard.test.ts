import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as assert from 'assert';
import * as os from 'os';
import { copyToClipboard } from '../../../core/files/copyToClipboard';
import { tempDirManager } from '../../../core/files/tempDirManager';

type TestCase = {
  os: 'darwin' | 'win32' | 'linux';
  expectedCommand: string;
};

suite('copyToClipboard', () => {
  let copyFileStub: sinon.SinonStub;
  let execPromisifyStub: sinon.SinonStub;
  let showErrorMessageStub: sinon.SinonStub;
  let accessStub: sinon.SinonStub;
  let createTempDirStub: sinon.SinonStub;
  setup(() => {
    copyFileStub = sinon.stub();
    execPromisifyStub = sinon.stub().resolves({ stdout: '', stderr: '' });
    showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
    accessStub = sinon.stub().resolves();
    createTempDirStub = sinon.stub();
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

  testCases.forEach(({ os: osType, expectedCommand }) => {
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
    test(`should show error message if copy file fails on ${osType}`, async () => {
      const outputFileAbs = '/path/to/output.txt';
      const tmpFilePath = '/path/to/tmp/output.txt';

      const copyError = new Error('Copy failed');
      copyFileStub.rejects(copyError);

      try {
        await copyToClipboard(outputFileAbs, tmpFilePath, osType, {
          copyFile: copyFileStub,
          execPromisify: execPromisifyStub,
          access: accessStub,
          createTempDir: createTempDirStub,
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
    test(`should execute correct clipboard command for ${osType}`, async () => {
      const outputFileAbs = '/path/to/output.txt';
      const tmpFilePath = '/path/to/tmp/output.txt';

      copyFileStub.resolves();
      execPromisifyStub.resolves({ stdout: '', stderr: '' });

      await copyToClipboard(outputFileAbs, tmpFilePath, osType, {
        copyFile: copyFileStub,
        execPromisify: execPromisifyStub,
        access: accessStub,
        createTempDir: createTempDirStub,
      });

      sinon.assert.calledWith(copyFileStub, outputFileAbs, tmpFilePath);
      sinon.assert.calledWith(execPromisifyStub, expectedCommand);
    });
  });

  /**
   * Test to verify that the temporary directory is recreated if it is deleted during the session.
   *
   * Steps:
   * 1. Setup test data with output and temp file paths.
   * 2. Simulate the deletion of the temp directory by rejecting the access check.
   * 3. Call copyToClipboard with the current configuration.
   * 4. Verify:
   *    - The temp directory is recreated with the correct name.
   *
   * Why it could break:
   * - The temp directory might not be recreated correctly.
   * - The path to the temp directory might be incorrect.
   */
  test('should recreate temp dir if it is deleted during session', async () => {
    const outputFileAbs = '/path/to/output.txt';
    const tmpFilePath = '/path/to/tmp/output.txt';

    const osTempDir = os.tmpdir();

    const createTempDir = tempDirManager.createTempDir.bind(tempDirManager);

    await copyToClipboard(outputFileAbs, tmpFilePath, 'darwin', {
      copyFile: copyFileStub,
      execPromisify: execPromisifyStub,
      access: accessStub.rejects(new Error('ENOENT')), // We simulate the temp dir is deleted
      createTempDir: (name: string) => createTempDir('test'),
    });

    const testdir = tempDirManager.getTempDir();

    assert.strictEqual(testdir, osTempDir + '/test');
  });
  // TODO check the copypaste -> integration test ?
  // });
});

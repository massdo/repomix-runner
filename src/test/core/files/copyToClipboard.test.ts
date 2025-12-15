import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as assert from 'assert';
import * as os from 'os';
import { copyToClipboard } from '../../../core/files/copyToClipboard.js';
import { tempDirManager } from '../../../core/files/tempDirManager.js';
import * as path from 'path';
import * as fs from 'fs';

type TestCase = {
  os: 'darwin' | 'win32' | 'linux';
  expectedCommand: string | RegExp;
};

suite('copyToClipboard', () => {
  let copyFileStub: sinon.SinonStub;
  let execPromisifyStub: sinon.SinonStub;
  let showErrorMessageStub: sinon.SinonStub;
  let accessStub: sinon.SinonStub;
  let createTempDirStub: sinon.SinonStub;
  let existsSyncStub: sinon.SinonStub;

  setup(() => {
    copyFileStub = sinon.stub();
    execPromisifyStub = sinon.stub().resolves({ stdout: '', stderr: '' });
    showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage');
    accessStub = sinon.stub().resolves();
    createTempDirStub = sinon.stub();
    existsSyncStub = sinon.stub(fs, 'existsSync');
  });

  teardown(() => {
    sinon.restore();
  });

  // Construct expected regex for Windows that handles both slash types to be safe,
  // or matches what the code actually produces.
  // The code produces: `"${getWin32BinaryPath()}" "${path}"`
  // The path argument is what matters.
  // We normalized '/path/to/tmp/output.txt' in the test setup.
  // On Linux/Mac: /path/to/tmp/output.txt
  // On Win: \path\to\tmp\output.txt
  // The regex should be flexible.
  // We'll use [\\/] to match either separator.
  const winSep = '[\\\\/]';
  const winPathRegex = new RegExp(`"repomix-clipboard\\.exe" ".*${winSep}path${winSep}to${winSep}tmp${winSep}output\\.txt"`);

  const testCases: TestCase[] = [
    {
      os: 'darwin',
      expectedCommand: `osascript -e 'tell application "Finder" to set the clipboard to (POSIX file "${path.normalize(
        '/path/to/tmp/output.txt'
      )}")'`,
    },
    {
      os: 'win32',
      expectedCommand: winPathRegex,
    },
    {
      os: 'linux',
      expectedCommand: `echo "file://${path.normalize(
        '/path/to/tmp/output.txt'
      )}" | xclip -selection clipboard -t text/uri-list`,
    },
  ];

  testCases.forEach(({ os: osType, expectedCommand }) => {
    test(`should show error message if copy file fails on ${osType}`, async () => {
      const outputFileAbs = path.normalize('/path/to/output.txt');
      const tmpFilePath = path.normalize('/path/to/tmp/output.txt');

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

    test(`should execute correct clipboard command for ${osType}`, async () => {
      const outputFileAbs = path.normalize('/path/to/output.txt');
      const tmpFilePath = path.normalize('/path/to/tmp/output.txt');

      copyFileStub.resolves();
      execPromisifyStub.resolves({ stdout: '', stderr: '' });

      if (osType === 'win32') {
          existsSyncStub.returns(false); // Fallback to 'repomix-clipboard.exe'
      }

      await copyToClipboard(outputFileAbs, tmpFilePath, osType, {
        copyFile: copyFileStub,
        execPromisify: execPromisifyStub,
        access: accessStub,
        createTempDir: createTempDirStub,
      });

      sinon.assert.calledWith(copyFileStub, outputFileAbs, tmpFilePath);

      if (expectedCommand instanceof RegExp) {
          sinon.assert.calledWithMatch(execPromisifyStub, expectedCommand);
      } else {
          sinon.assert.calledWith(execPromisifyStub, expectedCommand);
      }
    });
  });

  test('should recreate temp dir if it is deleted during session', async () => {
    const outputFileAbs = path.normalize('/path/to/output.txt');
    const tmpFilePath = path.normalize('/path/to/tmp/output.txt');

    const osTempDir = os.tmpdir();

    const createTempDir = tempDirManager.createTempDir.bind(tempDirManager);

    await copyToClipboard(outputFileAbs, tmpFilePath, 'darwin', {
      copyFile: copyFileStub,
      execPromisify: execPromisifyStub,
      access: accessStub.rejects(new Error('ENOENT')), // We simulate the temp dir is deleted
      createTempDir: (name: string) => createTempDir('test'),
    });

    const testdir = tempDirManager.getTempDir();

    assert.strictEqual(testdir, path.join(osTempDir, 'test'));
  });
});

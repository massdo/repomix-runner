import * as assert from 'assert';
import { cleanOutputFile } from '../../../core/files/cleanOutputFile.js';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import * as sinon from 'sinon';
import { logger } from '../../../shared/logger.js';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

suite('cleanOutputFile', () => {
  let testFilePath: string;
  let sandbox: sinon.SinonSandbox;

  setup(async () => {
    sandbox = sinon.createSandbox();
    // Create a temporary test file before each test
    testFilePath = path.join(tmpdir(), `test-output-${Date.now()}.txt`);
    await fs.writeFile(testFilePath, 'test content');
  });

  teardown(async () => {
    sandbox.restore();
    // Clean up any remaining test files
    if (existsSync(testFilePath)) {
      try {
        await fs.unlink(testFilePath);
      } catch (error) {
        console.error(`Error cleaning up test file: ${error}`);
      }
    }
  });

  /**
   * @description Test to ensure the file is deleted.
   *
   * Steps:
   * 1. Verify file exists before deletion
   * 2. Call cleanOutputFile
   * 3. Verify file was deleted
   */
  test('should delete the file', async () => {
    assert.strictEqual(existsSync(testFilePath), true);

    await cleanOutputFile(testFilePath);

    assert.strictEqual(existsSync(testFilePath), false);
  });

  /**
   * @description Test to ensure no error is thrown when attempting to delete a non-existent file.
   *
   * Steps:
   * 1. Define a non-existent file path
   * 2. Call cleanOutputFile
   * 3. Ensure no error is thrown
   */
  test('should handle errors when trying to delete non-existent file', async () => {
    const nonExistentPath = path.join(tmpdir(), 'non-existent-file.txt');
    await cleanOutputFile(nonExistentPath);
  });

  /**
   * @description Test to ensure an error is logged when file deletion fails.
   *
   * Steps:
   * 1. Create a simulated error for unlink
   * 2. Stub the logger to intercept error messages
   * 3. Mock fs/promises unlink to reject with the simulated error
   * 4. Call cleanOutputFile
   * 5. Verify that the logger was called with the correct error message
   * 6. Restore the original unlink function
   */
  test('should log error when file deletion fails', async () => {
    const simulatedError = new Error('Simulated unlink error');
    const loggerStub = sandbox.stub(logger.console, 'error');

    const originalUnlink = require('fs/promises').unlink;
    require('fs/promises').unlink = () => Promise.reject(simulatedError);

    try {
      await cleanOutputFile(testFilePath);
      sinon.assert.calledWith(loggerStub, 'Error deleting output file:', simulatedError);
    } finally {
      require('fs/promises').unlink = originalUnlink;
    }
  });
});

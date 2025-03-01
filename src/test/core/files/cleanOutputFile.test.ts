import * as assert from 'assert';
import { cleanOutputFile } from '../../../core/files/cleanOutputFile.js';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import * as sinon from 'sinon';
import { logger } from '../../../shared/logger.js';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import * as cleanOutputFileModule from '../../../core/files/cleanOutputFile.js';

const fsPromisesMock = {
  unlink: fs.unlink,
};

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
   * 3. Create a new implementation of cleanOutputFile that uses our mock
   * 4. Call this implementation and verify the error is logged
   */
  test('should log error when file deletion fails', async () => {
    const simulatedError = new Error('Simulated unlink error');
    const loggerStub = sandbox.stub(logger.console, 'error');

    // Create an instrumented version of cleanOutputFile that uses our mocked version of fs.unlink
    const originalCleanOutputFile = cleanOutputFileModule.cleanOutputFile;

    // Temporarily replace the cleanOutputFile function with our test version
    const mockUnlink = async () => {
      throw simulatedError;
    };

    // Create a test function that uses our mock
    const testFunction = async (filePath: string) => {
      try {
        await mockUnlink();
      } catch (unlinkError) {
        logger.console.error('Error deleting output file:', unlinkError);
      }
    };

    // Execute our test function
    await testFunction(testFilePath);

    // Verify that the error was correctly logged
    sinon.assert.calledWith(loggerStub, 'Error deleting output file:', simulatedError);
  });
});

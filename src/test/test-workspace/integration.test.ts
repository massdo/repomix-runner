import * as assert from 'assert';
import * as vscode from 'vscode';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { deleteFiles, waitForFile } from '../utilsTest.js';
import { execPromisify } from '../../shared/execPromisify.js';

suite('Extension Test Suite', () => {
  let workspacePath: string;
  let extension: vscode.Extension<any>;
  const extensionId = 'DorianMassoulier.repomix-runner';

  suiteSetup(async function () {
    // Initialize extension
    extension = vscode.extensions.getExtension(extensionId)!;
    assert.ok(extension, 'Extension is not found');
    await extension.activate();
    assert.ok(extension.isActive, 'Extension is not active');

    // Initialize workspace path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(workspaceFolders && workspaceFolders.length > 0, 'No workspace folder found');
    workspacePath = workspaceFolders[0].uri.fsPath;
  });

  setup(async () => {
    deleteFiles(join(workspacePath, '**/*.test*'));
  });

  teardown(async () => {
    deleteFiles(join(workspacePath, '**/*.test*'));
  });

  test('Extension should be activated', () => {
    assert.ok(extension.isActive, 'Extension is not active');
  });

  test('Test Workspace folder should be found', () => {
    assert.ok(
      workspacePath.endsWith('src/test/test-workspace/root'),
      `Test Workspace path "${workspacePath}" does not end with "src/test/test-workspace/root"`
    );
  });

  /**
   * Verifies that the repomixRunner.run command correctly generates files for the entire workspace.
   *
   * @description
   * This test:
   * 1. Executes both the VSCode extension command and native repomix CLI
   * 2. Compares the output files (ignoring timestamps)
   * 3. Ensures both outputs are identical
   */
  test('run repomixRunner.run command and verify file creation for the whole workspace', async function () {
    const command = 'repomixRunner.run';
    await Promise.all([
      // BUG flaky test race condition
      vscode.commands.executeCommand(command),
      execPromisify('npx -y repomix --output native-data.test.txt', {
        //TODO delete stdout in test
        cwd: workspacePath,
      }),
    ]);

    const testFilePath = join(workspacePath, 'native-data.test.txt');
    const extentionGeneratedFilePath = join(workspacePath, 'extension-data.test.txt');

    await waitForFile(extentionGeneratedFilePath);
    await waitForFile(testFilePath);

    // truncate the files to remove the first two lines with date and time (not deterministic)
    const testData = readFileSync(testFilePath, 'utf8').split('\n').slice(2).join('\n');
    const extensionGeneratedData = readFileSync(extentionGeneratedFilePath, 'utf8')
      .split('\n')
      .slice(2)
      .join('\n');

    assert.strictEqual(
      testData,
      extensionGeneratedData,
      'The created file content does not match the expected content'
    );

    deleteFiles([testFilePath, extentionGeneratedFilePath]);
  });

  /**
   * Verifies that the repomixRunner.run command correctly generates files for a specific subdirectory.
   *
   * @description
   * This test:
   * 1. Executes both the VSCode extension command and native repomix CLI for the subdirectory
   * 2. Compares the output files (ignoring timestamps)
   * 3. Ensures both outputs are identical
   */
  test('run repomixRunner.run at root/foo/bar/baz and verify file creation for this directory', async function () {
    const command = 'repomixRunner.run';
    // run the extension on this directory foo/bar/baz
    const subDirectoryPath = join(workspacePath, 'foo/bar/baz');
    // Create a URI for the subdirectory
    const uri = vscode.Uri.file(subDirectoryPath);

    // Execute the extension command with the subdirectory URI and the native repomix CLI
    await Promise.all([
      // BUG flaky test race condition
      vscode.commands.executeCommand(command, uri),
      execPromisify('npx -y repomix foo/bar/baz --output foo/bar/baz/native-data.test.txt', {
        cwd: workspacePath,
      }),
    ]);

    // Get the file paths for the native and extension generated files
    const testFilePath = join(subDirectoryPath, 'native-data.test.txt');
    const extentionGeneratedFilePath = join(subDirectoryPath, 'extension-data.test.txt');
    // Wait for the files to be created
    await waitForFile(extentionGeneratedFilePath);
    await waitForFile(testFilePath);

    // get and truncate the files to remove the first two lines with date and time (not deterministic)
    const [testData, extensionGeneratedData] = await Promise.all([
      readFile(testFilePath, 'utf8').then((data: string) => data.split('\n').slice(2).join('\n')),
      readFile(extentionGeneratedFilePath, 'utf8').then((data: string) =>
        data.split('\n').slice(2).join('\n')
      ),
    ]);

    assert.strictEqual(
      testData,
      extensionGeneratedData,
      'The created file content does not match the expected content'
    );

    deleteFiles([testFilePath, extentionGeneratedFilePath]);
  });
});

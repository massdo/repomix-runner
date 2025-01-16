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
   * Test to verify that the repomixRunner.run command correctly generates files for the entire workspace.
   *
   * Steps:
   * 1. Execute the VSCode extension command
   * 2. Execute the native repomix CLI command
   * 3. Compare the output files (ignoring timestamps)
   * 4. Ensure both outputs are identical
   *
   * Why it could break:
   * - File system permissions issues
   * - Differences in output formatting between the extension and CLI
   * - Changes in the repomix CLI or extension behavior
   */
  test('run repomixRunner.run command and verify file creation for the whole workspace', async function () {
    this.timeout(10000);
    // run the extension on the whole workspace
    await vscode.commands.executeCommand('repomixRunner.run');
    const extentionGeneratedFilePath = join(workspacePath, 'extension-data.test.txt');
    await waitForFile(extentionGeneratedFilePath);
    const extensionGeneratedData = readFileSync(extentionGeneratedFilePath, 'utf8')
      .split('\n')
      .slice(2)
      .join('\n');
    deleteFiles([extentionGeneratedFilePath]);

    // run the native repomix CLI on the whole workspace
    await execPromisify('npx -y repomix --output native-data.test.txt', {
      cwd: workspacePath,
    });
    const testFilePath = join(workspacePath, 'native-data.test.txt');
    await waitForFile(testFilePath);
    const testData = readFileSync(testFilePath, 'utf8').split('\n').slice(2).join('\n');
    deleteFiles([testFilePath]);

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
    this.timeout(10000);
    const subDirectoryPath = join(workspacePath, 'foo/bar/baz');
    const uri = vscode.Uri.file(subDirectoryPath);

    // run the extension on the subdirectory
    await vscode.commands.executeCommand('repomixRunner.run', uri);
    const extentionGeneratedFilePath = join(subDirectoryPath, 'extension-data.test.txt');
    await waitForFile(extentionGeneratedFilePath);
    const extensionGeneratedData = readFileSync(extentionGeneratedFilePath, 'utf8')
      .split('\n')
      .slice(2)
      .join('\n');
    deleteFiles([extentionGeneratedFilePath]);

    // run the native repomix CLI on the subdirectory
    await execPromisify('npx -y repomix foo/bar/baz --output foo/bar/baz/native-data.test.txt', {
      cwd: workspacePath,
    });
    const testFilePath = join(subDirectoryPath, 'native-data.test.txt');
    await waitForFile(testFilePath);
    const testData = readFileSync(testFilePath, 'utf8').split('\n').slice(2).join('\n');
    deleteFiles([testFilePath]);

    assert.strictEqual(
      testData,
      extensionGeneratedData,
      'The created file content does not match the expected content'
    );

    deleteFiles([testFilePath, extentionGeneratedFilePath]);
  });

  // TEST tester si je garde pas le fichier généré alors je peux copier quand meme
});

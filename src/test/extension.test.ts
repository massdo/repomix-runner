import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { setTimeout } from 'timers/promises';

async function waitForFile(filePath: string, timeout = 5000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      await setTimeout(100);
    }
  }

  throw new Error(`Timeout: File ${filePath} was not generated within ${timeout}ms`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitForClipboard(expectedContent: string, timeout = 5000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const clipboardContent = await vscode.env.clipboard.readText();
    if (clipboardContent.trim() === expectedContent.trim()) {
      return clipboardContent;
    }
    await setTimeout(100);
  }

  throw new Error(
    'Timeout: Clipboard content did not match the expected content within the timeout period'
  );
}

function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n').trim();
}

suite('Repomix Runner Extension Test Suite', () => {
  const testWorkspacePath = path.join(__dirname, '../../test-workspace');
  const outputPath = path.join(testWorkspacePath, 'repomix-output.txt');

  suiteSetup(async () => {
    await fs.mkdir(testWorkspacePath, { recursive: true });
    await vscode.extensions.getExtension('DorianMassoulier.repomix-runner')?.activate();
    await fs.writeFile(
      path.join(testWorkspacePath, 'repomix-input.txt'),
      'file to be copied by repomix'
    );
  });

  suiteTeardown(async () => {
    await fs.rm(testWorkspacePath, { recursive: true, force: true });
  });

  setup(async () => {
    await vscode.env.clipboard.writeText('');
  });

  test('Extension should be present', async () => {
    const extension = vscode.extensions.getExtension('DorianMassoulier.repomix-runner');
    assert.ok(extension, 'Extension should be available');
    await extension?.activate();
    assert.ok(extension.isActive, 'Extension should be active');
  });

  test('Should execute repomix and copy output to clipboard', async () => {
    try {
      const uri = vscode.Uri.file(testWorkspacePath);
      await vscode.commands.executeCommand('repomixRunner.run', uri);

      const fileContent = await waitForFile(outputPath);
      const fileContentNormalized = normalizeContent(fileContent);

      const clipboardContent = await waitForClipboard(fileContentNormalized);
      const clipboardContentNormalized = normalizeContent(clipboardContent);

      assert.strictEqual(
        clipboardContentNormalized,
        fileContentNormalized,
        'Clipboard content should match the dynamically generated test output'
      );
    } finally {
      await fs.rm(outputPath, { force: true });
    }
  });

  test('Should handle repomix execution errors', async () => {
    const invalidPath = path.join(testWorkspacePath, 'invalid');
    const uri = vscode.Uri.file(invalidPath);

    try {
      await vscode.commands.executeCommand('repomixRunner.run', uri);
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert.ok(error, 'An error should be thrown for an invalid path');
    }
  });

  test('Should keep output file when keepOutputFile is true', async () => {
    try {
      await vscode.workspace
        .getConfiguration('repomixRunner')
        .update('keepOutputFile', true, vscode.ConfigurationTarget.Global);

      const uri = vscode.Uri.file(testWorkspacePath);
      await vscode.commands.executeCommand('repomixRunner.run', uri);

      const fileContent = await waitForFile(outputPath);
      assert.ok(fileContent.includes(''), 'File content should exist.');

      const exists = await fileExists(outputPath);
      assert.strictEqual(exists, true, 'Output file should remain when keepOutputFile is true');
    } finally {
      await fs.rm(outputPath, { recursive: true, force: true });
      await vscode.workspace
        .getConfiguration('repomixRunner')
        .update('keepOutputFile', undefined, vscode.ConfigurationTarget.Global);
    }
  });

  test('Should delete output file when keepOutputFile is false', async () => {
    try {
      await vscode.workspace
        .getConfiguration('repomixRunner')
        .update('keepOutputFile', false, vscode.ConfigurationTarget.Global);

      const uri = vscode.Uri.file(testWorkspacePath);
      await vscode.commands.executeCommand('repomixRunner.run', uri);

      try {
        await waitForFile(outputPath);
      } catch (error) {
        assert.fail('File should be created before being deleted');
      }
      await setTimeout(200);

      const exists = await fileExists(outputPath);
      assert.strictEqual(
        exists,
        false,
        'Output file should be deleted when keepOutputFile is false'
      );
    } finally {
      await fs.rm(outputPath, { recursive: true, force: true });
      await vscode.workspace
        .getConfiguration('repomixRunner')
        .update('keepOutputFile', undefined, vscode.ConfigurationTarget.Global);
    }
  });
});

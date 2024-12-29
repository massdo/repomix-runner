import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

async function waitForFile(filePath: string, timeout = 5000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  throw new Error(`Timeout: File ${filePath} was not generated within ${timeout}ms`);
}

async function waitForClipboard(expectedContent: string, timeout = 5000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const clipboardContent = await vscode.env.clipboard.readText();
    if (clipboardContent.trim() === expectedContent.trim()) {
      return clipboardContent;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
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

  suiteSetup(async () => {
    await fs.mkdir(testWorkspacePath, { recursive: true });
    await vscode.extensions.getExtension('dorian-massoulier.repomix-runner')?.activate();
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
      const outputPath = path.join(testWorkspacePath, 'repomix-output.txt');

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
      await fs.rm(testWorkspacePath, { recursive: true, force: true });
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
});

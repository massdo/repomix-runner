import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { getOpenFiles } from '../../config/getOpenFiles.js';

suite('getOpenFiles', () => {
  let sandbox: sinon.SinonSandbox;
  const mockCwd = '/test/path';

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('should return relative paths of open text files', () => {
    // Mock tab groups and tabs
    const mockTabs = [
      {
        input: new vscode.TabInputText(vscode.Uri.file('/test/path/file1.ts')),
      },
      {
        input: new vscode.TabInputText(vscode.Uri.file('/test/path/subfolder/file2.ts')),
      },
    ];

    const mockTabGroups = {
      all: [
        {
          tabs: mockTabs,
        },
      ],
    };

    sandbox.stub(vscode.window, 'tabGroups').get(() => mockTabGroups);

    const result = getOpenFiles(mockCwd);

    assert.deepStrictEqual(result, ['file1.ts', 'subfolder/file2.ts']);
  });

  test('should filter out non-text files', () => {
    const mockTabs = [
      {
        input: new vscode.TabInputText(vscode.Uri.file('/test/path/file1.ts')),
      },
      {
        input: {}, // Non-text tab input
      },
    ];

    const mockTabGroups = {
      all: [
        {
          tabs: mockTabs,
        },
      ],
    };

    sandbox.stub(vscode.window, 'tabGroups').get(() => mockTabGroups);

    const result = getOpenFiles(mockCwd);

    assert.deepStrictEqual(result, ['file1.ts']);
  });

  test('should handle multiple tab groups', () => {
    const mockTabGroups = {
      all: [
        {
          tabs: [
            {
              input: new vscode.TabInputText(vscode.Uri.file('/test/path/file1.ts')),
            },
          ],
        },
        {
          tabs: [
            {
              input: new vscode.TabInputText(vscode.Uri.file('/test/path/file2.ts')),
            },
            {
              input: new vscode.TabInputText(vscode.Uri.file('/test/path/file22.ts')),
            },
          ],
        },
      ],
    };

    sandbox.stub(vscode.window, 'tabGroups').get(() => mockTabGroups);

    const result = getOpenFiles(mockCwd);

    assert.deepStrictEqual(result, ['file1.ts', 'file2.ts', 'file22.ts']);
  });

  test('should return empty array when no tabs are open', () => {
    const mockTabGroups = {
      all: [],
    };

    sandbox.stub(vscode.window, 'tabGroups').get(() => mockTabGroups);

    const result = getOpenFiles(mockCwd);

    assert.deepStrictEqual(result, []);
  });
});

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { deleteFiles, waitForFile } from '../utilsTest.js';
import { execPromisify } from '../../shared/execPromisify.js';
import { TreeNode } from '../../core/bundles/bundleDataProvider.js';

// Type definition for test scenarios
type TestScenario = {
  name: string;
  initialBundle: {
    bundles: {
      [key: string]: {
        name: string;
        created: string;
        lastUsed: string;
        tags: string[];
        files: string[];
      };
    };
  };
  targetFile: string;
  expectedFiles: string[];
};

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
    // Use normalized pattern for Windows
    await deleteFiles(path.join(workspacePath, '**', '*.test*'));
  });

  teardown(async () => {
    // Use specific patterns for Windows compatibility
    await deleteFiles([
      path.join(workspacePath, '**', '*.test*'),
      path.join(workspacePath, '**', 'native-data.test.txt'),
      path.join(workspacePath, 'extension-data.test.txt'),
    ]);

    // Clean up any test bundles
    const repomixDir = path.join(workspacePath, '.repomix');
    try {
      if (existsSync(repomixDir)) {
        const bundlesFilePath = path.join(repomixDir, 'bundles.json');
        writeFileSync(bundlesFilePath, JSON.stringify({ bundles: {} }, null, 2));
      }
    } catch (error) {
      console.log('Error cleaning up test bundles', error);
    }
  });

  test('Extension should be activated', () => {
    assert.ok(extension.isActive, 'Extension is not active');
  });

  test('Test Workspace folder should be found', () => {
    const expectedPath = path.join('src', 'test', 'test-workspace', 'root');
    assert.ok(
      workspacePath.endsWith(expectedPath) ||
        path.normalize(workspacePath).endsWith(path.normalize(expectedPath)),
      `Test Workspace path "${workspacePath}" does not end with "${expectedPath}"`
    );
  });

  test('run repomixRunner.run command and verify file creation for the whole workspace', async function () {
    this.timeout(10000);
    await compareGeneratedFiles('', 'run');
  });

  test('run repomixRunner.runOnSelectedFiles at root/foo/bar/baz and verify file creation for this directory', async function () {
    this.timeout(10000);
    await compareGeneratedFiles(path.normalize('foo/bar/baz'), 'runOnSelectedFiles');
  });

  test('removeSelectionFromActiveBundleCommand should remove the selected file or directory from the bundle', async function () {
    this.timeout(10000);

    // Define test scenarios
    const testScenarios: TestScenario[] = [
      {
        name: 'Remove a file from a packed directory must eject the directory and remove the concerned file',
        initialBundle: {
          bundles: {
            test: {
              name: 'test',
              created: '2025-03-28T20:53:30.231Z',
              lastUsed: '2025-03-28T20:53:30.231Z',
              tags: [],
              files: [path.normalize('foo/bar')],
            },
          },
        },
        targetFile: path.normalize('foo/bar/baz/foobarbaz.py'),
        expectedFiles: [
          path.normalize('foo/bar/baz/foobarbaz.go'),
          path.normalize('foo/bar/baz/foobarbaz.js'),
          path.normalize('foo/bar/baz/foobarbaz2.go'),
          path.normalize('foo/bar/foobar.go'),
          path.normalize('foo/bar/foobar.js'),
          path.normalize('foo/bar/foobar.py'),
        ],
      },
      {
        name: 'Remove entire directory from a packed parent directory',
        initialBundle: {
          bundles: {
            directoryBundle: {
              name: 'DirectoryBundle',
              created: '2025-05-15T14:00:00.000Z',
              lastUsed: '2025-05-15T14:00:00.000Z',
              tags: ['directory'],
              files: [path.normalize('foo')],
            },
          },
        },
        targetFile: path.normalize('foo/bar/baz'),
        expectedFiles: [
          path.normalize('foo/bar2'),
          path.normalize('foo/bar/foobar.go'),
          path.normalize('foo/bar/foobar.js'),
          path.normalize('foo/bar/foobar.py'),
          path.normalize('foo/foo.go'),
        ],
      },
      {
        name: 'Remove a file from a partially compressed directory structure',
        initialBundle: {
          bundles: {
            mixedCompressionBundle: {
              name: 'MixedCompressionBundle',
              created: '2025-05-20T10:00:00.000Z',
              lastUsed: '2025-05-20T10:00:00.000Z',
              tags: ['mixed'],
              files: [path.normalize('foo/bar'), path.normalize('foo/bar2/foobar2.js')],
            },
          },
        },
        targetFile: path.normalize('foo/bar/baz/foobarbaz.go'),
        expectedFiles: [
          path.normalize('foo/bar2/foobar2.js'),
          path.normalize('foo/bar/baz/foobarbaz.js'),
          path.normalize('foo/bar/baz/foobarbaz.py'),
          path.normalize('foo/bar/baz/foobarbaz2.go'),
          path.normalize('foo/bar/foobar.go'),
          path.normalize('foo/bar/foobar.js'),
          path.normalize('foo/bar/foobar.py'),
        ],
      },
      {
        name: 'Remove simple file',
        initialBundle: {
          bundles: {
            fileTypeBundle: {
              name: 'FileTypeBundle',
              created: '2025-05-25T12:00:00.000Z',
              lastUsed: '2025-05-25T12:00:00.000Z',
              tags: ['extension'],
              files: [
                path.normalize('foo/bar/foobar.go'),
                path.normalize('foo/bar/foobar.js'),
                path.normalize('foo/bar/foobar.py'),
                path.normalize('foo/bar/baz/foobarbaz.go'),
                path.normalize('foo/bar/baz/foobarbaz.js'),
                path.normalize('foo/bar/baz/foobarbaz.py'),
              ],
            },
          },
        },
        targetFile: path.normalize('foo/bar/baz/foobarbaz.js'),
        expectedFiles: [
          path.normalize('foo/bar/foobar.go'),
          path.normalize('foo/bar/foobar.js'),
          path.normalize('foo/bar/foobar.py'),
          path.normalize('foo/bar/baz/foobarbaz.go'),
          path.normalize('foo/bar/baz/foobarbaz.py'),
        ],
      },
      {
        name: 'Remove a file from a compressed directory while keeping other compressed directories intact',
        initialBundle: {
          bundles: {
            test: {
              name: 'test',
              created: '2025-05-25T12:00:00.000Z',
              lastUsed: '2025-05-25T12:00:00.000Z',
              tags: [],
              files: [
                path.normalize('foo/bar/baz'),
                path.normalize('foo/bar/foobar.go'),
                path.normalize('foo/bar/foobar.js'),
                path.normalize('foo/bar/foobar.py'),
              ],
            },
          },
        },
        targetFile: path.normalize('foo/bar/foobar.py'),
        expectedFiles: [
          path.normalize('foo/bar/baz'),
          path.normalize('foo/bar/foobar.go'),
          path.normalize('foo/bar/foobar.js'),
        ],
      },
    ];

    // Sequential execution of all test scenarios
    for (const scenario of testScenarios) {
      console.log(`\nRunning test scenario: ${scenario.name}`);
      await testRemoveSelectionFromActiveBundle(scenario);
    }
  });

  /**
   * Parameterized test for removeSelectionFromActiveBundle
   * @param testScenario Test scenario containing input data and expected output
   */
  async function testRemoveSelectionFromActiveBundle(testScenario: TestScenario) {
    console.log(
      'Starting removeSelectionFromActiveBundle test' +
        (testScenario.name ? ` for scenario: ${testScenario.name}` : '')
    );

    const repomixDir = path.join(workspacePath, '.repomix');
    if (!existsSync(repomixDir)) {
      mkdirSync(repomixDir, { recursive: true });
    }

    const bundlesFilePath = path.join(repomixDir, 'bundles.json');

    writeFileSync(bundlesFilePath, JSON.stringify(testScenario.initialBundle, null, 2));

    const bundleId = Object.keys(testScenario.initialBundle.bundles)[0];

    const mockTreeNode: TreeNode = {
      bundleId: bundleId,
      label: testScenario.initialBundle.bundles[bundleId].name,
    };

    await vscode.commands.executeCommand('repomixRunner.selectActiveBundle', mockTreeNode);

    // Build the complete target path
    const targetPath = path.join(workspacePath, testScenario.targetFile);

    // Create a Uri from the target path and use it for the command
    const targetUri = vscode.Uri.file(targetPath);
    await vscode.commands.executeCommand(
      'repomixRunner.removeSelectedFilesFromActiveBundle',
      targetUri
    );

    // Read the bundles.json file after the command to verify changes
    const updatedBundlesFile = readFileSync(bundlesFilePath, 'utf8');
    const updatedBundle = JSON.parse(updatedBundlesFile);

    // Sort arrays for reliable comparison (order in arrays is not guaranteed)
    const actualFiles = [...updatedBundle.bundles[bundleId].files].sort();
    const expectedFiles = [...testScenario.expectedFiles].sort();

    assert.deepStrictEqual(
      actualFiles,
      expectedFiles,
      `Bundle files were not correctly updated after removing file in scenario ${
        testScenario.name || 'unknown'
      }`
    );
  }

  /**
   * Compares the files generated by the extension and the native repomix CLI for a given target directory.
   *
   * This function performs the following steps:
   * 1. Constructs the path for the target subdirectory within the workspace.
   * 2. Executes the 'repomixRunner.run' command on the subdirectory using the extension.
   * 3. Waits for the extension-generated file to be created and reads its content, excluding the first two lines (timestamp -> non deterministic).
   * 4. Deletes the extension-generated file to clean up.
   * 5. Then same steps for the native repomix CLI
   * 6. Asserts that the content of the files generated by the extension and the native CLI are identical.
   *
   * This function can break if:
   * - The 'repomixRunner.run' command fails to execute or does not generate the expected file.
   * - The native repomix CLI command fails to execute or does not generate the expected file.
   * - The file paths are incorrect or inaccessible.
   * - The content of the generated files differ, causing the assertion to fail.
   *
   * @param {string} targetDirectory - The target directory within the workspace to run the commands on.
   */
  async function compareGeneratedFiles(
    targetDirectory: string,
    command: 'run' | 'runOnSelectedFiles'
  ) {
    const subDirectoryPath = path.join(workspacePath, targetDirectory);
    const uri = vscode.Uri.file(subDirectoryPath);

    // Normalized filenames
    const extensionOutputFilename = 'extension-data.test.txt';
    const nativeOutputFilename = 'native-data.test.txt';

    // run the extension on the subdirectory
    await vscode.commands.executeCommand(`repomixRunner.${command}`, uri);
    const extentionGeneratedFilePath = path.join(workspacePath, extensionOutputFilename);
    await waitForFile(extentionGeneratedFilePath);
    const extensionGeneratedData = readFileSync(extentionGeneratedFilePath, 'utf8')
      .split('\n')
      .slice(2)
      .join('\n');

    // Ensure extension file is properly deleted, especially on Windows
    try {
      if (existsSync(extentionGeneratedFilePath)) {
        unlinkSync(extentionGeneratedFilePath);
      }
    } catch (err) {
      console.error(`Error deleting extension output file: ${err}`);
    }

    // run the native repomix CLI on the subdirectory
    // Use path.relative but ensure forward slashes for CLI regardless of platform
    const includeTarget = path
      .relative(workspacePath, path.join(workspacePath, targetDirectory))
      .split(path.sep)
      .join('/');

    // Build output path for native file
    const nativeOutputPath = path.join(
      targetDirectory ? targetDirectory : '',
      nativeOutputFilename
    );

    // Build command with properly escaped paths for Windows
    let cmd = `npx -y repomix "${workspacePath}"`;
    if (command === 'runOnSelectedFiles') {
      cmd += ` --include "${includeTarget}"`;
    }
    cmd += ` --output "${nativeOutputPath}"`;

    // Execute command in workspace directory
    await execPromisify(cmd, {
      cwd: workspacePath,
    });

    // Complete path to native output file
    const testFilePath = path.join(workspacePath, nativeOutputPath);

    await waitForFile(testFilePath);
    const testData = readFileSync(testFilePath, 'utf8').split('\n').slice(2).join('\n');

    // Ensure native file is properly deleted, especially on Windows
    try {
      if (existsSync(testFilePath)) {
        unlinkSync(testFilePath);
      }
    } catch (err) {
      console.error(`Error deleting native output file: ${err}`);
    }

    assert.strictEqual(
      testData,
      extensionGeneratedData,
      'The created file content does not match the expected content'
    );
  }
});

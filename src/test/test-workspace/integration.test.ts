import * as assert from 'assert';
import * as vscode from 'vscode';
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { deleteFiles, waitForFile } from '../utilsTest.js';
import { execPromisify } from '../../shared/execPromisify.js';
import { TreeNode } from '../../core/bundles/bundleDataProvider.js';

// Définition du type pour les scénarios de test
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
    deleteFiles(join(workspacePath, '**/*.test*'));
  });

  teardown(async () => {
    deleteFiles(join(workspacePath, '**/*.test*'));
    // Clean up any test bundles
    const repomixDir = join(workspacePath, '.repomix');
    try {
      writeFileSync(join(repomixDir, 'bundles.json'), JSON.stringify({ bundles: {} }, null, 2));
    } catch (error) {
      // Ignore
    }
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

  test('run repomixRunner.run command and verify file creation for the whole workspace', async function () {
    this.timeout(10000);
    await compareGeneratedFiles('');
  });

  test('run repomixRunner.run at root/foo/bar/baz and verify file creation for this directory', async function () {
    this.timeout(10000);
    // REFACTOR flaky test ?
    await compareGeneratedFiles('foo/bar/baz/');
  });

  test('removeSelectionFromActiveBundleCommand should remove the selected file or directory from the bundle', async function () {
    this.timeout(10000);

    // Définition des scénarios de test
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
              files: ['foo/bar'],
            },
          },
        },
        targetFile: 'foo/bar/baz/foobarbaz.py',
        expectedFiles: [
          'foo/bar/baz/foobarbaz.go',
          'foo/bar/baz/foobarbaz.js',
          'foo/bar/baz/foobarbaz2.go',
          'foo/bar/foobar.go',
          'foo/bar/foobar.js',
          'foo/bar/foobar.py',
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
              files: ['foo'],
            },
          },
        },
        targetFile: 'foo/bar/baz',
        expectedFiles: [
          'foo/bar2',
          'foo/bar/foobar.go',
          'foo/bar/foobar.js',
          'foo/bar/foobar.py',
          'foo/foo.go',
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
              files: ['foo/bar', 'foo/bar2/foobar2.js'],
            },
          },
        },
        targetFile: 'foo/bar/baz/foobarbaz.go',
        expectedFiles: [
          'foo/bar2/foobar2.js',
          'foo/bar/baz/foobarbaz.js',
          'foo/bar/baz/foobarbaz.py',
          'foo/bar/baz/foobarbaz2.go',
          'foo/bar/foobar.go',
          'foo/bar/foobar.js',
          'foo/bar/foobar.py',
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
                'foo/bar/foobar.go',
                'foo/bar/foobar.js',
                'foo/bar/foobar.py',
                'foo/bar/baz/foobarbaz.go',
                'foo/bar/baz/foobarbaz.js',
                'foo/bar/baz/foobarbaz.py',
              ],
            },
          },
        },
        targetFile: 'foo/bar/baz/foobarbaz.js',
        expectedFiles: [
          'foo/bar/foobar.go',
          'foo/bar/foobar.js',
          'foo/bar/foobar.py',
          'foo/bar/baz/foobarbaz.go',
          'foo/bar/baz/foobarbaz.py',
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
              files: ['foo/bar/baz', 'foo/bar/foobar.go', 'foo/bar/foobar.js', 'foo/bar/foobar.py'],
            },
          },
        },
        targetFile: 'foo/bar/foobar.py',
        expectedFiles: ['foo/bar/baz', 'foo/bar/foobar.go', 'foo/bar/foobar.js'],
      },
    ];

    // Exécution séquentielle de tous les scénarios de test
    for (const scenario of testScenarios) {
      console.log(`\nRunning test scenario: ${scenario.name}`);
      await testRemoveSelectionFromActiveBundle(scenario);
    }
  });

  /**
   * Test paramétrable pour removeSelectionFromActiveBundle
   * @param testScenario Scénario de test contenant les données d'entrée et de sortie attendues
   */
  async function testRemoveSelectionFromActiveBundle(testScenario: TestScenario) {
    console.log(
      'Starting removeSelectionFromActiveBundle test' +
        (testScenario.name ? ` for scenario: ${testScenario.name}` : '')
    );

    const repomixDir = join(workspacePath, '.repomix');
    if (!existsSync(repomixDir)) {
      mkdirSync(repomixDir, { recursive: true });
    }

    const bundlesFilePath = join(repomixDir, 'bundles.json');

    writeFileSync(bundlesFilePath, JSON.stringify(testScenario.initialBundle, null, 2));

    const bundleId = Object.keys(testScenario.initialBundle.bundles)[0];

    const mockTreeNode: TreeNode = {
      bundleId: bundleId,
      label: testScenario.initialBundle.bundles[bundleId].name,
    };

    await vscode.commands.executeCommand('repomixRunner.selectActiveBundle', mockTreeNode);

    const targetFile = testScenario.targetFile;
    const fileUri = vscode.Uri.file(join(workspacePath, targetFile));

    try {
      await vscode.workspace.fs.stat(fileUri);
    } catch (e) {}

    await vscode.commands.executeCommand(
      'repomixRunner.removeSelectedFilesFromActiveBundle',
      fileUri
    );

    const updatedBundleRaw = readFileSync(bundlesFilePath, 'utf8');
    const updatedBundle = JSON.parse(updatedBundleRaw);

    // Vérifier que le bundle existe toujours
    assert.ok(updatedBundle.bundles[bundleId], 'Bundle should still exist');
    assert.ok(
      Array.isArray(updatedBundle.bundles[bundleId].files),
      'Bundle should have files array'
    );

    // Trier les tableaux pour une comparaison cohérente (l'ordre n'est pas garanti)
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
  async function compareGeneratedFiles(targetDirectory: string) {
    const subDirectoryPath = join(workspacePath, targetDirectory);
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
    await execPromisify(
      `npx -y repomix ${targetDirectory} --output ${targetDirectory}native-data.test.txt`,
      {
        cwd: workspacePath,
      }
    );
    const testFilePath = join(subDirectoryPath, 'native-data.test.txt');
    await waitForFile(testFilePath);
    const testData = readFileSync(testFilePath, 'utf8').split('\n').slice(2).join('\n');
    deleteFiles([testFilePath]);

    assert.strictEqual(
      testData,
      extensionGeneratedData,
      'The created file content does not match the expected content'
    );
  }
});

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'node:path';
import {
  readRepomixRunnerVscodeConfig,
  readRepomixFileConfig,
  mergeConfigs,
  stripJsonComments,
} from '../../config/configLoader.js';
import {
  defaultConfig,
  type RepomixConfigFile,
  type RepomixRunnerConfigDefault,
} from '../../config/configSchema.js';
import { getCwd } from '../../config/getCwd.js';
import { logger } from '../../shared/logger.js';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';

suite('configLoader', () => {
  let testCwd: string;
  let targetDir: string;

  suiteSetup(() => {
    testCwd = getCwd();
    targetDir = path.join(testCwd, 'foo/bar');
  });

  suite('Vscode settings', () => {
    /**
     * Test to validate that VSCode configuration keys match the keys defined in package.json.
     *
     * This test ensures consistency between the configuration schema defined in `package.json`
     * and the Zod schema used in the application.
     *
     * Steps:
     * 1. Retrieve keys from `package.json` under the `contributes.configuration` section.
     * 2. Retrieve keys from the schema defined in the `RepomixRunnerConfigDefault` type.
     * 3. Compare the keys from both sources and assert they are identical.
     *
     * The test will fail if:
     * - There are keys in the schema that are missing in `package.json`.
     * - There are keys in `package.json` that are missing in the schema.
     *
     * @throws {AssertionError} If the keys from both sources do not match.
     */
    test('VSCode configuration keys should match package.json configuration keys', () => {
      // Step 1: Retrieve keys from package.json
      const packageConfig = require('../../../package.json').contributes.configuration;
      const packageJsonKeys = new Set<string>();

      packageConfig.forEach((section: any) => {
        Object.keys(section.properties).forEach(key => {
          // Convert keys like "repomix.output.style" to "output.style"
          packageJsonKeys.add(key.replace('repomix.', ''));
        });
      });

      // Step 2: Retrieve keys from the schema defined in Zod
      const schemaKeys = new Set<string>();

      // Retrieve keys from the type Config
      type Keys = keyof RepomixRunnerConfigDefault;
      const keys = Object.keys(defaultConfig) as Keys[];

      keys.forEach(key => {
        const value = defaultConfig[key];
        if (typeof value === 'object' && !Array.isArray(value)) {
          Object.keys(value).forEach(subKey => {
            schemaKeys.add(`${key}.${subKey}`);
          });
        } else {
          schemaKeys.add(key);
        }
      });

      // Step 3: Compare the keys
      const packageJsonKeysArray = [...packageJsonKeys].sort();
      const schemaKeysArray = [...schemaKeys].sort();

      // Find differences
      const missingInPackageJson = schemaKeysArray.filter(key => !packageJsonKeys.has(key));
      const missingInSchema = packageJsonKeysArray.filter(key => !schemaKeys.has(key));

      if (missingInPackageJson.length > 0 || missingInSchema.length > 0) {
        const errorMessages = [];
        if (missingInPackageJson.length > 0) {
          errorMessages.push(`Missing fields in package.json: ${missingInPackageJson.join(', ')}`);
        }
        if (missingInSchema.length > 0) {
          errorMessages.push(
            `Missing fields in RepomixRunnerConfigDefault: ${missingInSchema.join(', ')}`
          );
        }
        assert.fail(errorMessages.join('\n'));
      }

      assert.deepStrictEqual(
        packageJsonKeysArray,
        schemaKeysArray,
        'VSCode configuration keys should match schema keys'
      );
    });

    test('should return validated config from vscode settings menu', () => {
      const validConfigFromVscodeSettings: RepomixRunnerConfigDefault = {
        runner: {
          verbose: true,
          keepOutputFile: true,
          copyMode: 'file',
          useTargetAsOutput: true,
          useBundleNameAsOutputName: true,
        },
        output: {
          filePath: 'output.txt',
          style: 'plain',
          parsableStyle: false,
          headerText: '',
          instructionFilePath: '',
          fileSummary: true,
          directoryStructure: true,
          removeComments: false,
          removeEmptyLines: false,
          topFilesLength: 5,
          showLineNumbers: true,
          copyToClipboard: false,
          includeEmptyDirectories: false,
          compress: false,
        },
        include: ['**/*'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
        security: {
          enableSecurityCheck: true,
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      };
      // stub the vscode settings
      const configStub = sinon
        .stub(vscode.workspace, 'getConfiguration')
        .returns(validConfigFromVscodeSettings as any);

      try {
        const config = readRepomixRunnerVscodeConfig();
        assert.deepStrictEqual(config, validConfigFromVscodeSettings);
      } finally {
        configStub.restore();
      }
    });
  });

  suite('Repomix config file', () => {
    test('should read and validate repomix.config.json', async () => {
      const config = await readRepomixFileConfig(testCwd);
      assert.ok(config);
    });

    test('Logger should  be called when repomix.config.json does not exist', async () => {
      const loggerSpy = sinon.spy(logger.both, 'debug');
      const nonExistentPath = path.normalize('/non/existent/path');

      try {
        const config = await readRepomixFileConfig(nonExistentPath);

        assert.strictEqual(config, undefined);

        sinon.assert.calledOnce(loggerSpy);
        sinon.assert.calledWith(
          loggerSpy,
          `Can't access config file at ${path.join(nonExistentPath, 'repomix.config.json')}`
        );
      } finally {
        loggerSpy.restore();
      }
    });

    test('should throw error when repomix.config.json has invalid format', async () => {
      const invalidConfigContent = JSON.stringify({
        output: {
          style: 'invalid_style',
          filePath: 123,
        },
      });

      // Mock module fs/promises
      const originalReadFile = require('fs/promises').readFile;
      require('fs/promises').readFile = () => Promise.resolve(invalidConfigContent);

      try {
        await assert.rejects(readRepomixFileConfig(testCwd), /Invalid repomix.config.json format/);
      } finally {
        require('fs/promises').readFile = originalReadFile;
      }
    });

    test('should not throw error when repomix.config.json has comments', async () => {
      const configWithComments = `{
        // Output configuration
        "output": {
          "filePath": "test-output.txt"
        },
        /* Ignore configuration */
        "ignore": {
          "useGitignore": true // Use .gitignore file
        }
      }`;

      const readFileStub = sinon.stub(fs.promises, 'readFile');
      readFileStub.onFirstCall().resolves(configWithComments);
      readFileStub.onSecondCall().resolves(configWithComments);

      try {
        const result = await readRepomixFileConfig(testCwd);
        assert.deepStrictEqual(result, {
          output: { filePath: 'test-output.txt' },
          ignore: { useGitignore: true },
        });
      } finally {
        readFileStub.restore();
      }
    });
  });

  suite('mergeConfigs', () => {
    /**
     * @description Test to ensure that the configuration from repomix.config.json overrides the VSCode settings
     *
     * Steps:
     * 1. Define a VSCode configuration object with specific settings.
     * 2. Define a Repomix configuration file object with overriding settings.
     * 3. Merge the configurations using the mergeConfigs function.
     * 4. Assert that the merged configuration's target directory is correctly set.
     * 5. Assert that the merged configuration's target directory basename is correctly set.
     * 6. Verify that the output style in the merged configuration is set correctly.
     */
    test('repomix.config.json should override vscode settings', async () => {
      const vscodeConfig: RepomixRunnerConfigDefault = {
        runner: {
          verbose: false,
          keepOutputFile: true,
          copyMode: 'file',
          useTargetAsOutput: true,
          useBundleNameAsOutputName: true,
        },
        output: {
          filePath: 'output.txt',
          style: 'xml',
          parsableStyle: false,
          headerText: '',
          instructionFilePath: '',
          fileSummary: true,
          directoryStructure: true,
          removeComments: false,
          removeEmptyLines: false,
          topFilesLength: 10,
          showLineNumbers: true,
          copyToClipboard: false,
          includeEmptyDirectories: false,
          compress: false,
        },
        include: ['**/*'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: [],
        },
        security: {
          enableSecurityCheck: true,
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      };

      const fileConfig: RepomixConfigFile = {
        output: {
          style: 'plain',
          filePath: 'custom.txt',
          headerText: 'coucou',
          parsableStyle: true,
          instructionFilePath: 'instruction.txt',
          includeEmptyDirectories: true,
          compress: true,
        },
        ignore: {
          useGitignore: false,
          useDefaultPatterns: false,
        },
        tokenCount: {
          encoding: 'gpt2',
        },
      };

      const merged = await mergeConfigs(testCwd, fileConfig, vscodeConfig, null);

      assert.ok(merged.cwd === testCwd);
      assert.ok(merged.output.style === 'plain');
      assert.ok(merged.output.headerText === 'coucou');
      assert.ok(merged.output.parsableStyle === true);
      assert.ok(merged.output.instructionFilePath === 'instruction.txt');
      assert.ok(merged.output.includeEmptyDirectories === true);
      assert.ok(merged.output.compress === true);
      assert.ok(merged.ignore.useGitignore === false);
      assert.ok(merged.ignore.useDefaultPatterns === false);
      assert.ok(merged.tokenCount.encoding === 'gpt2');
    });

    /**
     * @description Test to ensure that the output path is correctly set relative to the target directory
     *
     * Steps:
     * 1. Define configurations with specific output file paths
     * 2. Merge the configurations
     * 3. Verify that the final output path is correctly set relative to the target directory
     */
    test('should set output path relative to the target directory if config.runner.useTargetAsOutput is true', async () => {
      const vscodeConfig: RepomixRunnerConfigDefault = {
        ...defaultConfig,
        runner: {
          ...defaultConfig.runner,
          useTargetAsOutput: true,
        },
        output: {
          ...defaultConfig.output,
          filePath: 'output.txt',
        },
      };

      const fileConfig: RepomixConfigFile = {
        output: {
          filePath: 'custom.txt',
        },
      };

      const merged = await mergeConfigs(testCwd, fileConfig, vscodeConfig, {
        include: ['foo/bar'],
      });
      assert.ok(
        path.relative(testCwd, merged.output.filePath) === path.normalize('foo/bar/custom.txt')
      );
    });

    test('should not set output path relative to the target directory if config.runner.useTargetAsOutput is false', async () => {
      const vscodeConfig: RepomixRunnerConfigDefault = {
        ...defaultConfig,
        runner: {
          ...defaultConfig.runner,
          useTargetAsOutput: false,
        },
        output: {
          ...defaultConfig.output,
          filePath: 'output.txt',
        },
      };

      const fileConfig: RepomixConfigFile = {
        output: {
          filePath: 'custom.txt',
        },
      };
      testCwd = path.normalize('/test/cwd');
      const merged = await mergeConfigs(testCwd, fileConfig, vscodeConfig, null);
      assert.ok(path.relative(testCwd, merged.output.filePath) === 'custom.txt');
    });

    /**
     * Test to ensure that when copyMode is set to 'file', the repomix.config.json
     * file should override the VSCode settings for the output file path.
     *
     * Steps:
     * 1. Create a VSCode configuration with copyMode set to 'file' and useTargetAsOutput set to true.
     * 2. Create a file configuration with a specific output file path.
     * 3. Merge these configurations.
     * 4. Assert that the merged configuration's targetPathRelative is 'foo/bar/repomixFileOutput.txt'.
     *
     * Possible Failures:
     * - The test may fail if the mergeConfigs function does not correctly prioritize the file configuration
     *   over the VSCode configuration.
     * - The test may also fail if the path resolution logic in mergeConfigs is incorrect.
     */
    test('when copyMode is file, repomix.config.json should override vscode settings', async () => {
      const vscodeConfig: RepomixRunnerConfigDefault = {
        ...defaultConfig,
        runner: {
          ...defaultConfig.runner,
          copyMode: 'file',
          useTargetAsOutput: true,
        },
        output: {
          ...defaultConfig.output,
          filePath: 'output.txt',
        },
      };

      const fileConfig: RepomixConfigFile = { output: { filePath: 'repomixFileOutput.txt' } };
      const merged = await mergeConfigs(testCwd, fileConfig, vscodeConfig, null);
      assert.strictEqual(path.basename(merged.output.filePath), 'repomixFileOutput.txt');
    });

    /**
     * Test to ensure that the repomix.config.json file overrides the VSCode settings
     * for include and ignore patterns.
     *
     * Steps:
     * 1. Create a VSCode configuration with specific include and ignore patterns.
     * 2. Create a file configuration with overriding include and ignore patterns.
     * 3. Merge these configurations.
     * 4. Assert that the merged configuration's include and ignore.customPatterns match the file configuration.
     * 5. Create an empty file configuration.
     * 6. Merge the empty file configuration with the VSCode configuration.
     * 7. Assert that the merged configuration's include and ignore.customPatterns match the VSCode configuration.
     *
     * Possible Failures:
     * - The test may fail if the mergeConfigs function does not correctly prioritize the file configuration
     *   over the VSCode configuration for include and ignore patterns.
     * - The test may also fail if the mergeConfigs function does not correctly handle an empty file configuration,
     *   resulting in incorrect defaults from the VSCode configuration.
     */
    test('repomix.config.json file should override vscode settings for include and ignore patterns', async () => {
      const vscodeConfig: RepomixRunnerConfigDefault = {
        ...defaultConfig,
        include: ['**/*.txt'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: ['**/*.md'],
        },
      };

      const fileConfig: RepomixConfigFile = {
        include: ['**/*.js'],
        ignore: {
          customPatterns: ['**/*.ts'],
        },
      };
      const merged = await mergeConfigs(testCwd, fileConfig, vscodeConfig, null);
      assert.deepStrictEqual(merged.include, ['**/*.js']);
      assert.deepStrictEqual(merged.ignore.customPatterns, ['**/*.ts']);

      const fileconfigEmpty = {};
      const mergedEmpty = await mergeConfigs(testCwd, fileconfigEmpty, vscodeConfig, null);
      assert.deepStrictEqual(mergedEmpty.include, ['**/*.txt']);
      assert.deepStrictEqual(mergedEmpty.ignore.customPatterns, ['**/*.md']);
    });

    test('overrideConfig should override all previous configurations', async () => {
      const vscodeConfig: RepomixRunnerConfigDefault = {
        ...defaultConfig,
        runner: {
          ...defaultConfig.runner,
          verbose: false,
          keepOutputFile: false,
        },
        output: {
          ...defaultConfig.output,
          style: 'xml',
          filePath: 'vscode-output.txt',
          showLineNumbers: false,
        },
        include: ['**/*.vscode'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: true,
          customPatterns: ['**/*.vscode.ignore'],
        },
        tokenCount: {
          encoding: 'o200k_base',
        },
      };

      const fileConfig: RepomixConfigFile = {
        output: {
          style: 'markdown',
          filePath: 'file-output.md',
        },
        include: ['**/*.file'],
        ignore: {
          useGitignore: false,
          customPatterns: ['**/*.file.ignore'],
        },
        tokenCount: {
          encoding: 'gpt2',
        },
      };

      const overrideConfig: RepomixConfigFile = {
        output: {
          style: 'plain',
          filePath: 'override-output.txt',
          showLineNumbers: true,
        },
        include: ['**/*.override'],
        ignore: {
          useGitignore: true,
          useDefaultPatterns: false,
          customPatterns: ['**/*.override.ignore'],
        },
        tokenCount: {
          encoding: 'cl100k_base',
        },
      };

      const merged = await mergeConfigs(testCwd, fileConfig, vscodeConfig, overrideConfig);

      // Check that overrideConfig values are applied
      assert.strictEqual(merged.output.style, 'plain');
      assert.strictEqual(path.basename(merged.output.filePath), 'override-output.txt');
      assert.strictEqual(merged.output.showLineNumbers, true);
      assert.deepStrictEqual(merged.include, ['**/*.override']);
      assert.strictEqual(merged.ignore.useGitignore, true);
      assert.strictEqual(merged.ignore.useDefaultPatterns, false);
      assert.deepStrictEqual(merged.ignore.customPatterns, ['**/*.override.ignore']);
      assert.strictEqual(merged.tokenCount.encoding, 'cl100k_base');
    });

    /**
     * Test to ensure that the output file path extension is correctly set with the correct file extension
     * for different output styles.
     *
     * Steps:
     * 1. Create a VSCode configuration with a specific output style.
     * 2. Create a file configuration with an empty output file path.
     * 3. Merge these configurations.
     * 4. Assert that the merged configuration's output file path has the correct file extension.
     */
    const styleExtensionTests = [
      { style: 'plain' as const, extension: '.txt' },
      { style: 'xml' as const, extension: '.xml' },
      { style: 'markdown' as const, extension: '.md' },
      { style: 'json' as const, extension: '.json' },
    ];

    styleExtensionTests.forEach(({ style, extension }) => {
      test(`should handle ${style} style file extension correctly`, async () => {
        // Test without extension
        const configWithoutExt: RepomixRunnerConfigDefault = {
          ...defaultConfig,
          output: {
            ...defaultConfig.output,
            style,
            filePath: 'output',
          },
        };
        const mergedWithoutExt = await mergeConfigs(testCwd, {}, configWithoutExt, null);
        assert.strictEqual(path.basename(mergedWithoutExt.output.filePath), `output${extension}`);

        // Test with correct extension already set, it should not be overridden twice
        const configWithExt: RepomixRunnerConfigDefault = {
          ...defaultConfig,
          output: {
            ...defaultConfig.output,
            style,
            filePath: `output${extension}`,
          },
        };
        const mergedWithExt = await mergeConfigs(testCwd, {}, configWithExt, null);
        assert.strictEqual(path.basename(mergedWithExt.output.filePath), `output${extension}`);

        // Test with other known extension set, it should be replaced (e.g., xml -> json)
        // Only run this branch when there is at least one other known extension different from the expected one
        const other = styleExtensionTests.find(e => e.extension !== extension);
        if (other) {
          const configWithWrongExt: RepomixRunnerConfigDefault = {
            ...defaultConfig,
            output: {
              ...defaultConfig.output,
              style,
              filePath: `output${other.extension}`,
            },
          };
          const mergedWithWrongExt = await mergeConfigs(testCwd, {}, configWithWrongExt, null);
          assert.strictEqual(
            path.basename(mergedWithWrongExt.output.filePath),
            `output${extension}`
          );
        }
      });
    });
  });
});

suite('stripJsonComments utility', () => {
  // Hardcoded config generated by npx repomix --init (XML style)
  // ⚠️  WARNING: This config may become obsolete if Repomix format changes.
  // To update: run `npx repomix --init` and replace the content below.
  const REAL_REPOMIX_CONFIG = `{
  "$schema": "https://repomix.com/schemas/latest/schema.json",
  "input": {
    "maxFileSize": 52428800
  },
  "output": {
    "filePath": "repomix-output.xml",
    "style": "xml",
    "parsableStyle": false,
    "fileSummary": true,
    "directoryStructure": true,
    "files": true,
    "removeComments": false,
    "removeEmptyLines": false,
    "compress": false,
    "topFilesLength": 5,
    "showLineNumbers": false,
    "truncateBase64": false,
    "copyToClipboard": false,
    "git": {
      "sortByChanges": true,
      "sortByChangesMaxCommits": 100,
      "includeDiffs": false
    }
  },
  "include": [],
  "ignore": {
    "useGitignore": true,
    "useDefaultPatterns": true,
    "customPatterns": []
  },
  "security": {
    "enableSecurityCheck": true
  },
  "tokenCount": {
    "encoding": "o200k_base"
  }
}`;

  test('should read recent repomix.config.json generated by npx repomix --init without error', async () => {
    console.log('⚠️  Using hardcoded config - may need update if Repomix format changes');

    // Create temp dir and write the real config
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'repomix-test-'));
    try {
      await fsp.writeFile(path.join(tempDir, 'repomix.config.json'), REAL_REPOMIX_CONFIG);
      const config = await readRepomixFileConfig(tempDir);

      assert.ok(config, 'Config should be defined');
      assert.ok((config as any).output, 'Config should have output section');
    } finally {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('should not treat // in URL as comment and preserve it', () => {
    const jsonWithUrlAndComment = `{
      "$schema": "https://repomix.com/schemas/latest/schema.json", // This is a comment
      "test": "value"
    }`;

    const stripped = stripJsonComments(jsonWithUrlAndComment);

    assert.ok(
      stripped.includes('"https://repomix.com/schemas/latest/schema.json"'),
      'URL should be preserved'
    );
    assert.ok(!stripped.includes('This is a comment'), 'Comment should be removed');

    assert.doesNotThrow(() => JSON.parse(stripped));
  });
});

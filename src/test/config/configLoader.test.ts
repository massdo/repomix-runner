import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'node:path';
import {
  readRepomixRunnerVscodeConfig,
  readRepomixFileConfig,
  mergeConfigs,
} from '../../config/configLoader';
import {
  defaultConfig,
  type RepomixConfigFile,
  type RepomixRunnerConfigDefault,
} from '../../config/configSchema';
import { getCwd } from '../../config/getCwd';
import { logger } from '../../shared/logger';
import * as fs from 'fs';

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

    test('Logger should be called when repomix.config.json does not exist', async () => {
      const loggerSpy = sinon.spy(logger.both, 'debug');

      try {
        const config = await readRepomixFileConfig('/non/existent/path');

        assert.strictEqual(config, undefined);

        sinon.assert.calledOnce(loggerSpy);
        sinon.assert.calledWith(loggerSpy, 'repomix.config.json file does not exist');
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
    test('repomix.config.json should override vscode settings', () => {
      const vscodeConfig: RepomixRunnerConfigDefault = {
        runner: {
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

      const merged = mergeConfigs(testCwd, fileConfig, vscodeConfig, targetDir);

      assert.ok(merged.targetDir === targetDir);
      assert.ok(merged.targetDirBasename === path.relative(testCwd, targetDir));
      assert.ok(merged.output.style === 'plain'); // xml from vscode settings is overridden by plain from repomix.config.json
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
    test('should set output path relative to the target directory if config.runner.useTargetAsOutput is true', () => {
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

      const merged = mergeConfigs(testCwd, fileConfig, vscodeConfig, targetDir);
      assert.ok(path.relative(testCwd, merged.output.filePath) === 'foo/bar/custom.txt');
    });

    test('should not set output path relative to the target directory if config.runner.useTargetAsOutput is false', () => {
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

      const merged = mergeConfigs(testCwd, fileConfig, vscodeConfig, targetDir);
      assert.ok(path.relative(testCwd, merged.output.filePath) === 'custom.txt');
    });

    /**
     * Test to verify that when the copyMode is set to 'file', the copied file name
     * should be the relative target directory path combined with the config.output.filePath.
     *
     * Steps:
     * 1. Create a VSCode configuration with copyMode set to 'file' and useTargetAsOutput set to true.
     * 2. Merge this configuration with an empty file configuration.
     * 3. Assert that the merged configuration's targetPathRelative is 'foo/bar/output.txt'.
     *
     * Possible Failures:
     * - The test may fail if the mergeConfigs function does not correctly prioritize the VSCode configuration
     *   when the file configuration is empty.
     * - The test may also fail if the path resolution logic in mergeConfigs is incorrect.
     */
    test('when copyMode is file, copied file name should be the reelative target dir path + config.output.filePath', () => {
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

      const fileConfig: RepomixConfigFile = {};
      const merged = mergeConfigs(testCwd, fileConfig, vscodeConfig, targetDir);
      assert.strictEqual(merged.targetPathRelative, 'foo/bar/output.txt');
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
    test('when copyMode is file, repomix.config.json should override vscode settings', () => {
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
      const merged = mergeConfigs(testCwd, fileConfig, vscodeConfig, targetDir);
      assert.strictEqual(merged.targetPathRelative, 'foo/bar/repomixFileOutput.txt');
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
    test('repomix.config.json file should override vscode settings for include and ignore patterns', () => {
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

      const merged = mergeConfigs(testCwd, fileConfig, vscodeConfig, targetDir);
      assert.deepStrictEqual(merged.include, ['**/*.js']);
      assert.deepStrictEqual(merged.ignore.customPatterns, ['**/*.ts']);

      const fileconfigEmpty = {};
      const mergedEmpty = mergeConfigs(testCwd, fileconfigEmpty, vscodeConfig, targetDir);
      assert.deepStrictEqual(mergedEmpty.include, ['**/*.txt']);
      assert.deepStrictEqual(mergedEmpty.ignore.customPatterns, ['**/*.md']);
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
    ];

    styleExtensionTests.forEach(({ style, extension }) => {
      test(`should handle ${style} style file extension correctly`, () => {
        // Test without extension
        const configWithoutExt: RepomixRunnerConfigDefault = {
          ...defaultConfig,
          output: {
            ...defaultConfig.output,
            style,
            filePath: 'output',
          },
        };
        const mergedWithoutExt = mergeConfigs(testCwd, {}, configWithoutExt, targetDir);
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
        const mergedWithExt = mergeConfigs(testCwd, {}, configWithExt, targetDir);
        assert.strictEqual(path.basename(mergedWithExt.output.filePath), `output${extension}`);
      });
    });
  });
});

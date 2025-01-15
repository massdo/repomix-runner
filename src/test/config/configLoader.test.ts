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
      console.log('Package.json keys:', [...packageJsonKeys]);

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
        },
        output: {
          filePath: 'output.txt',
          style: 'plain',
          fileSummary: true,
          directoryStructure: true,
          removeComments: false,
          removeEmptyLines: false,
          topFilesLength: 5,
          showLineNumbers: true,
          copyToClipboard: false,
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

        console.log(
          'Spy calls:',
          loggerSpy.getCalls().map(call => call.args)
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
        },
        output: {
          filePath: 'output.txt',
          style: 'xml',
          fileSummary: true,
          directoryStructure: true,
          removeComments: false,
          removeEmptyLines: false,
          topFilesLength: 10,
          showLineNumbers: true,
          copyToClipboard: false,
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
      };

      const fileConfig: RepomixConfigFile = {
        output: {
          style: 'plain',
          filePath: 'custom.txt',
        },
      };

      const merged = mergeConfigs(testCwd, fileConfig, vscodeConfig, targetDir);

      assert.ok(merged.targetDir === targetDir);
      assert.ok(merged.targetDirBasename === path.relative(testCwd, targetDir));
      assert.ok(merged.output.style === 'plain'); // xml from vscode settings is overridden by plain from repomix.config.json
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
  });
});

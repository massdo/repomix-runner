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

import * as assert from 'assert';
import * as path from 'node:path';
import { runRepomix } from '../../commands/runRepomix.js';
import { type ChildProcess, type ExecOptions } from 'child_process';
import { execPromisify } from '../../shared/execPromisify.js';
import { MergedConfig } from '../../config/configSchema.js';
import { tempDirManager } from '../../core/files/tempDirManager.js';

type PromiseWithChild<T> = Promise<T> & { child: ChildProcess };

suite('runRepomix', () => {
  const mockExecPromisify = ((command: string, options?: ExecOptions) => {
    const promise = Promise.resolve({ stdout: '', stderr: '' });
    (promise as PromiseWithChild<{ stdout: string; stderr: string }>).child = {} as ChildProcess;
    return promise as PromiseWithChild<{ stdout: string; stderr: string }>;
  }) as unknown as typeof execPromisify;

  const baseTestConfig: MergedConfig = {
    cwd: '/fake/target',
    runner: {
      verbose: false,
      keepOutputFile: true,
      copyMode: 'file' as const,
      useTargetAsOutput: false,
      useBundleNameAsOutputName: true,
    },
    output: {
      filePath: '/fake/output.txt',
      style: 'plain' as const,
      parsableStyle: false,
      headerText: '',
      instructionFilePath: '',
      fileSummary: true,
      directoryStructure: true,
      removeComments: false,
      removeEmptyLines: false,
      topFilesLength: 5,
      showLineNumbers: false,
      copyToClipboard: false,
      includeEmptyDirectories: false,
      compress: false,
    },
    include: [],
    ignore: { useGitignore: true, useDefaultPatterns: true, customPatterns: [] },
    security: { enableSecurityCheck: true },
    tokenCount: { encoding: 'o200k_base' },
  };

  test('should call copyToClipboard when config.output.copyToClipboard is true and config.runner.copyMode is file', async () => {
    // Setup
    let copyToClipboardCalled = false;
    let copyToClipboardArgs: any[] = [];

    const mockConfig = {
      ...baseTestConfig,
      output: {
        ...baseTestConfig.output,
        copyToClipboard: true,
      },
    };

    const mockDeps = {
      tempDirManager: tempDirManager,
      getCwd: () => baseTestConfig.cwd,
      copyToClipboard: (...args: any[]) => {
        copyToClipboardCalled = true;
        copyToClipboardArgs = args;
        return Promise.resolve();
      },
      mergeConfigs: () => Promise.resolve(mockConfig),
      readRepomixRunnerVscodeConfig: () => mockConfig,
      readRepomixFileConfig: () => Promise.resolve(),
      cliFlagsBuilder: () => '',
      execPromisify: mockExecPromisify,
      cleanOutputFile: () => Promise.resolve(),
      mergeConfigOverride: null,
    };

    // Execute
    await runRepomix(mockDeps);

    // Assert
    assert.strictEqual(copyToClipboardCalled, true, 'copyToClipboard should have been called');
    assert.strictEqual(
      path.basename(copyToClipboardArgs[0]),
      path.basename(baseTestConfig.output.filePath),
      'copyToClipboard should be called with correct file path'
    );
    assert.ok(
      new RegExp(`^[0-9]{3}_${path.basename(baseTestConfig.output.filePath)}$`).test(
        path.basename(copyToClipboardArgs[1])
      ),
      'copyToClipboard temp file should contain <3digit>_<fileName> format'
    );
  });

  test('should call cleanOutputFile when config.runner.keepOutputFile is false', async () => {
    // Setup
    let cleanOutputFileCalled = false;
    let cleanOutputFileArgs: any[] = [];

    const mockConfig = {
      ...baseTestConfig,
      runner: {
        ...baseTestConfig.runner,
        keepOutputFile: false,
      },
    };

    const mockDeps = {
      tempDirManager: tempDirManager,
      getCwd: () => '/fake/cwd',
      cleanOutputFile: (...args: any[]) => {
        cleanOutputFileCalled = true;
        cleanOutputFileArgs = args;
        return Promise.resolve();
      },
      mergeConfigs: () => Promise.resolve(mockConfig),
      readRepomixRunnerVscodeConfig: () => mockConfig,
      readRepomixFileConfig: () => Promise.resolve(),
      cliFlagsBuilder: () => '',
      execPromisify: mockExecPromisify,
      copyToClipboard: () => Promise.resolve(),
      mergeConfigOverride: null,
    };

    // Execute
    await runRepomix(mockDeps);

    // Assert
    assert.strictEqual(cleanOutputFileCalled, true, 'cleanOutputFile should have been called');
    assert.strictEqual(
      cleanOutputFileArgs[0],
      '/fake/output.txt',
      'cleanOutputFile should be called with correct file path'
    );
  });
});

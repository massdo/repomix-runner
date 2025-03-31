import * as assert from 'assert';
import { cliFlagsBuilder } from '../../../core/cli/cliFlagsBuilder.js';
import { defaultConfig, MergedConfig } from '../../../config/configSchema.js';

suite('CliFlagsBuilder', () => {
  let baseConfig: MergedConfig;

  setup(() => {
    baseConfig = {
      ...defaultConfig,
      targetDirBasename: 'test-dir',
      targetDir: '/path/to/test-dir',
      targetPathRelative: 'relative/path/to/test-dir',
    };
  });

  //TODO --version

  test('should add "--output" file path flag when output.filePath is specified', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, filePath: 'custom-output.txt' },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--output "custom-output.txt"'));
  });

  test('should add "--include" flag when config.include is specified', () => {
    const config: MergedConfig = {
      ...baseConfig,
      include: ['*.ts', '*.js'],
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--include "*.ts,*.js"'));
  });

  test('should add "--ignore" flag when config.ignore.customPatterns is specified', () => {
    const config: MergedConfig = {
      ...baseConfig,
      ignore: { ...baseConfig.ignore, customPatterns: ['node_modules', 'dist'] },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--ignore "node_modules,dist"'));
  });

  //TODO config

  test('should add "--style" flag when output.style is specified', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, style: 'markdown' },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--style markdown'));
  });

  test('should add "--parsable-style" flag when output.parsableStyle is true', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, parsableStyle: true },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--parsable-style'));
  });

  test('should add "--header-text" flag when output.headerText is specified', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, headerText: 'coucou' },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--header-text "coucou"'));
  });

  test('should add "--instruction-file-path" flag when output.instructionFilePath is specified', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, instructionFilePath: 'instruction.txt' },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--instruction-file-path "instruction.txt"'));
  });

  test('should add "--include-empty-directories" flag when output.includeEmptyDirectories is true', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, includeEmptyDirectories: true },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--include-empty-directories'));
  });

  test('should add "--no-gitignore" flag when ignore.useGitignore is false', () => {
    const config: MergedConfig = {
      ...baseConfig,
      ignore: { ...baseConfig.ignore, useGitignore: false },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--no-gitignore'));
  });

  test('should add "--no-default-patterns" flag when ignore.useDefaultPatterns is false', () => {
    const config: MergedConfig = {
      ...baseConfig,
      ignore: { ...baseConfig.ignore, useDefaultPatterns: false },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--no-default-patterns'));
  });

  test('shouldf add "--token-count-encoding" flag when config.tokenCountEncoding is specified', () => {
    const config: MergedConfig = {
      ...baseConfig,
      tokenCount: {
        encoding: 'o200k_base',
      },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--token-count-encoding o200k_base'));
  });

  test('should add "--no-file-summary" flag when output.fileSummary is false', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, fileSummary: false },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--no-file-summary'));
  });

  test('should add "--no-directory-structure" flag when output.directoryStructure is false', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, directoryStructure: false },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--no-directory-structure'));
  });

  test('should add "--remove-comments" flag when output.removeComments is true', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, removeComments: true },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--remove-comments'));
  });

  test('should add "--remove-empty-lines" flag when output.removeEmptyLines is true', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, removeEmptyLines: true },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--remove-empty-lines'));
  });

  test('should add "--top-files-len" flag when output.topFilesLength is not default', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, topFilesLength: 10 },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--top-files-len 10'));
  });

  test('should add "--output-show-line-numbers" flag when output.showLineNumbers is true', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, showLineNumbers: true },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--output-show-line-numbers'));
  });

  test('should add "--copy" flag when output.copyToClipboard is true and runner.copyMode is "content"', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, copyToClipboard: true },
      runner: { ...baseConfig.runner, copyMode: 'content' },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--copy'));
  });

  test('should not add "--copy" flag when output.copyToClipboard is true and runner.copyMode is "file"', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, copyToClipboard: true },
      runner: { ...baseConfig.runner, copyMode: 'file' },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(!flags.includes('--copy'));
  });

  //TODO --remote

  //TODO --remote-branch

  test('should add "--no-security-check" flag when config.security.enableSecurityCheck is false', () => {
    const config: MergedConfig = {
      ...baseConfig,
      security: { enableSecurityCheck: false },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--no-security-check'));
  });

  //TODO --token-count-encoding

  //TODO --verbose

  //HELP  no flag yet for this config in repomix ?
  //   test('should add "--no-gitignore" flag when ignore.useGitignore is false', () => {
  //     const config: MergedConfig = {
  //       ...baseConfig,
  //       ignore: { ...baseConfig.ignore, useGitignore: false },
  //     };
  //     const flags = cliFlagsBuilder(config);
  //     assert.ok(flags.includes('--no-gitignore'));
  //   });
  //HELP  no flag yet for this config in repomix ?
  // test('should add "--no-default-ignore" flag when ignore.useDefaultPatterns is false', () => {
  //   const config: MergedConfig = {
  //     ...baseConfig,
  //     ignore: { ...baseConfig.ignore, useDefaultPatterns: false },
  //   };
  //   const flags = cliFlagsBuilder(config);
  //   assert.ok(flags.includes('--no-default-ignore'));
  // });

  test('should add "--compress" flag when output.compress is true', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: { ...baseConfig.output, compress: true },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--compress'));
  });

  test('should combine all flags correctly', () => {
    const config: MergedConfig = {
      ...baseConfig,
      output: {
        ...baseConfig.output,
        filePath: 'output.txt',
        style: 'markdown',
        fileSummary: false,
        directoryStructure: false,
        removeComments: true,
        removeEmptyLines: true,
        topFilesLength: 10,
        showLineNumbers: true,
        copyToClipboard: true,
        compress: true,
      },
      include: ['*.ts', '*.js'],
      ignore: {
        ...baseConfig.ignore,
        useGitignore: false,
        useDefaultPatterns: false,
        customPatterns: ['node_modules', 'dist'],
      },
      security: {
        enableSecurityCheck: false,
      },
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(flags.includes('--output "output.txt"'));
    assert.ok(flags.includes('--style markdown'));
    assert.ok(flags.includes('--no-file-summary'));
    assert.ok(flags.includes('--no-directory-structure'));
    assert.ok(flags.includes('--remove-comments'));
    assert.ok(flags.includes('--remove-empty-lines'));
    assert.ok(flags.includes('--top-files-len 10'));
    assert.ok(flags.includes('--output-show-line-numbers'));
    // assert.ok(flags.includes('--copy')); // Uncomment if clipboard conflict is resolved
    assert.ok(flags.includes('--include "*.ts,*.js"'));
    assert.ok(flags.includes('--ignore "node_modules,dist"'));
    assert.ok(flags.includes('--no-security-check'));
    assert.ok(flags.includes('--compress'));
  });

  test('should normalize Windows paths with backslashes in config.include', () => {
    const config: MergedConfig = {
      ...baseConfig,
      include: [
        'path\\to\\file.js',
        'another\\path\\file.ts',
        '\\root\\path.js',
        'mixed/path\\with/backslash.js',
      ],
    };
    const flags = cliFlagsBuilder(config);
    assert.ok(
      flags.includes(
        '--include "path/to/file.js,another/path/file.ts,/root/path.js,mixed/path/with/backslash.js"'
      )
    );
  });
});

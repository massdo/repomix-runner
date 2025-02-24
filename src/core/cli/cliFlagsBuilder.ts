import { MergedConfig } from '../../config/configSchema.js';

export const cliFlags = {
  // keep this up to date with repomix official cli flags
  // if a flag is not supported it will fail the tests
  output: {
    filePath: '--output',
    style: '--style',
    parsableStyle: '--parsable-style',
    headerText: '--header-text',
    instructionFilePath: '--instruction-file-path',
    fileSummary: '--no-file-summary',
    directoryStructure: '--no-directory-structure',
    removeComments: '--remove-comments',
    removeEmptyLines: '--remove-empty-lines',
    showLineNumbers: '--output-show-line-numbers',
    copyToClipboard: '--copy',
    topFilesLength: '--top-files-len',
    includeEmptyDirectories: '--include-empty-directories',
    compress: '--compress',
  },
  include: '--include',
  ignore: {
    useGitignore: '--no-gitignore',
    useDefaultPatterns: '--no-default-patterns',
    customPatterns: '--ignore',
  },
  security: {
    enableSecurityCheck: '--no-security-check',
  },
  tokenCount: {
    encoding: '--token-count-encoding',
  },
} as const;

export function cliFlagsBuilder(config: MergedConfig, flags = cliFlags): string {
  const outputFlags: string[] = [];

  // REFACTOR si une clée de config n'est pas dans le la flagsmapping alors on le log en disant la config n'est pas supportée

  // Output
  if (config.output.filePath) {
    outputFlags.push(`${flags.output.filePath} "${config.output.filePath}"`);
  }
  if (config.output.style) {
    outputFlags.push(`${flags.output.style} ${config.output.style}`);
  }
  if (config.output.parsableStyle) {
    outputFlags.push(flags.output.parsableStyle);
  }
  if (config.output.headerText) {
    outputFlags.push(`${flags.output.headerText} "${config.output.headerText}"`);
  }
  if (config.output.instructionFilePath) {
    outputFlags.push(`${flags.output.instructionFilePath} "${config.output.instructionFilePath}"`);
  }
  if (config.output.includeEmptyDirectories) {
    outputFlags.push(flags.output.includeEmptyDirectories);
  }
  if (!config.output.fileSummary) {
    outputFlags.push(flags.output.fileSummary);
  }
  if (!config.output.directoryStructure) {
    outputFlags.push(flags.output.directoryStructure);
  }
  if (config.output.removeComments) {
    outputFlags.push(flags.output.removeComments);
  }
  if (config.output.removeEmptyLines) {
    outputFlags.push(flags.output.removeEmptyLines);
  }
  if (config.output.showLineNumbers) {
    outputFlags.push(flags.output.showLineNumbers);
  }
  if (config.output.copyToClipboard && config.runner.copyMode === 'content') {
    // if copyMode is file then we handle the copy in copyToClipboard function
    // HELP -> ask to repomix to support copyMode as a new feature
    outputFlags.push(flags.output.copyToClipboard);
  }
  if (config.output.topFilesLength !== 5) {
    outputFlags.push(`${flags.output.topFilesLength} ${config.output.topFilesLength}`);
  }
  if (config.output.compress) {
    outputFlags.push(flags.output.compress);
  }
  // Include
  if (config.include.length > 0) {
    outputFlags.push(`${flags.include} "${config.include.join(',')}"`);
  }
  // Ignore
  if (config.ignore.customPatterns.length > 0) {
    outputFlags.push(`${flags.ignore.customPatterns} "${config.ignore.customPatterns.join(',')}"`);
  }
  if (!config.ignore.useGitignore) {
    outputFlags.push(flags.ignore.useGitignore);
  }
  if (!config.ignore.useDefaultPatterns) {
    outputFlags.push(flags.ignore.useDefaultPatterns);
  }
  // Security
  if (!config.security.enableSecurityCheck) {
    outputFlags.push(flags.security.enableSecurityCheck);
  }
  // Token Count
  if (config.tokenCount.encoding) {
    outputFlags.push(`${flags.tokenCount.encoding} ${config.tokenCount.encoding}`);
  }

  return outputFlags.join(' ');
}

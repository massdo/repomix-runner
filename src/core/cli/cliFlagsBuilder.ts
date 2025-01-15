import { MergedConfig } from '../../config/configSchema';

export const cliFlags = {
  // keep this up to date with repomix official cli flags
  // if a flag is not supported it will fail the tests
  output: {
    filePath: '--output',
    style: '--style',
    headerText: null, // MEMO no flag yet for this config in repomix ?
    instructionFilePath: null, // MEMO no flag yet for this config in repomix ?
    fileSummary: '--no-file-summary',
    directoryStructure: '--no-directory-structure',
    removeComments: '--remove-comments',
    removeEmptyLines: '--remove-empty-lines',
    showLineNumbers: '--output-show-line-numbers',
    copyToClipboard: '--copy',
    topFilesLength: '--top-files-len',
    includeEmptyDirectories: null, // MEMO no flag yet for this config in repomix ?
  },
  include: '--include',
  ignore: {
    useGitignore: null, // MEMO no flag yet for this config in repomix ?
    useDefaultPatterns: null, // MEMO no flag yet for this config in repomix ?
    customPatterns: '--ignore',
  },
  security: {
    enableSecurityCheck: '--no-security-check',
  },
  tokenCount: {
    encoding: null, // MEMO no flag yet for this config in repomix ?
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
  // Include
  if (config.include.length > 0) {
    outputFlags.push(`${flags.include} "${config.include.join(',')}"`);
  }
  // Ignore
  if (config.ignore.customPatterns.length > 0) {
    outputFlags.push(`${flags.ignore.customPatterns} "${config.ignore.customPatterns.join(',')}"`);
  }
  // Security
  if (!config.security.enableSecurityCheck) {
    outputFlags.push(flags.security.enableSecurityCheck);
  }

  return outputFlags.join(' ');
}

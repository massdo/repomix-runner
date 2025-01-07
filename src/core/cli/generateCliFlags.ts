import { MergedConfig } from '../../config/configLoad';

export function generateCliFlags(config: MergedConfig): string {
  const flags: string[] = [];

  // Output options
  if (config.output.filePath) {
    flags.push(`--output "${config.output.filePath}"`);
  }
  if (config.output.style) {
    flags.push(`--style ${config.output.style}`);
  }
  if (!config.output.fileSummary) {
    flags.push('--no-file-summary');
  }
  if (!config.output.directoryStructure) {
    flags.push('--no-directory-structure');
  }
  if (config.output.removeComments) {
    flags.push('--remove-comments');
  }
  if (config.output.removeEmptyLines) {
    flags.push('--remove-empty-lines');
  }
  if (config.output.showLineNumbers) {
    flags.push('--output-show-line-numbers');
  }
  // if (config.output.copyToClipboard) { // conflit avec le clipboard de lextension
  //   flags.push('--copy');
  // }
  if (config.output.topFilesLength !== 5) {
    flags.push(`--top-files-len ${config.output.topFilesLength}`);
  }

  // Include patterns
  if (config.include.length > 0) {
    flags.push(`--include "${config.include.join(',')}"`);
  }

  // Ignore patterns
  if (config.ignore.customPatterns.length > 0) {
    flags.push(`--ignore "${config.ignore.customPatterns.join(',')}"`);
  }

  // Security check
  if (!config.security.enableSecurityCheck) {
    flags.push('--no-security-check');
  }

  return flags.join(' ');
}

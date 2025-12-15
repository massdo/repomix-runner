import { Bundle } from '../core/bundles/types.js';

export function generateOutputFilename(
  bundle: Bundle,
  configFilePath: string,
  useBundleNameAsOutputName: boolean
): string {
  // If bundle has specific output defined, use it directly
  if (bundle.output) {
    return bundle.output;
  }

  // If we shouldn't use bundle name, return the original config path
  if (!useBundleNameAsOutputName) {
    return configFilePath;
  }

  // Handle the default case where we inject the bundle name
  const extension = configFilePath.split('.').pop() || '';
  const baseName = configFilePath.substring(0, configFilePath.lastIndexOf('.'));

  const snakeCaseName = bundle.name
    .replace(/\s+/g, '-')
    .toLowerCase();

  return `${baseName}.${snakeCaseName}.${extension}`;
}

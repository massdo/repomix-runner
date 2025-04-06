import { setTimeout } from 'node:timers/promises';
import { existsSync, unlinkSync } from 'node:fs';
import * as path from 'node:path';

export const waitForFile = async (filePath: string, timeout: number = 5000): Promise<void> => {
  const start = Date.now();
  while (!existsSync(filePath)) {
    if (Date.now() - start > timeout) {
      throw new Error(`File ${filePath} was not created within ${timeout}ms`);
    }
    await setTimeout(100);
  }
};

export const deleteFiles = async (patterns: string | string[]): Promise<void> => {
  const { globby } = await import('globby');

  try {
    // If it's a single file path and not a pattern, try direct deletion first (Windows workaround)
    if (typeof patterns === 'string' && !patterns.includes('*')) {
      if (existsSync(patterns)) {
        try {
          unlinkSync(patterns);
          return; // Exit early, file deleted
        } catch (error) {
          console.error(`Direct delete failed for ${patterns}, falling back to globby`, error);
        }
      }
    } else if (Array.isArray(patterns)) {
      // Try direct deletion for array items that look like file paths
      for (const pattern of patterns) {
        if (!pattern.includes('*') && existsSync(pattern)) {
          try {
            unlinkSync(pattern);
            // Continue with remaining patterns that might be globs
          } catch (error) {
            console.error(`Direct delete failed for ${pattern}, will try with globby`, error);
          }
        }
      }
    }

    // Normalize the patterns for Windows/Unix compatibility
    const normalizedPatterns = Array.isArray(patterns)
      ? patterns.map(p => path.normalize(p))
      : path.normalize(patterns);

    // Use globby with onlyFiles: true to avoid directory issues on Windows
    const filePaths = await globby(normalizedPatterns, {
      onlyFiles: true,
      absolute: true, // Use absolute paths for more reliable deletion
    });

    for (const filePath of filePaths) {
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch (error) {
          console.error(`Error deleting file ${filePath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error in deleteFiles with patterns ${patterns}:`, error);
  }
};

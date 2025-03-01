import { setTimeout } from 'node:timers/promises';
import { existsSync, unlinkSync } from 'node:fs';
const fg = require('fast-glob');

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
  const filePaths = await fg(patterns);
  filePaths.forEach((filePath: string) => {
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }
    }
  });
};

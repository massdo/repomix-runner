import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { logger } from '../../shared/logger.js';
import { setTimeout } from 'node:timers/promises';
import { access, unlink } from 'node:fs/promises';
import { showTempNotification } from '../../shared/showTempNotification.js';

export class TempDirManager {
  private defaultTempDirName: string = 'repomix_runner';
  private tempDir: string = path.join(os.tmpdir(), this.defaultTempDirName);

  constructor(name: string) {
    this.createTempDir(name);
  }

  public createTempDir(name: string): string {
    logger.both.debug(`Creating temp directory IN CLASS ->  ${name}`);
    this.tempDir = path.join(os.tmpdir(), name);
    if (!fs.existsSync(this.tempDir)) {
      try {
        fs.mkdirSync(this.tempDir);
      } catch (error) {
        logger.both.error(`Failed to create temp directory ${this.tempDir}: ${error}`);
        showTempNotification(`Failed to create temp directory ${this.tempDir}: ${error}`);
        throw new Error(`Failed to create temp directory ${this.tempDir}: ${error}`);
      }
    }
    logger.both.debug(`Created temp directory : ${this.tempDir}`);
    return this.tempDir;
  }

  public getTempDir(): string {
    return this.tempDir;
  }

  public cleanup() {
    if (this.tempDir && fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true });
      logger.output.debug(`Cleaned up temp directory: ${this.tempDir}`); // BUG logger not working
    }
  }

  public async cleanupFile(tmpFilePath: string, delay: number = 3 * 60_000): Promise<void> {
    // TODO integration test
    try {
      await setTimeout(delay);
      // Check if file exists before trying to delete
      try {
        await access(tmpFilePath);
        await unlink(tmpFilePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, nothing to do
      }
    } catch (error) {
      logger.output.error(`Failed to delete temp file ${tmpFilePath}:`, error);
    }
  }
}

export const tempDirManager = new TempDirManager('repomix_runner');

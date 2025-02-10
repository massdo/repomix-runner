import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Bundle, BundleMetadata } from './types';
import { logger } from '../../shared/logger';

export class BundleManager {
  private readonly repomixDir: string;
  private readonly bundlesFile: string;

  constructor(workspaceRoot: string) {
    this.repomixDir = path.join(workspaceRoot, '.repomix');
    this.bundlesFile = path.join(this.repomixDir, 'bundles.json');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.repomixDir, { recursive: true });
      
      try {
        await fs.access(this.bundlesFile);
      } catch {
        // File doesn't exist, create it
        await fs.writeFile(this.bundlesFile, JSON.stringify({ bundles: {} }, null, 2));
      }
    } catch (error) {
      logger.both.error('Failed to initialize bundle storage:', error);
      throw error;
    }
  }

  async getAllBundles(): Promise<BundleMetadata> {
    try {
      await this.initialize(); // Make sure the file exists
      const content = await fs.readFile(this.bundlesFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.both.error('Failed to read bundles:', error);
      throw error;
    }
  }

  async saveBundle(bundle: Bundle): Promise<void> {
    try {
      const metadata = await this.getAllBundles();
      metadata.bundles[bundle.name] = bundle;
      await fs.writeFile(this.bundlesFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
      logger.both.error('Failed to save bundle:', error);
      throw error;
    }
  }

  async deleteBundle(bundleName: string): Promise<void> {
    try {
      const metadata = await this.getAllBundles();
      delete metadata.bundles[bundleName];
      await fs.writeFile(this.bundlesFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
      logger.both.error('Failed to delete bundle:', error);
      throw error;
    }
  }
}
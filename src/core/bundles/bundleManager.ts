import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { logger } from '../../shared/logger';
import { Bundle, BundleMetadata } from './types';
import { showTempNotification } from '../../shared/showTempNotification';

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

  async selectBundle(): Promise<Bundle | undefined> {
    const metadata = await this.getAllBundles();
    const bundleNames = Object.keys(metadata.bundles);

    if (bundleNames.length === 0) {
      showTempNotification(
        'No bundles found. Create a bundle first by selecting files and using "Save as Bundle".'
      );
      return undefined;
    }

    const items = bundleNames.map(name => {
      const bundle = metadata.bundles[name];
      return {
        label: name,
        description: bundle.description || '',
        detail: `${bundle.files.length} files • ${bundle.tags.join(', ')}`,
        bundle: bundle,
      };
    });

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a bundle to run',
      title: 'Run Repomix Bundle',
    });

    if (!selected) {
      return undefined;
    }

    return selected.bundle;
  }
}

import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { Bundle, BundleMetadata } from './types.js';

export class BundleManager {
  private readonly repomixDir: string;
  private readonly bundlesFile: string;
  readonly onDidChangeBundles = new vscode.EventEmitter<void>();
  readonly onDidChangeActiveBundle = new vscode.EventEmitter<string | null>();
  private _activeBundleId: string | null = null;

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
        await fs.writeFile(this.bundlesFile, JSON.stringify({ bundles: {} }, null, 2));
      }
    } catch (error) {
      console.error('Failed to initialize bundle storage:', error);
      throw error;
    }
  }

  async setActiveBundle(bundleId: string | null): Promise<void> {
    await vscode.commands.executeCommand(
      'setContext',
      'activeBundleId',
      bundleId ? [bundleId] : null
    );

    this._activeBundleId = bundleId;
    this.onDidChangeActiveBundle.fire(bundleId);
  }

  getActiveBundleId(): string | null {
    return this._activeBundleId;
  }

  async getActiveBundle(): Promise<Bundle | undefined> {
    if (!this._activeBundleId) {
      return;
    }

    return await this.getBundle(this._activeBundleId);
  }

  async getAllBundles(): Promise<BundleMetadata> {
    try {
      await this.initialize();
      const content = await fs.readFile(this.bundlesFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read bundles:', error);
      throw error;
    }
  }

  async getBundle(bundleId: string): Promise<Bundle> {
    try {
      const { bundles } = await this.getAllBundles();
      return bundles[bundleId];
    } catch (error) {
      console.error('Failed to get bundle:', error);
      throw error;
    }
  }

  async saveBundle(id: string, payload: Bundle): Promise<void> {
    try {
      const { bundles } = await this.getAllBundles();
      bundles[id] = payload;

      const metadata: BundleMetadata = { bundles: bundles };

      await fs.writeFile(this.bundlesFile, JSON.stringify(metadata, null, 2));

      this.onDidChangeBundles.fire();
    } catch (error) {
      console.error('Failed to save bundle:', error);
      throw error;
    }
  }

  async deleteBundle(id: string): Promise<void> {
    try {
      const { bundles } = await this.getAllBundles();
      delete bundles[id];

      const metadata: BundleMetadata = { bundles: bundles };

      await fs.writeFile(this.bundlesFile, JSON.stringify(metadata, null, 2));

      this.setActiveBundle(null);
      this.onDidChangeBundles.fire();
    } catch (error) {
      console.error('Failed to delete bundle:', error);
      throw error;
    }
  }
}

import { Bundle, BundleMetadata } from './types.js';

export interface Refreshable {
  refresh(): void;
}

export interface IBundleManager {
  initialize(): Promise<void>;
  getAllBundles(): Promise<BundleMetadata>;
  saveBundle(bundle: Bundle): Promise<void>;
  deleteBundle(bundleName: string): Promise<void>;
  selectBundle(): Promise<Bundle | undefined>;
}

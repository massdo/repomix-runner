export interface Bundle {
    name: string;
    description?: string;
    created: string;
    lastUsed: string;
    tags: string[];
    files: string[];
}
  
export interface BundleMetadata {
    bundles: {
        [key: string]: Bundle;
    };
}
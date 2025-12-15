import * as fs from 'fs/promises';
import * as path from 'path';

interface FileStats {
  files: number;
  folders: number;
  totalSize: number;
}

// Simple in-memory cache: bundleId -> FileStats
const statsCache = new Map<string, FileStats>();

// Helper to clear cache (e.g., when a bundle is updated)
export function invalidateStatsCache(bundleId?: string) {
  if (bundleId) {
    statsCache.delete(bundleId);
  } else {
    statsCache.clear();
  }
}

async function getPathStats(filePath: string): Promise<FileStats> {
  const stats: FileStats = { files: 0, folders: 0, totalSize: 0 };

  try {
    const fileStat = await fs.stat(filePath);

    if (fileStat.isDirectory()) {
      stats.folders = 1; // Count the folder itself? Usually users care about contents.
                         // Requirement: "differentiate between files and folders"
                         // Let's count the folder itself as 1 folder.

      const entries = await fs.readdir(filePath);
      for (const entry of entries) {
        const entryPath = path.join(filePath, entry);
        const childStats = await getPathStats(entryPath);
        stats.files += childStats.files;
        stats.folders += childStats.folders;
        stats.totalSize += childStats.totalSize;
      }
    } else {
      stats.files = 1;
      stats.totalSize = fileStat.size;
    }
  } catch (error) {
    // If file doesn't exist or access denied, ignore it
  }

  return stats;
}

export async function calculateBundleStats(cwd: string, bundleId: string, filePaths: string[]): Promise<FileStats> {
  // Check cache first?
  // The issue is that file contents on disk might change without the bundle definition changing.
  // However, traversing the FS every time might be heavy.
  // For now, let's cache based on bundleId and clear it manually if needed,
  // OR we assume the user accepts that stats are a snapshot at load time.
  // Requirement: "store the stats in cache somewhere"

  if (statsCache.has(bundleId)) {
    return statsCache.get(bundleId)!;
  }

  const totalStats: FileStats = { files: 0, folders: 0, totalSize: 0 };

  for (const relativePath of filePaths) {
    const absolutePath = path.resolve(cwd, relativePath);
    const itemStats = await getPathStats(absolutePath);

    totalStats.files += itemStats.files;
    totalStats.folders += itemStats.folders;
    totalStats.totalSize += itemStats.totalSize;
  }

  statsCache.set(bundleId, totalStats);
  return totalStats;
}

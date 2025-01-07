import { access, unlink } from 'fs/promises';
import { setTimeout } from 'timers/promises';

export async function cleanupTempFile(tmpFilePath: string): Promise<void> {
  try {
    await setTimeout(1 * 60_000);
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
    console.log(`Failed to delete temp file ${tmpFilePath}:`, error);
  }
}

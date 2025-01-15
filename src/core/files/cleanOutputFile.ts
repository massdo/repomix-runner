import { unlink } from 'fs/promises';
import { logger } from '../../shared/logger';

/**
 * Deletes the specified output file with logging.
 *
 * @param {string} outputFileAbs - The absolute path of the output file to be deleted.
 * @returns {Promise<void>} - A promise that resolves when the file deletion is complete.
 */
export async function cleanOutputFile(outputFileAbs: string): Promise<void> {
  try {
    await unlink(outputFileAbs);
  } catch (unlinkError) {
    logger.console.error('Error deleting output file:', unlinkError);
  }
}

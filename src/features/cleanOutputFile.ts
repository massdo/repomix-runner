import { unlink } from 'fs/promises';

export async function cleanOutputFile(outputFileAbs: string, keepOutputFile: boolean) {
  if (!keepOutputFile) {
    try {
      await unlink(outputFileAbs);
    } catch (unlinkError) {
      console.error('Error deleting output file:', unlinkError);
    }
  }
}

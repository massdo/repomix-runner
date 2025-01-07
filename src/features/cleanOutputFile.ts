import { unlink } from 'fs/promises';

export async function cleanOutputFile(outputFilePathAbs: string, keepOutputFile: boolean) {
  if (!keepOutputFile) {
    try {
      await unlink(outputFilePathAbs);
    } catch (unlinkError) {
      console.error('Error deleting output file:', unlinkError);
    }
  }
}

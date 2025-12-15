import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the bin directory exists in the project root
const binPath = path.resolve(__dirname, '..', 'bin');

if (!fs.existsSync(binPath)) {
  fs.mkdirSync(binPath, { recursive: true });
}

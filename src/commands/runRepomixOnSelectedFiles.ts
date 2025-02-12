import * as vscode from 'vscode';
import { runRepomix } from './runRepomix';
import { getCwd } from '../config/getCwd';
import { tempDirManager } from '../core/files/tempDirManager';
import { defaultRunRepomixDeps } from './runRepomix';
import { logger } from '../shared/logger';
import { showTempNotification } from '../shared/showTempNotification';
import * as path from 'path';

export async function runRepomixOnSelectedFiles(uris: vscode.Uri[]) {
  const cwd = getCwd();

  if (!uris || uris.length === 0) {
    logger.both.info('No files selected');
    showTempNotification('No files selected to run this command! :)');
    return;
  }

  const selectedFiles = uris.map(uri => path.relative(cwd, uri.fsPath));

  let targetDir = cwd;

  let isDirectory = false;

  if (uris.length === 1 && !path.extname(uris[0].fsPath)) {
    // we need to change the target dir to stick to the option "use target as output"
    // if the selection is multiple then the output will be the cwd by default
    // REFACTOR
    isDirectory = true;
    targetDir = uris[0].fsPath;
  }

  logger.both.info(`Running repomix on selected files: ${selectedFiles.join(', ')}`);

  const overrideConfig = isDirectory ? {} : { include: selectedFiles };

  runRepomix(targetDir, tempDirManager.getTempDir(), {
    ...defaultRunRepomixDeps,
    mergeConfigOverride: overrideConfig,
  });
}

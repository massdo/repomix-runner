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

  logger.both.info(`Running repomix on selected files: ${selectedFiles.join(', ')}`);
  
  const overrideConfig = { include: selectedFiles };
  
  runRepomix(cwd, tempDirManager.getTempDir(), {
    ...defaultRunRepomixDeps,
    mergeConfigOverride: overrideConfig,
  });
}
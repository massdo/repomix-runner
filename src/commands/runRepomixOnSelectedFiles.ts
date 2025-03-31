import * as vscode from 'vscode';
import { runRepomix } from './runRepomix.js';
import { getCwd } from '../config/getCwd.js';
import { tempDirManager } from '../core/files/tempDirManager.js';
import { defaultRunRepomixDeps } from './runRepomix.js';
import { logger } from '../shared/logger.js';
import { showTempNotification } from '../shared/showTempNotification.js';
import * as path from 'path';
import { RepomixConfigFile } from '../config/configSchema.js';

export async function runRepomixOnSelectedFiles(
  uris: vscode.Uri[],
  overrideConfig: RepomixConfigFile = {}
) {
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

  // TODO add test for config merging
  const finalOverrideConfig = {
    ...overrideConfig,
    ...(isDirectory ? {} : { include: selectedFiles }),
  };

  await runRepomix(targetDir, tempDirManager.getTempDir(), {
    ...defaultRunRepomixDeps,
    mergeConfigOverride: finalOverrideConfig,
  });
}

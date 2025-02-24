import { runRepomix } from './runRepomix.js';
import { getCwd } from '../config/getCwd.js';
import { tempDirManager } from '../core/files/tempDirManager.js';
import { defaultRunRepomixDeps } from './runRepomix.js';
import { getOpenFiles } from '../config/getOpenFiles.js';
import { logger } from '../shared/logger.js';
import { showTempNotification } from '../shared/showTempNotification.js';

export async function runRepomixOnOpenFiles() {
  const cwd = getCwd();

  const openFiles = getOpenFiles(cwd);

  if (openFiles.length === 0) {
    logger.both.info('No open files found');
    showTempNotification('No open files found to run this command ! :)');

    return;
  }

  const overrideConfig = { include: openFiles };

  logger.both.info(`Running repomix on open files: ${openFiles.join(', ')}`);

  runRepomix(cwd, tempDirManager.getTempDir(), {
    ...defaultRunRepomixDeps,
    mergeConfigOverride: overrideConfig,
  });
}

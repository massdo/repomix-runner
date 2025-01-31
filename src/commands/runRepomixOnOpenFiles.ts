import { runRepomix } from './runRepomix';
import { getCwd } from '../config/getCwd';
import { tempDirManager } from '../core/files/tempDirManager';
import { defaultRunRepomixDeps } from './runRepomix';
import { getOpenFiles } from '../config/getOpenFiles';
import { logger } from '../shared/logger';
import { showTempNotification } from '../shared/showTempNotification';

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

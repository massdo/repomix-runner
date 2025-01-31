import { runRepomix } from './runRepomix';
import { getCwd } from '../config/getCwd';
import { tempDirManager } from '../core/files/tempDirManager';
import { defaultRunRepomixDeps } from './runRepomix';
import { getOpenFiles } from '../config/getOpenFiles';
import { logger } from '../shared/logger';

export async function runRepomixOnOpenFiles() {
  const cwd = getCwd();

  const openFiles = getOpenFiles(cwd);

  const overrideConfig = { include: openFiles };

  logger.both.info(`Running repomix on open files: ${openFiles.join(', ')}`);

  runRepomix(cwd, tempDirManager.getTempDir(), {
    ...defaultRunRepomixDeps,
    mergeConfigOverride: overrideConfig,
  });
}

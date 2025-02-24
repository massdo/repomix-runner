import * as assert from 'assert';
import * as sinon from 'sinon';
import { runRepomixOnOpenFiles } from '../../commands/runRepomixOnOpenFiles.js';
import * as getOpenFilesModule from '../../config/getOpenFiles.js';
import * as getCwdModule from '../../config/getCwd.js';
import * as runRepomixModule from '../../commands/runRepomix.js';
import { defaultRunRepomixDeps } from '../../commands/runRepomix.js';
import { tempDirManager } from '../../core/files/tempDirManager.js';
import { logger } from '../../shared/logger.js';
import * as showTempNotificationModule from '../../shared/showTempNotification.js';

suite('runRepomixOnOpenFiles', () => {
  let sandbox: sinon.SinonSandbox;
  let getOpenFilesStub: sinon.SinonStub;
  let getCwdStub: sinon.SinonStub;
  let runRepomixStub: sinon.SinonStub;
  let getTempDirStub: sinon.SinonStub;
  let showTempNotificationStub: sinon.SinonStub;
  let loggerInfoStub: sinon.SinonStub;

  setup(() => {
    sandbox = sinon.createSandbox();

    // Setup stubs
    getOpenFilesStub = sandbox.stub(getOpenFilesModule, 'getOpenFiles');
    getCwdStub = sandbox.stub(getCwdModule, 'getCwd');
    runRepomixStub = sandbox.stub(runRepomixModule, 'runRepomix');
    getTempDirStub = sandbox.stub(tempDirManager, 'getTempDir');
    showTempNotificationStub = sandbox.stub(showTempNotificationModule, 'showTempNotification');
    loggerInfoStub = sandbox.stub(logger.both, 'info');
  });

  teardown(() => {
    sandbox.restore();
  });

  test('should run repomix with open files config', async () => {
    // Setup test data
    const mockCwd = '/test/path';
    const mockOpenFiles = ['file1.ts', 'file2.ts'];
    const mockTempDir = '/temp/dir';

    // Configure stubs
    getCwdStub.returns(mockCwd);
    getOpenFilesStub.returns(mockOpenFiles);
    getTempDirStub.returns(mockTempDir);

    // Run the function
    await runRepomixOnOpenFiles();

    // Verify the behavior
    assert.strictEqual(getCwdStub.calledOnce, true, 'getCwd should be called once');
    assert.strictEqual(getOpenFilesStub.calledOnce, true, 'getOpenFiles should be called once');
    assert.strictEqual(runRepomixStub.calledOnce, true, 'runRepomix should be called once');

    // Verify runRepomix was called with correct arguments
    sinon.assert.calledWith(runRepomixStub, mockCwd, mockTempDir, {
      ...defaultRunRepomixDeps,
      mergeConfigOverride: { include: mockOpenFiles },
    });
  });

  test('should show notification and not run repomix when no files are open', async () => {
    const mockCwd = '/test/path';

    getCwdStub.returns(mockCwd);
    getOpenFilesStub.returns([]);

    await runRepomixOnOpenFiles();

    // Verify that notification was shown
    sinon.assert.calledWith(
      showTempNotificationStub,
      'No open files found to run this command ! :)'
    );

    // Verify that logger was called
    sinon.assert.calledWith(loggerInfoStub, 'No open files found');

    // Verify that runRepomix was not called
    assert.strictEqual(runRepomixStub.called, false, 'runRepomix should not be called');
  });
});

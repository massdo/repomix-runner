import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';
import { runRepomix, defaultRunRepomixDeps } from '../../commands/runRepomix.js';
import * as getCwdModule from '../../config/getCwd.js';
import { MergedConfig } from '../../config/configSchema.js';

suite('runRepomix (failure case)', () => {
  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('should NOT create .repomix directory when npx fails with auth error', async () => {
    const cwd = path.normalize('/test/project');

    // Stub getCwd to return deterministic path
    sandbox.stub(getCwdModule, 'getCwd').returns(cwd);

    // Stub execPromisify to simulate npx failure
    const execStub = sandbox.stub().rejects(new Error('simulated npx failure'));

    // Minimal merged config stub used by runRepomix downstream
    const fakeConfig: MergedConfig = {
      cwd,
      include: ['src/index.ts'],
      output: {
        filePath: path.join(cwd, 'repomix-output.xml'),
        style: 'xml',
        copyToClipboard: false,
        parsableStyle: undefined,
        headerText: undefined,
        instructionFilePath: undefined,
        includeEmptyDirectories: undefined,
      },
      runner: {
        keepOutputFile: true,
        copyMode: 'content',
        useTargetAsOutput: false,
        useBundleNameAsOutputName: true,
        verbose: false,
      },
      ignore: {
        customPatterns: [],
        useGitignore: undefined,
      },
      security: {},
      tokenCount: {},
    } as unknown as MergedConfig;

    const mergeConfigsStub = sandbox.stub().resolves(fakeConfig);

    // Spies on fs methods to detect any .repomix creation
    const mkdirSpy = sandbox.spy(fs.promises, 'mkdir');
    const writeFileSpy = sandbox.spy(fs.promises, 'writeFile');

    // Run and expect rejection
    await assert.rejects(
      runRepomix({
        ...defaultRunRepomixDeps,
        execPromisify: execStub,
        mergeConfigs: mergeConfigsStub as any,
        getCwd: getCwdModule.getCwd,
      })
    );

    // Ensure no mkdir/writeFile targeting .repomix folder happened
    sinon.assert.neverCalledWithMatch(
      mkdirSpy,
      sinon.match(val => typeof val === 'string' && val.includes('.repomix'))
    );
    sinon.assert.neverCalledWithMatch(
      writeFileSpy,
      sinon.match(val => typeof val === 'string' && val.includes('.repomix'))
    );
  });
});

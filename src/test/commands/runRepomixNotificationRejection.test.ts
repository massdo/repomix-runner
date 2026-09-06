import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { setTimeout as delay } from 'timers/promises';
import { type ChildProcess, type ExecOptions } from 'child_process';
import { runRepomix, defaultRunRepomixDeps } from '../../commands/runRepomix.js';
import { execPromisify } from '../../shared/execPromisify.js';
import { MergedConfig } from '../../config/configSchema.js';

type PromiseWithChild<T> = Promise<T> & { child: ChildProcess };

suite('runRepomix (notification promise rejection)', () => {
  let sandbox: sinon.SinonSandbox;
  let unhandledRejections: unknown[];
  let onUnhandledRejection: (reason: unknown) => void;

  setup(() => {
    sandbox = sinon.createSandbox();
    unhandledRejections = [];
    onUnhandledRejection = reason => unhandledRejections.push(reason);
    process.on('unhandledRejection', onUnhandledRejection);
  });

  teardown(() => {
    process.removeListener('unhandledRejection', onUnhandledRejection);
    sandbox.restore();
  });

  // Exercises the real showTempNotification through runRepomix's actual call site.
  // Only vscode.window.withProgress is stubbed (to avoid real UI), but its task
  // callback is the genuine one from showTempNotification, run to completion with
  // real timers, so the promise chain that used to reject unhandled is the real one.
  async function assertNoUnhandledNotificationRejection(rejectDelayMs: number) {
    const cwd = '/fake/target';
    const failureError = new Error(`simulated npx failure at ${rejectDelayMs}ms`);

    sandbox.stub(vscode.window, 'withProgress').callsFake(((_options: unknown, task: any) =>
      task({ report: () => {} }, { isCancellationRequested: false })) as any);
    const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

    const execStub = ((command: string, options?: ExecOptions) => {
      const promise = delay(rejectDelayMs).then(() => {
        throw failureError;
      });
      (promise as PromiseWithChild<never>).child = {} as ChildProcess;
      return promise as PromiseWithChild<never>;
    }) as unknown as typeof execPromisify;

    const copyToClipboard = sandbox.spy(() => Promise.resolve());
    const cleanOutputFile = sandbox.spy(() => Promise.resolve());

    const fakeConfig: MergedConfig = {
      cwd,
      include: ['src/index.ts'],
      output: {
        filePath: '/fake/output.txt',
        style: 'xml',
        copyToClipboard: true,
        parsableStyle: undefined,
        headerText: undefined,
        instructionFilePath: undefined,
        includeEmptyDirectories: undefined,
      },
      runner: {
        keepOutputFile: false,
        copyMode: 'file',
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

    await assert.rejects(
      runRepomix({
        ...defaultRunRepomixDeps,
        getCwd: () => cwd,
        mergeConfigs: sandbox.stub().resolves(fakeConfig) as any,
        execPromisify: execStub,
        copyToClipboard: copyToClipboard as any,
        cleanOutputFile: cleanOutputFile as any,
      }),
      (err: unknown) => err === failureError
    );

    // The original rejection and its user-facing error notification must survive the fix.
    sinon.assert.calledOnce(showErrorMessageStub);
    sinon.assert.calledWith(showErrorMessageStub, failureError.message);

    // No output copy/cleanup must happen on the failure path.
    sinon.assert.notCalled(copyToClipboard);
    sinon.assert.notCalled(cleanOutputFile);

    // Give the internal notification promise's rejection time to surface as an
    // unhandled rejection (it goes through its own 50ms gate) before asserting.
    await delay(rejectDelayMs + 200);

    assert.strictEqual(
      unhandledRejections.length,
      0,
      `expected the notification promise rejection to be handled, got: ${unhandledRejections}`
    );
  }

  test('handles the notification promise rejection when the command fails before the initial 50ms delay', async () => {
    await assertNoUnhandledNotificationRejection(0);
  });

  test('handles the notification promise rejection when the command fails after the initial 50ms delay', async () => {
    await assertNoUnhandledNotificationRejection(80);
  });
});

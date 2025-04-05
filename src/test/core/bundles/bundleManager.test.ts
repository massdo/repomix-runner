import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { BundleManager } from '../../../core/bundles/bundleManager';
import { Bundle } from '../../../core/bundles/types';
import * as fs from 'fs';

suite('BundleManager', () => {
  let bundleManager: BundleManager;
  let sandbox: sinon.SinonSandbox;
  const workspaceRoot = '/test-workspace';

  setup(() => {
    sandbox = sinon.createSandbox();

    // Create BundleManager instance
    bundleManager = new BundleManager(workspaceRoot);

    // Stub internal methods to avoid file system operations
    sandbox.stub(bundleManager, 'initialize').resolves();
    sandbox.stub(vscode.commands, 'executeCommand').resolves();
  });

  teardown(() => {
    sandbox.restore();
  });

  test('constructor should initialize properties correctly', () => {
    assert.ok(bundleManager, 'BundleManager should be instantiated');
    assert.strictEqual(
      (bundleManager as any).repomixDir,
      '/test-workspace/.repomix',
      'repomixDir should be set correctly'
    );
    assert.strictEqual(
      (bundleManager as any).bundlesFile,
      '/test-workspace/.repomix/bundles.json',
      'bundlesFile should be set correctly'
    );
  });

  test('setActiveBundle should update active bundle ID and fire event', async () => {
    // Arrange
    const fireSpy = sandbox.spy((bundleManager as any).onDidChangeActiveBundle, 'fire');
    const executeCommandStub = vscode.commands.executeCommand as sinon.SinonStub;

    // Act
    await bundleManager.setActiveBundle('test-bundle-id');

    // Assert
    assert.strictEqual(
      bundleManager.getActiveBundleId(),
      'test-bundle-id',
      'Active bundle ID should be updated'
    );
    assert.strictEqual(
      fireSpy.calledOnceWithExactly('test-bundle-id'),
      true,
      'Should fire event with bundle ID'
    );
    assert.strictEqual(
      executeCommandStub.calledOnceWithExactly('setContext', 'activeBundleId', ['test-bundle-id']),
      true,
      'Should call setContext command with correct args'
    );
  });

  test('setActiveBundle should set active bundle to null when passed null', async () => {
    // Arrange
    const fireSpy = sandbox.spy((bundleManager as any).onDidChangeActiveBundle, 'fire');
    const executeCommandStub = vscode.commands.executeCommand as sinon.SinonStub;

    // Act
    await bundleManager.setActiveBundle(null);

    // Assert
    assert.strictEqual(bundleManager.getActiveBundleId(), null, 'Active bundle ID should be null');
    assert.strictEqual(fireSpy.calledOnceWithExactly(null), true, 'Should fire event with null');
    assert.strictEqual(
      executeCommandStub.calledOnceWithExactly('setContext', 'activeBundleId', null),
      true,
      'Should call setContext command with null'
    );
  });

  test('getAllBundles should initialize and read bundles file', async () => {
    // Arrange
    const mockBundles = {
      bundle1: {
        id: 'bundle1',
        name: 'Bundle 1',
        files: [],
        created: '2023-01-01T00:00:00.000Z',
        lastUsed: '2023-01-01T00:00:00.000Z',
        tags: [],
      } as unknown as Bundle,
      bundle2: {
        id: 'bundle2',
        name: 'Bundle 2',
        files: [],
        created: '2023-01-01T00:00:00.000Z',
        lastUsed: '2023-01-01T00:00:00.000Z',
        tags: [],
      } as unknown as Bundle,
    };
    const mockReadResult = JSON.stringify({ bundles: mockBundles });

    const initializeStub = bundleManager.initialize as sinon.SinonStub;
    const fsReadFileStub = sandbox.stub(fs.promises, 'readFile').resolves(mockReadResult);

    // Act
    const result = await bundleManager.getAllBundles();

    // Assert
    assert.strictEqual(initializeStub.calledOnce, true, 'Should call initialize once');
    assert.strictEqual(fsReadFileStub.calledOnce, true, 'Should call readFile once');
    assert.deepStrictEqual(result.bundles, mockBundles, 'Should return bundles from file');
  });

  test('getBundle should return specific bundle', async () => {
    // Arrange
    const mockBundle = {
      id: 'bundle1',
      name: 'Bundle 1',
      files: [],
      created: '2023-01-01T00:00:00.000Z',
      lastUsed: '2023-01-01T00:00:00.000Z',
      tags: [],
    } as unknown as Bundle;
    const getAllBundlesStub = sandbox.stub(bundleManager, 'getAllBundles').resolves({
      bundles: { bundle1: mockBundle },
    });

    // Act
    const result = await bundleManager.getBundle('bundle1');

    // Assert
    assert.strictEqual(getAllBundlesStub.calledOnce, true, 'Should call getAllBundles once');
    assert.strictEqual(result, mockBundle, 'Should return the requested bundle');
  });

  test('getActiveBundle should return the active bundle', async () => {
    // Arrange
    const mockBundle = {
      id: 'bundle1',
      name: 'Bundle 1',
      files: [],
      created: '2023-01-01T00:00:00.000Z',
      lastUsed: '2023-01-01T00:00:00.000Z',
      tags: [],
    } as unknown as Bundle;

    await bundleManager.setActiveBundle('bundle1');
    const getBundleStub = sandbox.stub(bundleManager, 'getBundle').resolves(mockBundle);

    // Act
    const result = await bundleManager.getActiveBundle();

    // Assert
    assert.strictEqual(
      getBundleStub.calledOnceWithExactly('bundle1'),
      true,
      'Should call getBundle with active bundle ID'
    );
    assert.strictEqual(result, mockBundle, 'Should return the active bundle');
  });

  test('getActiveBundle should return undefined when no active bundle', async () => {
    // Arrange
    await bundleManager.setActiveBundle(null);
    const getBundleStub = sandbox.stub(bundleManager, 'getBundle');

    // Act
    const result = await bundleManager.getActiveBundle();

    // Assert
    assert.strictEqual(getBundleStub.called, false, 'Should not call getBundle');
    assert.strictEqual(result, undefined, 'Should return undefined');
  });

  test('saveBundle should write to the bundles file and fire an event', async () => {
    // Arrange
    const mockBundles = {
      bundle1: {
        id: 'bundle1',
        name: 'Bundle 1',
        files: [],
        created: '2023-01-01T00:00:00.000Z',
        lastUsed: '2023-01-01T00:00:00.000Z',
        tags: [],
      } as unknown as Bundle,
    };

    const getAllBundlesStub = sandbox.stub(bundleManager, 'getAllBundles').resolves({
      bundles: { ...mockBundles },
    });

    const fsWriteFileStub = sandbox.stub(fs.promises, 'writeFile').resolves();
    const fireStub = sandbox.spy((bundleManager as any).onDidChangeBundles, 'fire');

    const newBundle = {
      id: 'bundle2',
      name: 'Bundle 2',
      files: [{ path: 'test.txt', relPath: 'test.txt' }],
      created: '2023-01-02T00:00:00.000Z',
      lastUsed: '2023-01-02T00:00:00.000Z',
      tags: ['tag1'],
    } as unknown as Bundle;

    // Act
    await bundleManager.saveBundle('bundle2', newBundle);

    // Assert
    assert.strictEqual(getAllBundlesStub.calledOnce, true, 'Should call getAllBundles once');
    assert.strictEqual(fsWriteFileStub.calledOnce, true, 'Should call writeFile once');

    // Verify the content being written
    const actualContent = fsWriteFileStub.firstCall.args[1];
    const expectedContent = JSON.stringify(
      {
        bundles: {
          ...mockBundles,
          bundle2: newBundle,
        },
      },
      null,
      2
    );
    assert.strictEqual(actualContent, expectedContent, 'Should write correct content to file');

    assert.strictEqual(fireStub.calledOnce, true, 'Should fire onDidChangeBundles event');
  });

  test('deleteBundle should remove the bundle from storage and fire events', async () => {
    // Arrange
    const mockBundles = {
      bundle1: {
        id: 'bundle1',
        name: 'Bundle 1',
        files: [],
        created: '2023-01-01T00:00:00.000Z',
        lastUsed: '2023-01-01T00:00:00.000Z',
        tags: [],
      } as unknown as Bundle,
      bundle2: {
        id: 'bundle2',
        name: 'Bundle 2',
        files: [],
        created: '2023-01-02T00:00:00.000Z',
        lastUsed: '2023-01-02T00:00:00.000Z',
        tags: [],
      } as unknown as Bundle,
    };

    const getAllBundlesStub = sandbox.stub(bundleManager, 'getAllBundles').resolves({
      bundles: { ...mockBundles },
    });

    const fsWriteFileStub = sandbox.stub(fs.promises, 'writeFile').resolves();
    const setActiveBundleStub = sandbox.stub(bundleManager, 'setActiveBundle').resolves();
    const changeBundlesFireStub = sandbox.spy((bundleManager as any).onDidChangeBundles, 'fire');

    // Act
    await bundleManager.deleteBundle('bundle1');

    // Assert
    assert.strictEqual(getAllBundlesStub.calledOnce, true, 'Should call getAllBundles once');
    assert.strictEqual(fsWriteFileStub.calledOnce, true, 'Should call writeFile once');

    // Verify bundle1 is removed from content being written
    const actualContent = fsWriteFileStub.firstCall.args[1];
    const expectedContent = JSON.stringify(
      {
        bundles: {
          bundle2: mockBundles.bundle2,
        },
      },
      null,
      2
    );
    assert.strictEqual(actualContent, expectedContent, 'Bundle should be removed from file');

    assert.strictEqual(
      setActiveBundleStub.calledOnceWithExactly(null),
      true,
      'Should reset active bundle'
    );
    assert.strictEqual(
      changeBundlesFireStub.calledOnce,
      true,
      'Should fire onDidChangeBundles event'
    );
  });
});

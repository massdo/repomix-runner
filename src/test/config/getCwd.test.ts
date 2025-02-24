import * as assert from 'assert';
import { getCwd } from '../../config/getCwd.js';
import { basename } from 'path';
import * as vscode from 'vscode';
import * as sinon from 'sinon';

suite('getCwd', () => {
  /**
   * Test to ensure that the function returns the root test workspace folder path.
   */
  test('should return the root test workspace folder path', () => {
    const cwd = basename(getCwd());
    assert.strictEqual(basename(cwd), 'root');
  });

  /**
   * Test to ensure that the function throws an error when no workspace folder is found.
   */
  test('should throw error when no workspace folder is found', () => {
    const workspaceFoldersMock = sinon
      .stub(vscode.workspace, 'workspaceFolders')
      .get(() => undefined);
    assert.throws(() => {
      getCwd();
    }, /No root folder/);
    workspaceFoldersMock.restore();
  });
});

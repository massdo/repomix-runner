import * as assert from 'assert';
import { getCwd } from '../../config/getCwd';
import { basename } from 'path';

/**
 * Test to verify that the getCwd function returns the path of the root test workspace used for tests.
 */
test('should return the root test workspace folder path', () => {
  const cwd = basename(getCwd());
  assert.strictEqual(basename(cwd), 'root');
});

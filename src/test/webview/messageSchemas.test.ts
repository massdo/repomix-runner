import * as assert from 'assert';
import { WebviewMessageSchema } from '../../webview/messageSchemas.js';

suite('Webview Message Schemas', () => {
  test('Valid runBundle message', () => {
    const data = {
      command: 'runBundle',
      bundleId: '123',
      compress: true
    };
    const result = WebviewMessageSchema.safeParse(data);
    assert.strictEqual(result.success, true);
  });

  test('Invalid runBundle message (missing bundleId)', () => {
    const data = {
      command: 'runBundle',
      compress: true
    };
    const result = WebviewMessageSchema.safeParse(data);
    assert.strictEqual(result.success, false);
  });

  test('Valid runSmartAgent message', () => {
    const data = {
      command: 'runSmartAgent',
      query: 'test query'
    };
    const result = WebviewMessageSchema.safeParse(data);
    assert.strictEqual(result.success, true);
  });

  test('Invalid runSmartAgent message (query too long)', () => {
    const data = {
      command: 'runSmartAgent',
      query: 'a'.repeat(1001)
    };
    const result = WebviewMessageSchema.safeParse(data);
    assert.strictEqual(result.success, false);
  });

  test('Valid webviewLoaded message', () => {
    const data = {
      command: 'webviewLoaded'
    };
    const result = WebviewMessageSchema.safeParse(data);
    assert.strictEqual(result.success, true);
  });

  test('Invalid command', () => {
    const data = {
      command: 'unknownCommand'
    };
    const result = WebviewMessageSchema.safeParse(data);
    assert.strictEqual(result.success, false);
  });

  test('Valid saveApiKey message', () => {
      const data = {
          command: 'saveApiKey',
          apiKey: 'AIza' + 'a'.repeat(30)
      };
      const result = WebviewMessageSchema.safeParse(data);
      assert.strictEqual(result.success, true);
  });

  test('Invalid saveApiKey message (invalid format)', () => {
    const data = {
        command: 'saveApiKey',
        apiKey: 'some-key'
    };
    const result = WebviewMessageSchema.safeParse(data);
    assert.strictEqual(result.success, false);
});
});

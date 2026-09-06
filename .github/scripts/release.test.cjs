const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { metadata, context, prepare, finish } = require('./release.cjs');

const version = '0.5.1';
const env = {
  GITHUB_EVENT_NAME: 'push', GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: `v${version}`,
  GITHUB_SHA: 'a'.repeat(40), GITHUB_REPOSITORY: 'MassDo/repomix-runner',
};
const ctx = context(env, version);

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'repomix-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const candidate = path.join(root, ctx.vsix);
  writeFileSync(candidate, 'original VSIX bytes');
  const state = { release: null, bytes: null, calls: [], fail: null };
  function run(args) {
    state.calls.push(args);
    if (args[1] === 'view') {
      if (!state.release) throw Object.assign(new Error('not found'), { stderr: 'release not found\n' });
      return JSON.stringify({
        tagName: state.release.tag_name, body: state.release.body,
        isDraft: state.release.draft, assets: state.release.assets,
      });
    }
    const action = args[1];
    if (action === 'create') {
      state.release = { tag_name: ctx.tag, body: ctx.marker, draft: true, assets: [] };
      // gh creates the draft before uploading its attachment.
      if (state.fail === 'upload') throw new Error('Upload interrupted');
      state.bytes = readFileSync(args[3]);
      state.release.assets.push({ name: ctx.vsix });
    } else if (action === 'upload') {
      state.bytes = readFileSync(args[3]);
      state.release.assets.push({ name: ctx.vsix });
    } else if (action === 'download') {
      if (state.fail === 'download') throw new Error('Download failed');
      writeFileSync(path.join(args[args.indexOf('--dir') + 1], ctx.vsix), state.bytes);
    } else if (action === 'edit') {
      if (state.fail === 'finish') throw new Error('GitHub unavailable');
      state.release.draft = false;
    } else {
      throw new Error(`Unexpected gh command: ${args.join(' ')}`);
    }
    return '';
  }
  return { root, candidate, state, run, output: attempt => path.join(root, `attempt-${attempt}`) };
}

test('only a matching tag push authorizes publication', () => {
  assert.equal(metadata(env, version).publish, true);
  for (const alternate of [
    { GITHUB_EVENT_NAME: 'workflow_dispatch' },
    { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF_TYPE: 'branch', GITHUB_REF_NAME: 'main' },
    { GITHUB_EVENT_NAME: 'pull_request', GITHUB_REF_TYPE: 'branch' },
    { GITHUB_REF_TYPE: 'branch', GITHUB_REF_NAME: 'main' },
  ]) {
    assert.equal(metadata({ ...env, ...alternate }, version).publish, false);
    assert.throws(() => context({ ...env, ...alternate }, version), /matching tag push/);
  }
});

test('mismatched tags fail on both push and manual validation', () => {
  for (const event of ['push', 'workflow_dispatch']) {
    assert.throws(() => metadata({ ...env, GITHUB_EVENT_NAME: event, GITHUB_REF_NAME: 'v9.9.9' }, version), /does not match/);
  }
  assert.throws(() => metadata(env, '0.5.1\npublish=true'), /Unsupported release version/);
});

test('the original artifact is saved as a draft before publication', t => {
  const f = fixture(t);
  const file = prepare(ctx, f.candidate, f.output(1), f.run);
  assert.equal(f.state.release.draft, true);
  assert.deepEqual(readFileSync(file), f.state.bytes);
  const create = f.state.calls.find(call => call[1] === 'create');
  assert.ok(create.includes('--draft'));
  assert.ok(create.includes('--verify-tag'));
  assert.equal(create[create.indexOf('--notes') + 1], ctx.marker);
});

test('partial registry publication reuses identical bytes even after a complete rebuild', t => {
  const f = fixture(t);
  const first = prepare(ctx, f.candidate, f.output(1), f.run);
  const marketplace = readFileSync(first);
  // Open VSX fails; a full job rerun builds a different ZIP of the same source.
  writeFileSync(f.candidate, 'rebuilt ZIP with different timestamps');
  const retry = prepare(ctx, f.candidate, f.output(2), f.run);
  const openVsx = readFileSync(retry);
  assert.deepEqual(openVsx, marketplace);
  assert.equal(f.state.calls.filter(call => call[1] === 'create').length, 1);
  assert.equal(f.state.calls.filter(call => call[1] === 'upload').length, 0);
  finish(ctx, f.run);
  assert.equal(f.state.release.draft, false);
  assert.deepEqual(f.state.bytes, marketplace);
});

test('an interrupted draft upload can be completed before any registry publication', t => {
  const f = fixture(t);
  f.state.fail = 'upload';
  assert.throws(() => prepare(ctx, f.candidate, f.output(1), f.run), /Upload interrupted/);
  assert.equal(f.state.release.assets.length, 0);
  f.state.fail = null;
  prepare(ctx, f.candidate, f.output(2), f.run);
  assert.equal(f.state.release.assets.length, 1);
  assert.equal(f.state.calls.filter(call => call[1] === 'create').length, 1);
  assert.equal(f.state.calls.filter(call => call[1] === 'upload').length, 1);
});

test('GitHub finalization can be retried and an already published release is left intact', t => {
  const f = fixture(t);
  prepare(ctx, f.candidate, f.output(1), f.run);
  f.state.fail = 'finish';
  assert.throws(() => finish(ctx, f.run), /GitHub unavailable/);
  assert.equal(f.state.release.draft, true);
  f.state.fail = null;
  finish(ctx, f.run);
  f.state.calls.length = 0;
  const file = prepare(ctx, f.candidate, f.output(2), f.run);
  finish(ctx, f.run);
  assert.deepEqual(readFileSync(file), f.state.bytes);
  assert.ok(f.state.calls.every(call => call[1] === 'view' || call[1] === 'download'));
});

test('a moved tag or unrelated existing release cannot replace the saved VSIX', t => {
  const f = fixture(t);
  prepare(ctx, f.candidate, f.output(1), f.run);
  for (const body of ['other release', ctx.marker.replace('a'.repeat(40), 'b'.repeat(40))]) {
    f.state.release.body = body;
    f.state.calls.length = 0;
    assert.throws(() => prepare(ctx, f.candidate, f.output(2), f.run), /different source/);
    assert.equal(f.state.calls.length, 1);
  }
});

test('authentication and network errors do not create a replacement release', t => {
  const f = fixture(t);
  for (const message of ['gh: Forbidden (HTTP 403)', 'connection reset']) {
    const calls = [];
    const run = args => { calls.push(args); throw Object.assign(new Error(message), { stderr: message }); };
    assert.throws(() => prepare(ctx, f.candidate, f.output(1), run), /Forbidden|connection reset/);
    assert.equal(calls.length, 1);
  }
});

test('failed original artifact downloads never fall back to the rebuilt candidate', t => {
  const f = fixture(t);
  prepare(ctx, f.candidate, f.output(1), f.run);
  f.state.fail = 'download';
  assert.throws(() => prepare(ctx, f.candidate, f.output(2), f.run), /Download failed/);
});

test('a published release missing its original artifact is not rebuilt', t => {
  const f = fixture(t);
  prepare(ctx, f.candidate, f.output(1), f.run);
  finish(ctx, f.run);
  f.state.release.assets = [];
  assert.throws(() => prepare(ctx, f.candidate, f.output(2), f.run), /refusing to rebuild/);
  assert.throws(() => finish(ctx, f.run), /Original VSIX is missing/);
});

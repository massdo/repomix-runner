const { execFileSync } = require('node:child_process');
const { appendFileSync, copyFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

function metadata(env, version) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Unsupported release version: ${version}`);
  }
  const tag = `v${version}`;
  if (env.GITHUB_REF_TYPE === 'tag' && env.GITHUB_REF_NAME !== tag) {
    throw new Error(`Tag ${env.GITHUB_REF_NAME} does not match package.json version ${version}`);
  }
  return {
    tag,
    vsix: `repomix-runner-${version}.vsix`,
    publish: env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF_TYPE === 'tag',
  };
}

function context(env, version) {
  const release = metadata(env, version);
  if (!release.publish) throw new Error('Publication requires a matching tag push');
  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '')) throw new Error('Missing commit SHA');
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '')) throw new Error('Missing repository');
  return {
    ...release,
    repo: env.GITHUB_REPOSITORY,
    sha: env.GITHUB_SHA,
    marker: `<!-- repomix-runner-source: ${env.GITHUB_SHA} -->`,
  };
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function findRelease(ctx, run) {
  let response;
  try {
    // gh also finds drafts by pending tag; the REST /releases/tags endpoint does not.
    response = run(['release', 'view', ctx.tag, '--repo', ctx.repo, '--json', 'tagName,body,isDraft,assets']);
  } catch (error) {
    if (String(error.stderr).trim() === 'release not found') return null;
    throw error;
  }
  const data = JSON.parse(response);
  const release = { ...data, tag_name: data.tagName, draft: data.isDraft };
  if (release.tag_name !== ctx.tag || !release.body?.split('\n').includes(ctx.marker)) {
    throw new Error('Existing release belongs to a different source; refusing to replace its VSIX');
  }
  return release;
}

function prepare(ctx, candidate, directory, run = gh) {
  const release = findRelease(ctx, run);
  mkdirSync(directory, { recursive: true });
  const output = path.join(directory, ctx.vsix);
  if (release?.assets.some(asset => asset.name === ctx.vsix)) {
    run(['release', 'download', ctx.tag, '--repo', ctx.repo, '--pattern', ctx.vsix, '--dir', directory]);
    return output;
  }
  if (release && !release.draft) {
    throw new Error('Published GitHub release has no VSIX; refusing to rebuild a published artifact');
  }

  copyFileSync(candidate, output);
  if (release) {
    // A previous attempt can have created the draft but failed to upload the file.
    run(['release', 'upload', ctx.tag, output, '--repo', ctx.repo]);
  } else {
    run([
      'release', 'create', ctx.tag, output, '--repo', ctx.repo,
      '--draft', '--verify-tag', '--target', ctx.sha, '--title', ctx.tag,
      '--generate-notes', '--notes', ctx.marker,
    ]);
  }
  return output;
}

function finish(ctx, run = gh) {
  const release = findRelease(ctx, run);
  if (!release?.assets.some(asset => asset.name === ctx.vsix)) {
    throw new Error('Original VSIX is missing from the GitHub release');
  }
  if (release.draft) run(['release', 'edit', ctx.tag, '--repo', ctx.repo, '--draft=false']);
}

if (require.main === module) {
  try {
    const version = require('../../package.json').version;
    const [command, candidate, directory] = process.argv.slice(2);
    if (command === 'metadata') {
      const result = metadata(process.env, version);
      appendFileSync(process.env.GITHUB_OUTPUT, `publish=${result.publish}\nvsix=${result.vsix}\n`);
    } else if (command === 'prepare') {
      prepare(context(process.env, version), candidate, directory);
    } else if (command === 'finish') {
      finish(context(process.env, version));
    } else {
      throw new Error(`Unknown release command: ${command}`);
    }
  } catch (error) {
    console.error(error.stderr ? String(error.stderr) : error.message);
    process.exitCode = 1;
  }
}

module.exports = { metadata, context, prepare, finish };

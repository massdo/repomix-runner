# Releasing

Publication is automated. Pushing a matching version tag publishes it.
The workflow uses a GitHub-hosted Ubuntu 24.04 machine with Node 22; no local
Ubuntu installation is needed. Publishing tools are pinned to vsce 3.9.2 and ovsx 1.1.1.

## Validate without publishing

Pushes to `main`, pull requests targeting `main`, and manual runs execute the
release regression tests, the extension tests under `xvfb`, and VSIX packaging.
They retain the VSIX as an Actions artifact for 90 days and never publish it.
They do not need either publication secret.

Once the workflow is on `main`, use Actions → Release → Run workflow, or:

```bash
gh workflow run release.yml --ref main
```

Manual runs on a tag also validate only, and reject a tag/version mismatch.
Local checks on macOS use Node 22 and do not need `xvfb`:

```bash
npm ci
npm run test:release
npm test
npx --yes @vscode/vsce@3.9.2 package --out /tmp/repomix-runner-check.vsix
```

## Release a new version

```bash
# 1. On an up-to-date main with the workflow committed, update CHANGELOG.md
#    and commit it. The working tree must be clean before the next command.

# 2. Bump: creates the "x.y.z" commit and the annotated vx.y.z tag.
npm version patch          # or minor / major

# 3. Push code and tag.
git push origin main --follow-tags
```

Pushing the tag triggers `.github/workflows/release.yml`, which:

1. checks that the tag exactly matches `v` plus the version in `package.json`;
2. runs the release regression tests and the extension tests under `xvfb`;
3. packages the VSIX and retains it as an Actions artifact;
4. checks that both publication secrets are present;
5. saves the VSIX in a draft GitHub release before contacting either registry;
6. publishes that file to Marketplace and Open VSX, skipping versions already published;
7. makes the GitHub release public only after both registry commands succeed.

The draft records its source commit in an HTML comment. An existing release for
another source is rejected. Version tags and saved VSIX attachments must not be
moved, replaced or deleted during recovery.

## Required secrets

Both live in the repository settings, under *Secrets and variables → Actions →
Secrets*, as repository secrets. A local `.env` file is not used by this workflow.

| Secret     | Where to get it                                                          |
| ---------- | ------------------------------------------------------------------------ |
| `VSCE_PAT` | Azure DevOps personal access token, scope *Marketplace → Manage*          |
| `OVSX_PAT` | Access token from https://open-vsx.org, under your profile settings       |

Without them the publication job stops before creating the draft or publishing
to a registry. Presence alone does not prove a token has the required permissions.

Microsoft [announces retirement of global Azure DevOps PATs on December 1, 2026](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).
Plan the switch to Microsoft Entra ID authentication before that date.

## Recover a failed publication

Fix the failed service or secret, then open the **original tag run** in Actions
and choose **Re-run failed jobs**. Do not push a replacement tag or use Run workflow:
manual runs only validate.

The publication job downloads the original VSIX from the draft, skips registry
versions that were already published, and finishes the remaining steps. A full
rerun may rebuild the extension, but publication still restores the saved VSIX.
If draft creation succeeded but its first upload failed, the retry completes that
upload before contacting either registry. A GitHub release already made public
is left intact.

Registry errors other than an already published version still fail the job.
If the workflow code itself needs a correction, rerunning an old tag uses the old
code: use a new version, and recover any partially published version with its
saved artifact rather than moving its tag.

## Publishing by hand

Only needed if the workflow cannot be resumed. After a partial publication,
download the saved VSIX; do not rebuild it. Export the two tokens in your local
environment and replace the example version below with the version being recovered.

```bash
mkdir -p /tmp/repomix-recovery
gh release download v0.5.1 --repo MassDo/repomix-runner \
  --pattern repomix-runner-0.5.1.vsix --dir /tmp/repomix-recovery
npx --yes @vscode/vsce@3.9.2 publish \
  --packagePath /tmp/repomix-recovery/repomix-runner-0.5.1.vsix --skip-duplicate
npx --yes ovsx@1.1.1 publish \
  /tmp/repomix-recovery/repomix-runner-0.5.1.vsix --skip-duplicate
# Only after both commands succeed, if the release is still a draft:
gh release edit v0.5.1 --repo MassDo/repomix-runner --draft=false
```

Finally verify the version in both registries and the GitHub release attachment.

# Registry release runbook

Registry publication is performed only by
`.github/workflows/release.yml` from this public repository. Do not add npm or
PyPI write tokens to GitHub, local environment files, or package source.

## Required publisher identities

Use these exact values when configuring registry-side trusted publishers:

| Field | npm | PyPI |
| --- | --- | --- |
| Package/project | `@theleoking/ai-api` | `theleoking-ai-api` |
| GitHub owner | `The-Leo-King` | `The-Leo-King` |
| Repository | `theleoking-ai-sdk` | `theleoking-ai-sdk` |
| Workflow filename | `release.yml` | `release.yml` |
| GitHub environment | `npm` | `pypi` |
| Allowed action | publish | publish |

The workflow uses GitHub-hosted runners and grants `id-token: write` only to
the two publication jobs. Both GitHub environments require an explicit review.

## Bootstrap sequence

1. Confirm the npm `theleoking` scope is controlled by The Leo King account.
2. Create or claim `@theleoking/ai-api`, then add the npm trusted publisher
   using the exact identity above and allow `npm publish`.
3. In PyPI account publishing settings, create a pending publisher for
   `theleoking-ai-api` using the exact identity above. The first successful
   trusted publish creates the project.
4. Run `Publish SDK prereleases` from the `main` branch.
5. Review and approve the separate `npm` and `pypi` environment deployments.
6. Verify the public package pages, versions, source links, license, and
   provenance before recording the registry attestations in the application
   release audit.

The current workflow intentionally accepts only `0.x` alpha versions and
publishes npm under the `alpha` dist-tag. Removing that guard or publishing a
stable `1.0.0` requires the enterprise release gates to be complete first.

## Verification

After publication, verify from a clean consumer environment:

```bash
npm view @theleoking/ai-api dist-tags versions repository --json
npm install @theleoking/ai-api@alpha
```

```bash
python -m pip index versions theleoking-ai-api
python -m pip install --pre theleoking-ai-api
```

## Rollback

Do not delete Git history or reuse a published version.

- npm: deprecate the bad version, publish a corrected patch prerelease, and
  move the `alpha` dist-tag only after validation.
- PyPI: yank the bad release from the project page, publish a corrected patch
  prerelease, and document the reason.
- GitHub: preserve the failed workflow and environment-deployment evidence for
  incident review.

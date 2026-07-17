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
4. Run `Publish SDK packages` from the `main` branch, choose `alpha`, and type
   the exact confirmation `PUBLISH ALPHA SDK`.
5. Review and approve the separate `npm` and `pypi` environment deployments.
6. Verify the public package pages, versions, source links, license, and
   provenance before recording the registry attestations in the application
   release audit.

Alpha publication accepts only `0.x` alpha versions and publishes npm under the
`alpha` dist-tag. Stable publication is a separate branch of the same protected
workflow and requires the exact confirmation `PUBLISH STABLE SDK`, matching
non-prerelease Node/Python versions, and a committed candidate handoff at
`evidence/<version>/`.

## Stable candidate handoff

Stable packages are never promoted from alpha or rebuilt from unbound source.
The private application repository first produces a protected stable candidate
whose `release-manifest.json` is tied to the exact source commit, OpenAPI digest,
fresh Pro prepublication proof, package identities, and isolated consumer tests.

Copy only these candidate outputs into a reviewed public-repository change:

1. Replace `node/` and `python/` with `sdk-release/source/node/` and
   `sdk-release/source/python/`.
2. Add `sdk-release/release-manifest.json` as
   `evidence/<stable-version>/release-manifest.json`.
3. Add `sdk-release/consumer-conformance.json` as
   `evidence/<stable-version>/consumer-conformance.json`.
4. Open a pull request and require `SDK CI` to pass before merging.

The stable handoff validator rejects untracked or extra SDK files, source hash
or byte mismatches, missing lockfile evidence, prerelease or divergent package
versions, wrong repository identity, missing Pro evidence binding, and failed
consumer conformance. After merge, dispatch `Publish SDK packages`, choose
`stable`, type `PUBLISH STABLE SDK`, and approve the separate `npm` and `pypi`
environment deployments. The npm job publishes without a prerelease tag, so a
successful stable release becomes `latest`.

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

- npm: deprecate the bad version and publish a corrected patch. For alpha,
  move the `alpha` dist-tag only after validation; for stable, never move
  `latest` backward to an older version.
- PyPI: yank the bad release from the project page, publish a corrected patch
  prerelease, and document the reason.
- GitHub: preserve the failed workflow and environment-deployment evidence for
  incident review.

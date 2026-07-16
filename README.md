# The Leo King AI SDKs

Official Apache-2.0 client libraries for the
[The Leo King AI API](https://theleokingai.com/api-docs).

This public repository is the provenance source for the Node and Python SDKs:

- [`node/`](./node) — `@theleoking/ai-api`
- [`python/`](./python) — `theleoking-ai-api`

The current `0.1.0` prereleases are alpha release candidates. They are not a
stable `1.0.0` contract. Stable publication remains gated by the enterprise
release requirements tracked in the private application repository.

## Validate locally

```bash
cd node
npm install
npm test
```

```bash
python -m pip install -e ./python
python -m unittest discover -s python/tests
```

## Release integrity

The [`evidence/`](./evidence) directory records the source commit, OpenAPI
digest, package hashes, toolchain versions, and isolated consumer-conformance
results for exported candidates.

Registry publishing is performed only by
[`release.yml`](./.github/workflows/release.yml) on GitHub-hosted runners. Its
npm and PyPI jobs use separate protected GitHub environments and short-lived
OIDC trusted-publisher credentials; no long-lived registry write token belongs
in this repository. See the exact publisher identities and bootstrap sequence
in [RELEASING.md](./RELEASING.md).

## Support

- [API documentation](https://theleokingai.com/api-docs)
- [Support contract](https://theleokingai.com/api/v1/support)
- [Changelog](https://theleokingai.com/api/v1/changelog)

## License

Apache License 2.0. See [LICENSE](./LICENSE).

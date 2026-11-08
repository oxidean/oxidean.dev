# Spec — docs manifest contract + versioned product docs (WI-0001)

Status: specified 2026-11-07 · decisions locked by Jesse (IN-0001)

## Goal

Product docs are authored in each product repo behind an authored manifest
contract, CI-validated on every change, packaged into `docs-<ver>.tar.gz`
release assets on each matching tag, and consumed by oxidean.dev with
per-product version selection. Docs authoring moves OUT of this repo — the
site renders bundles, it does not hold product doc sources.

## Locked decisions

- Authored `docs/site/manifest.yaml` per product repo = the contract.
- Tooling lives in dedicated **`oxidean/docs-manifest`** repo: JSON schema +
  validator/packer CLI + reusable GH workflows. **Explicitly NOT bundled
  into ox-agent the binary** — org-internal tooling, not an end-user feature.
- Forge docs ride the **`ox-v*`** tag line; Ox-Agent/oxl ride `v*`.
- History: **current latest tag forward** — no backfill. Seed versions:
  Ox-Agent v0.1.7, oxl v0.4.0, forge ox-v0.4.2.
- Docs live in a curated **`docs/site/`** subtree per repo (Ox-Agent's
  existing `docs/` gets curated into it; oxl/oxidean docs/ keep their
  dev material untouched).
- Bundle discovery via GitHub releases API → pinned `docs-versions.lock.json`.
- Path-versioned routes `/docs/<product>/<version>/**`; unversioned URLs
  redirect to latest. Version switcher per product.

## Scope

### In scope — new repo `oxidean/docs-manifest`

- JSON Schema for `manifest_version: 1` (schema/manifest.schema.json).
- Go CLI `docs-manifest` (single static binary, MIT):
  - `validate <dir>` — schema-validate manifest; verify every declared page
    exists; fail on orphan files in the subtree; check internal relative
    links resolve; exit non-zero on any violation.
  - `pack <dir> --version <v> --out docs-<v>.tar.gz` — re-validate, assert
    `manifest.version == <v>` (hard gate), emit deterministic tarball
    (sorted entries, fixed mtimes) + `docs-<v>.tar.gz.sha256`.
- Reusable workflows (`uses: oxidean/docs-manifest/.github/workflows/*.yml@<ref>`):
  - `validate.yml` — PR/push CI, inputs: `dir` (default `docs/site`), `cli-version`.
  - `release.yml` — tag-push or `workflow_dispatch` target, inputs: `tag`,
    `dir`; runs pack, uploads `docs-*.tar.gz` + sha256 to that release.
  - Caller installs a pinned `docs-manifest` binary from its own releases
    (self-hosting; no ox-agent or product-binary dependency).

### In scope — product repos (Ox-Agent, oxl, oxidean)

- `docs/site/manifest.yaml` + curated page tree per repo.
- Content: port/enrich the site's existing product docs
  (`src/content/docs/docs/<product>/*`) into each repo, corrected to current
  release reality (oxl v0.4.0 module system; Ox-Agent v0.1.7 CLI surface;
  forge features on ox-v0.4.2).
- Thin caller workflows wiring validate (PRs touching `docs/site/`) and
  release-pack (matching `tag_pattern`).
- One-time bootstrap: after `docs/site/` merges at the current version,
  `workflow_dispatch` pack attaches `docs-<cur>.tar.gz` to the EXISTING
  latest release — no tag rewrite, site has docs from day one.

### In scope — oxidean.dev (consumer)

- `docs-versions.lock.json` — mirrors `remote-skills-lock.schema.json`
  shape; per-product `{source, tag_pattern, default, versions[{version,
  tag, asset, url, sha256}]}`.
- `scripts/docs-sync.ts` (`bun run docs:sync`): read lock → download
  assets (public release URLs; `gh` fallback) → verify sha256 → unpack to
  `src/content/docs/docs/<product>/<version>/` → generate
  `src/sidebar.generated.mjs` mapping manifest `pages` trees to Starlight
  sidebar items (per product per version). Materialized dirs + generated
  sidebar are gitignored build artifacts.
- `scripts/docs-update.ts` (`bun run docs:update`): releases-API discovery
  → newest N (cap: 5/product, keep all ≥ current default) → rewrite lock.
  Optional scheduled workflow opens PR with the bump.
- Routing: unversioned `/docs/<product>/(.*)` → 301 to `<latest>` via
  `src/pages/docs/[...path]` redirect or `astro.config` redirects entry.
- `VersionSwitcher.astro` — Starlight `Sidebar` component override; select
  listing lock versions for current product, navigates to same slug at
  chosen version falling back to version index.
- Prebuild runs `docs:sync` (network required — documented); Vercel builds
  unchanged otherwise.
- Existing `src/content/docs/docs/**` hand-written pages removed once
  bundles flow — source of truth moves upstream.

### Out of scope

- Any docs-manifest functionality inside the ox-agent binary/skill set.
- Backfilling docs bundles for releases older than the seed versions.
- Docs versioning for the landing/marketing pages.
- i18n; private-repo asset auth (all repos public).
- Non-Starlight docs surfaces (in-app help).

## Contract — manifest.yaml (manifest_version: 1)

```yaml
manifest_version: 1
product:
  slug: oxl                    # url path segment [a-z0-9-]
  name: oxl                    # display
  repo: oxidean/oxl
  tag_pattern: "v*"            # which release tags carry docs bundles
version: "0.4.0"               # == tag minus leading 'v'/product prefix
pages:                         # Starlight sidebar-item shape, ordered
  - label: oxl
    link: /                  # product version index page (index.mdx)
  - label: Getting started
    link: /getting-started/
  - label: Language
    items:
      - label: Overview
        link: /language/
      - ...
assets: [images/**]            # optional non-page files to ship in bundle
```

- `link` values are bundle-relative slugs; the site prefixes
  `/docs/<slug>/<version>` at materialization.
- Every linked page file must exist under `docs/site/`; every `.md`/`.mdx`
  in the subtree must be reachable from `pages` (no orphans).

## Contract — bundle

`docs-<version>.tar.gz`: deterministic tar.gz; root contains
`manifest.yaml` (validated) + page/asset tree as authored. Sibling asset
`docs-<version>.tar.gz.sha256`. Released alongside existing assets
(checksums/latest.json conventions preserved per repo).

## Acceptance criteria

1. `docs-manifest validate` on a conforming `docs/site/` exits 0; each of
   {missing manifest, bad schema, missing page file, orphan page,
   manifest.version mismatch} exits non-zero with a named error.
2. Caller `validate` workflow runs on docs/site-touching PRs in all three
   product repos and fails a deliberately-broken manifest.
3. Tag push (and dispatch bootstrap) attaches `docs-<ver>.tar.gz` + sha256
   to the matching release; a tag with mismatched manifest.version fails.
4. `bun run docs:sync` materializes locked versions for all three products;
   `bun run build` produces `/docs/<product>/<ver>/` routes; unversioned
   `/docs/<product>/…` 301s to latest.
5. Version switcher lists locked versions per product and navigates.
6. No references to docs-manifest inside Ox-Agent binary, skills, or
   installer (constraint check — grep CI or manual verify).
7. `ox-agent doctor` stays healthy; gates (oxlint/oxfmt/prettier, commit
   lint, site CI) green on every PR.

## Phasing

- **P0** `oxidean/docs-manifest`: schema + CLI + reusable workflows +
  self-release. Blocks all else.
- **P1** (parallel per repo): Ox-Agent curate→docs/site; oxl author
  docs/site at v0.4.0 (module system, current CLI surface); oxidean curate
  docs/site on ox-v* + caller workflows in all three.
- **P2** bootstrap: dispatch pack → attach bundles to current releases.
- **P3** oxidean.dev: lockfile + sync/update scripts + versioned routing +
  switcher + remove in-repo doc sources.
- **P4** optional: scheduled lock-refresh workflow → auto PRs.

## Risks / open

- ox-v* cadence: docs bump must ride every ox-v tag even when docs are
  unchanged — enforced by the version-match gate; note in repo docs.
- GitHub API rate limits only affect `docs:update` (token via `gh` auth in
  CI; unauthenticated builds use direct asset URLs).
- Starlight sidebar override approach assumes component overrides stay
  stable across Starlight minors — pin + test on upgrade.

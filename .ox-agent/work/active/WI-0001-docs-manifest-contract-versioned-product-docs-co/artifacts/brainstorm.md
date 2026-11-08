# Brainstorm — docs manifest contract (WI-0001)

Goal: product docs authored in each product repo behind a manifest contract,
validated by CI version-to-version, shipped as release assets, consumed by
oxidean.dev with per-product version selection.

## Decision axes and candidate directions

### D1 — What the contract is

- **A. Authored manifest file** (`docs/site/manifest.yaml` in each repo):
  declares `manifest_version`, `product`, `version`, `tag_pattern`, ordered
  `pages[]` (path/title/sidebar position). Content = md/mdx files in the same
  tree. CI validates schema + tree↔manifest coherence.
  + Explicit public contract; docs surface is intentional, not incidental.
  − Another file to maintain; authors must update it.
- **B. Convention only** — fixed dir, manifest generated at pack time.
  + Zero author burden. − No contract to break; drift is silent; sidebar
  ordering/surface control lost.
- **C. Frontmatter-derived** — Starlight-style `sidebar:` fields per page.
  + Familiar. − Contract is implicit; per-page scattering makes review hard.

Recommendation: **A**. Jesse asked for a manifest contract — the authored file
IS the contract; CI's job is keeping the tree honest against it.

### D2 — Where the validator/packer lives

- **A. Dedicated `oxidean/docs-manifest` repo**: JSON schema + small CLI +
  reusable GH workflow (`uses: oxidean/docs-manifest/.github/workflows/*.yml@v1`).
  Product repos get a thin caller workflow.
  + Single source for schema version; natural versioning; every repo consumes
  identically. − New repo + release line to maintain.
- **B. Inside Ox-Agent** (`ox-agent docs validate|pack`): dogfoods the toolkit;
  ox-agent already knows manifests/locks/schemas.
  + Zero new repo; agent-facing tooling fits ox-agent's remit.
  − Bootstrap circularity: Ox-Agent's own docs pipeline depends on the binary
  being released; couples docs schema releases to ox-agent releases.
- **C. Vendored script + schema per repo.** − Drift across repos defeats
  "contract"; rejected.

Recommendation: **A** (clean contract boundary), with **B** noted as a later
consolidation path if ox-agent grows a docs domain.

### D3 — Version discovery on the consumer side

- **A. Releases API as index**: site fetch lists repo releases, keeps those
  carrying a `docs-*.tar.gz` asset; versions+sha pinned in
  `docs-versions.lock.json` (mirroring `remote-skills-lock.schema.json`
  shape: `{name, source, ref, sha, files{path→sha256}}`). Builds consume the
  lockfile; a `docs:update` script (or scheduled workflow → PR) refreshes it.
  + Zero upstream artifacts beyond the bundle; reproducible builds; bumps are
  reviewable commits. − Discovery needs the API (rate limits) — only for
  lock refresh, not per-build.
- **B. `docs-index.json` asset re-uploaded per release**: stable index URL.
  + One fetch. − Another artifact to keep consistent; index drift risk if a
  release is edited/deleted.
- **C. Fixed `docs` rolling release holding the index.**
  − Non-idiomatic tag; abuses release semantics.

Recommendation: **A** — GitHub releases API is already the index; the lockfile
makes builds deterministic. `latest.json` precedent from `ox` releases shows
the org already likes machine-readable release metadata; the lockfile is the
site-side equivalent.

### D4 — Site-side version routing

- **A. Path-based**: fetched bundles land at
  `src/content/docs/docs/<product>/<version>/**`; `/docs/<product>/` redirects
  (or aliases) to latest; `VersionSwitcher` island/component per product
  sidebar. + Simple, crawlable, static-friendly; Starlight-native collection
  layout. − All versions inline in one build (size grows with history — fine
  at this scale).
- **B. Separate Starlight instance per version.** − Build/config sprawl; rejected.
- **C. Product/version subdomains.** − DNS/hosting complexity; rejected.

Recommendation: **A**, with lockfile capping history (e.g. last N minors per
product) if build size ever matters.

### D5 — Version mapping for the forge monorepo

oxidean/oxidean has many tag lines (`ox-v*`, `oxidean-db-*`, `oxidean-api-*`…).
- **A. Manifest declares `tag_pattern`** (e.g. `ox-v*`); docs bundle attaches
  to releases matching it; docs `version` = release tag minus prefix.
  + Explicit, per-repo policy; non-product tags ignored by construction.
- **B. Dedicated `docs-v*` tag line for the forge.** + Fully decoupled docs
  cadence. − Docs versions drift from product versions — breaks Jesse's
  "version to version" freshness intent.
- **C. Site hardcodes which tag line maps to which product.** − Contract
  knowledge leaks into the consumer; rejected.

Recommendation: **A**. The manifest's `product.tag_pattern` IS the policy.

### D6 — Freshness gate ("kept up-to-date version to version")

- **A. Release gate**: on tag push, pack step requires
  `manifest.version == <tag version>` — release fails if docs weren't bumped.
  + Hard guarantee the docs match the version. − Release friction if docs
  genuinely unchanged (mitigate: `docs:unchanged` flag in manifest? — or just
  accept bumping the field).
- **B. Soft gate**: CI warns; release proceeds. − Drift possible; weak contract.
- **C. Hash-based**: manifest records content hash; PR CI fails if `docs/`
  changed without manifest `updated:` marker touching. + Catches mid-cycle
  drift too. − More machinery.

Recommendation: **A** as the hard gate + PR-side validation (schema, no
orphans, links resolve). C optional later.

## Open questions for Jesse

1. Tooling home: dedicated `oxidean/docs-manifest` repo (recommended) vs
   inside ox-agent binary?
2. Which forge tag line carries product docs — `ox-v*` assumed; confirm.
3. History depth: seed from each repo's CURRENT latest tag (v0.1.7/v0.4.0/
   ox-v0.4.2) and go forward, or also backfill earlier releases?
4. Docs live in each repo under `docs/site/` (curated subtree) vs reusing the
   existing `docs/` roots — Ox-Agent's `docs/` is nearly ready; oxl/oxidean
   `docs/` mix dev material, so a dedicated subtree keeps the contract clean.

## Direction synthesized for Jesse's intent

Authored `manifest.yaml` + `docs/site/` subtree per repo; `docs-manifest`
tooling repo with schema + validator + reusable CI; bundle
`docs-<ver>.tar.gz` attached to matching release tags; site fetches via
releases API into a `docs-versions.lock.json`-pinned, path-versioned Starlight
tree with a version switcher.

## Jesse's decisions (IN-0001, 2026-11-07)

1. Tooling home: **dedicated `oxidean/docs-manifest` repo** — schema +
   validator CLI + reusable GH workflow.
2. Forge docs ride the **`ox-v*`** tag line — confirmed.
3. History: seed from each product's **current latest tag forward** — no
   backfill.
4. Docs live in a **curated `docs/site/` subtree** per repo.

Hard constraint from Jesse: the docs-manifest tooling must **NOT** be
bundled into ox-agent the binary — it is org-internal tooling, not an
Ox-Agent end-user feature. D2-B is rejected outright, not deferred.

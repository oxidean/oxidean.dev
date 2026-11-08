# Plan — docs manifest contract (WI-0001)

Derived from artifacts/spec.md (decisions locked). Cross-repo work; each
stage = one mergeable PR unless noted. All repos: type-prefixed commit
subjects, no AI attribution, docker-only for compiled verification.

## Stage map

```
S1 docs-manifest repo ──┬──> S2 Ox-Agent docs/site ──┐
                        ├──> S3 oxl docs/site ───────┼──> S5 bootstrap ──> S6 site consumer ──> S7 auto-refresh
                        └──> S4 oxidean docs/site ───┘
```

S2–S4 develop in parallel but pin `@v1` refs that only exist after S1
releases — sequence: land S1 with a `v0.1.0` tag first, then S2–S4.

## S1 — `oxidean/docs-manifest` (new public repo)

Files:
- `schema/manifest.schema.json` — manifest_version 1 schema.
- `cmd/docs-manifest/main.go` + `internal/{manifest,validate,pack}/` —
  Cobra-free minimal CLI (flag pkg is fine; match org Go conventions).
  `validate`: schema check, pages-exist, no-orphans, internal-link
  resolution, clear named errors. `pack`: re-validate, `manifest.version
  == --version` gate, deterministic tar.gz (sorted, zeroed mtimes) +
  `.sha256` sidecar.
- `testdata/{valid,broken-*}/` fixtures; table-driven tests covering every
  failure mode in spec AC1.
- `.github/workflows/validate.yml`, `release.yml` — `workflow_call`
  reusable; install pinned CLI binary from this repo's releases.
- `docs/` usage README; `ox-agent init --integrate` scaffold.
- Own release workflow (GoReleaser-style or simple goreleaser-less: build
  linux/darwin amd64+arm64 binaries, checksums, sigstore — mirror
  Ox-Agent's release.yml shape).

Gate: `go test ./...` green; `validate`/`pack` pass on valid fixture and
fail each broken fixture; repo tagged `v0.1.0` with binary assets
attached.

## S2 — `oxidean/Ox-Agent` PR

- `docs/site/` curated from existing `docs/`: index (from README),
  install, quickstart (from getting-started), cli, architecture.
  manifest.yaml: slug `ox-agent`, tag_pattern `v*`, version `0.1.7`.
- Port the site's `docs/ox-agent/*` mdx content improvements INTO these
  pages where they're better (they reflect v0.1.7 CLI surface).
- `.github/workflows/docs-site.yml` calling
  `oxidean/docs-manifest/.github/workflows/validate.yml@v0.1.0` on PRs
  touching `docs/site/**` + `release.yml` wiring on `v*` tags /
  workflow_dispatch.
- CHANGELOG/release docs note: docs version must bump with each tag.

Gate: CI green; validate workflow runs on the PR itself.

## S3 — `oxidean/oxl` PR

- `docs/site/` authored fresh at v0.4.0: index, getting-started
  (toolchain tarball install — verify against v0.4.0 assets), language
  surface (module system `oxl.mod`, stdlib as shipped), tooling.
  Reuse site `docs/oxl/*` as base but correct v0.2.0→v0.4.0 drift
  (module commands, stdlib tree) against tag sources.
- manifest.yaml: slug `oxl`, tag_pattern `v*`, version `0.4.0`.
- Same caller workflow wiring. Verification: docker-only builds.

Gate: CI green; content spot-checked against v0.4.0 tag sources.

## S4 — `oxidean/oxidean` PR

- `docs/site/` curated from existing `docs/` user-facing set +
  ported site `docs/oxidean/*`: index, quickstart, self-hosting
  (overview/docker/helm), `ox` CLI, configuration, contributing.
- manifest.yaml: slug `oxidean`, tag_pattern `ox-v*`, version `0.4.2`.
- Caller workflow on paths `docs/site/**` + release wiring gated to
  `ox-v*` pushes only (monorepo: must NOT fire on db/api/vcs tags).

Gate: CI green; tag filter verified (yaml `tags: ["ox-v*"]`).

## S5 — Bootstrap bundles onto current releases

Per product repo: `gh workflow run` the release-pack workflow with
`tag=<current latest>` (workflow_dispatch input) → attaches
`docs-0.1.7.tar.gz`, `docs-0.4.0.tar.gz`, `docs-0.4.2.tar.gz` + sha256
to existing releases v0.1.7 / v0.4.0 / ox-v0.4.2.

Gate: assets present + sha256 verifies on all three releases.

## S6 — `oxidean.dev` consumer PR

- `docs-versions.lock.json` seeded with the three bootstrap versions.
- `scripts/docs-sync.ts`, `scripts/docs-update.ts` (bun, node-fetch /
  `gh api` fallback; sha256 verify; unpack; sidebar.generated.mjs emit).
- `package.json`: `docs:sync` (prebuild), `docs:update`; gitignore
  materialized `src/content/docs/docs/*` + `src/sidebar.generated.mjs`.
- astro.config: sidebar imported from generated module; redirects for
  unversioned `/docs/<product>/**` → latest.
- `src/components/VersionSwitcher.astro` + Starlight `Sidebar` override
  wiring; switcher shows when >1 version, still renders correct single-
  version state.
- DELETE `src/content/docs/docs/**` sources + update landing/footer links
  that pointed at hand-written pages.
- AGENTS.md section: docs flow (authored upstream, materialized at build).

Gate: `bun run docs:sync && bun run build` green; versioned routes +
redirects verified; lint/format/commit gate pass.

## S7 — (optional, same PR or follow-up) auto-refresh

Scheduled workflow in oxidean.dev: daily/weekly `docs:update` → opens PR
with lockfile diff when new bundles appear. Also `repository_dispatch`
hook so product release workflows can ping the site later.

## Risks & watch-items

- S4 tag filter: wrong filter = docs bundle attached to db/api releases.
  Test with workflow_dispatch first.
- ox-v* release cadence may require docs.version bumps with no content
  change — acceptable per spec; repo docs note it.
- Starlight `Sidebar` override is an internal seam — pin Starlight minor,
  re-test on upgrades.
- `docs:update` needs `GH_TOKEN` for release-asset download on private
  runs — public URLs work unauthenticated today; note the fallback.
- S1 has no upstream to copy — plan is the contract; review the schema
  before tagging v0.1.0 (it's `manifest_version: 1` forever after).

## Verification mapping (spec AC → stage)

AC1 S1 tests · AC2 S2–S4 workflows · AC3 S5 + S4 tag filter ·
AC4–6 S6 build/routes/switcher · AC7 every stage's gates.

## Stage status

- **2026-11-07 (S6+)** — push model added per Jesse: `docs-manifest` release.yml@v0.1.2 fires a fail-soft `workflow_dispatch` (`docs-release.yml`, inputs `{product, version, repo, tag}`) to the site after bundle attach. Site side: `scripts/docs-upsert.ts` pins the version + opens an auto-merge bump PR. Product PRs updated to `product:` + `secrets.site_dispatch_token`. Auth: org secret `DOCS_SITE_DISPATCH_TOKEN` (fine-grained PAT, Actions:write on oxidean.dev) — Jesse to install; dispatch skips until then and `docs:update` remains the poll backstop. Receiver must reach `main` (workflow_dispatch resolves on default branch) — lands with the consumer merge.


- **S2 done 2026-11-07** — oxidean/Ox-Agent#35 (`feat/docs-site-contract`):
  curated docs/site (index/install/quickstart/cli/architecture) at v0.1.7,
  caller workflows @v0.1.1; releasing.md exclusion + version-bump note.
  Bonus: fixed upstream `input answer` → `input respond`. Validate CI green.
- **S3 done 2026-11-07** — oxidean/oxl#34: fresh docs/site
  (index/getting-started/language) at v0.4.0 verified against the release
  binary (modules shipped since v0.3.0, 36 stdlib pkgs, `package` required,
  `oxl get|mod|list` in toolbox). Validate + commit-lint CI green.
- **S4 done 2026-11-07** — oxidean/oxidean#235: curated docs/site
  (index/quickstart/self-hosting{overview,docker,kubernetes}/cli/config/
  contributing) at ox-v0.4.2; release workflow gated `tags: ["ox-v*"]`.
  K8s doc enriched vs SELFHOST-KUBERNETES (ssh LoadBalancer service).
- **S5 design deviation** — dispatch-as-specced cannot pack old tags:
  reusable release.yml checks out `inputs.tag`, which predates docs/site.
  Bootstrap instead packs from `origin/main` with the local CLI and
  attaches via `gh release upload` (same deterministic binary + bundle,
  `sha256sum -c` verified). Dispatch stays valid for re-attaching to tags
  that already contain docs/site.
- **S6 in flight** — oxidean.dev#2 (draft, stacked on feat/initial-site):
  lockfile (sha256 nullable pre-bootstrap), docs:sync/docs:update, lock-
  driven sidebar + unversioned redirects + VersionSwitcher (dash-joined
  version segments — Starlight strips dots), hand docs removed. Verified
  end-to-end with locally packed bundles from all three product trees.

- **S1 done 2026-11-07** — `oxidean/docs-manifest` live:
  schema/manifest.schema.json (manifest_version 1), Go CLI
  (`validate|pack|schema|version`), reusable `workflow_call` workflows,
  goreleaser pipeline. Tagged **v0.1.1** (v0.1.0 released but its
  reusable-workflow asset URLs were wrong — callers pin `@v0.1.1`).
  Verified: `go test` covers every named failure; determinism asserted
  byte-for-byte; release binary validates fixtures end-to-end.
- **2026-11-08 — merges + S5** — oxl#34, oxidean#235, oxidean#236 (kind
  `ctr pull` fix), oxidean.dev#1 all merged. docs-manifest iterated to
  **v0.1.6** (env pass-through + input validation + `src-ref` protected-
  ref restriction); all callers re-pinned. S5 done via local pack +
  `gh release upload`: `docs-0.4.0`→oxl v0.4.0, `docs-0.4.2`→ox-v0.4.2,
  `docs-0.1.7`→Ox-Agent v0.1.7. oxl v0.4.1 and Ox-Agent v0.1.8 predate
  the contract — no bundles; site serves the older version until the
  next releases cut with the pipeline.
- **S6** — oxidean.dev#2 rebased onto main post-squash, undrafted, lock
  filled with real sha256s via `docs:update` (35 pages verified).

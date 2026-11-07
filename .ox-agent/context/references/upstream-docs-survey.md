# Upstream docs + release survey (WI-0001 discovery)

Surveyed 2026-11-07 against GitHub `main` / latest releases.

## Current site docs

- 15 hand-written `.mdx` pages under `src/content/docs/docs/{oxidean,ox-agent,oxl}/`.
- Authored against older versions (oxl v0.2.0); already stale — oxl released
  v0.3.0, v0.3.1, v0.3.2, v0.4.0 on 2026-11-07.
- Starlight `docs` collection via `docsLoader()`; no versioning support built in.

## Upstream docs surfaces

- **Ox-Agent** (`oxidean/Ox-Agent`, latest v0.1.7): `docs/` holds 5 user-facing
  files: `architecture.md`, `cli.md`, `getting-started.md`, `install.md`,
  `releasing.md`. Near-ready as docs source.
- **oxl** (`oxidean/oxl`, latest v0.4.0): `docs/` is design-oriented
  (`product/`, `semantics/`, `specs/`, `standards/`, `self-hosting.md`,
  `gui-pilot.md`). Root `oxl.mod` — module system shipped. User-facing docs
  need a curated subtree (e.g. `docs/site/`).
- **oxidean** (`oxidean/oxidean`): `docs/` ~25 mixed user/dev files
  (GETTING-STARTED, SELF-HOSTING, CLI, CONFIGURATION, CONTRIBUTING + internal).
  Monorepo with MANY tag lines: `ox-v0.4.2`, `oxidean-db-v0.6.0`,
  `oxidean-api-*`, `oxidean-vcs-*`. "Latest release" is ambiguous — the docs
  version must pin to a product line (candidate: `ox-v*`), not repo default.

## Release surface conventions already in use

- `ox` releases attach `latest.json` — machine-readable pointer precedent.
- Ox-Agent attaches `checksums.txt` + `checksums.txt.sigstore.json`.
- oxl attaches `oxl-toolchain-linux-x86_64.tar.gz` (bundles stdlib + examples).
- No repo ships a docs bundle or docs manifest yet — greenfield contract.

## Org precedent for the contract shape

- `.ox-agent/assets.lock` — hash-locked materialized assets.
- `remote-skills-lock.schema.json` — remote artifact lock:
  `{name, source, ref, sha, installed_at, files{path→sha256}}`. A site-side
  docs lockfile should mirror this shape.
- `context-index.schema.json` — kind-classified context entries
  (project/standard/decision/discussion/other).

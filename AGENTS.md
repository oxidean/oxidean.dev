<!-- ox-agent:begin -->

## Ox-Agent toolkit

This repository is managed by `ox-agent` — a repository-local AI-SDLC
runtime. Project state, skills, and contracts live under `.ox-agent/`.

- `ox-agent doctor` validates the setup; `ox-agent start <title>` opens work items.
- Work items carry state in `index.json`; drive them with
  `ox-agent transition|archive|unblock|status`.
- Skills are contracts, not free-form prompts: `.ox-agent/skills/<name>/SKILL.md`
  plus input/output `schemas/`.
- Compile the bounded packet (`ox-agent context compile <wi> --skill <s>`)
  or dispatch via `ox-agent run <wi>`; results land in `runtime/runs/`
  and are schema-validated on collection.
- Materialized skills also resolve under `.agents/skills/` for harnesses
  that scan that path.

Do not edit `.ox-agent/skills`, `schemas`, `workflows`, `pipelines`,
`lifecycle`, or `integrations` in place — they are materialized assets
tracked by `assets.lock`. Add extension skills as new directories instead.
<!-- ox-agent:end -->

## oxidean.dev — org site

Org site for the Oxidean GitHub org — landing + per-product docs covering the forge ([oxidean/oxidean](https://github.com/oxidean/oxidean)), the OxAgent runtime ([oxidean/Ox-Agent](https://github.com/oxidean/Ox-Agent)), and the oxl language ([oxidean/oxl](https://github.com/oxidean/oxl)). Static Astro output deployed to Vercel — no server runtime, no env vars.

### Stack (do not invent alternatives)

| Layer          | Tech                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages          | Astro `src/pages/**` + `src/layouts/SiteShell.astro`                                                                                                                                                    |
| Interactive UI | **Octane** `.tsrx` islands (`src/components/`), `client:load` — not React                                                                                                                               |
| Docs           | Starlight (`@astrojs/starlight`) — product docs materialized from release bundles into `src/content/docs/docs/<product>/<version>/` (nested dir ⇒ `/docs/*` URLs); the hub `index.mdx` is authored here |
| Styling        | Tailwind v4 via `@tailwindcss/vite`; brand tokens in `src/styles/tokens.css` (Tailwind-free — Starlight imports it too)                                                                                 |

### Octane is not React JSX

Author UI in `.tsrx` with `function X() @{ … }`, `@if`/`@else` (no `@else if`), `@for (…; key …)`, native `onInput`. Never mix `return (` JSX with Rivet `@{` in one component. Full reference: `.ox-agent/skills/octane/SKILL.md` (vendored — same as the app repo's copy) and https://octanejs.dev/llms.txt.

### Commands

```bash
bun install
bun run dev / build / preview
bun run lint            # type-aware oxlint (web type gate — plain tsc doesn't know .tsrx)
bun run format:check    # oxfmt + prettier --check (fix with bun run format)
bun run docs:sync       # fetch + unpack locked docs bundles (warns if a release lacks one)
bun run docs:update     # discover new docs bundles on releases, rewrite the lockfile
scripts/commit-check.sh --range origin/main..HEAD
```

### Docs flow (docs-manifest contract)

Product docs are **authored upstream**, never in this repo. Each product repo
keeps a curated `docs/site/` subtree + `manifest.yaml` (`manifest_version: 1`;
validator/packer: [oxidean/docs-manifest](https://github.com/oxidean/docs-manifest)),
CI-validates it, and attaches `docs-<ver>.tar.gz` to each matching release
(`v*` for Ox-Agent/oxl, `ox-v*` for the forge monorepo).

- `docs-versions.lock.json` (committed) pins per-product versions:
  `{source, tag_pattern, default, versions[{version, tag, url, sha256, pages}]}`
  — `pages` is the bundle manifest's sidebar tree, captured by `docs:update`.
- `bun run docs:sync` (postinstall) downloads + sha256-verifies + unpacks into
  `src/content/docs/docs/<product>/<version>/` (gitignored). Version URL
  segments are dash-joined (`0.4.2` → `0-4-2`): Starlight strips dots.
  Soft-fail by design (warns, keeps stale content); `--strict` for CI.
- Sidebar, `/docs/<product>/…` unversioned redirects, and the version
  switcher (`src/components/starlight/VersionSwitcher.astro` via the
  `Sidebar` override) all read the lockfile — they work before bundles ship.
- Do not hand-create product doc pages here; fix them in the owning repo's
  `docs/site/` and let the bundle flow bring them in.

### Hard conventions

- Commit subjects: `type(scope): subject` (`feat`, `fix`, `docs`, `chore`, `test`, `ci`, …) — `scripts/commit-check.sh` via `.githooks/commit-msg` (`git config core.hooksPath .githooks`) and CI `commit-lint`.
- **No AI attribution** on commits or PRs — the gate has no exception clause; see `.cursor/rules/no-ai-attribution.mdc`.
- Brand is shared with the app: tokens in `src/styles/tokens.css`, fonts in `public/fonts/`, mark in `public/oxidean-mark.png` — port changes from `oxidean-app/apps/web` rather than reinventing.
- Theme: landing uses `html.dark` + `oxidean-theme`; docs use Starlight's `html[data-theme]` + `starlight-theme`. `src/lib/theme.ts` bridges the two storage keys — keep them in sync when touching theme code.

# oxidean.dev

<p align="center">
  <img src="public/oxidean-mark.png" alt="Oxidean" width="96" height="96" />
</p>

The public site for the **Oxidean** organization, covering the three
open-source projects: the [Oxidean](https://github.com/oxidean/oxidean)
forge, the [Ox-Agent](https://github.com/oxidean/Ox-Agent) AI-SDLC
toolchain, and the [oxl](https://github.com/oxidean/oxl) language.

## Stack

Astro static output + [Octane](https://octanejs.dev) `.tsrx` islands, the
same UI stack the forge itself ships. Documentation runs on
[Starlight](https://starlight.astro.build) at `/docs/*`, one versioned
section per product (`docs/oxidean/`, `docs/ox-agent/`, `docs/oxl/`),
themed onto the forge's palette (charcoal `#121212` / burnt oxide
`#D75F00`, Sora + Source Sans 3). Product docs are not authored here: each
product repo ships a curated `docs/site/` subtree that its release pipeline
packs into a `docs-<version>.tar.gz` asset; this repo's
`docs-versions.lock.json` pins the newest five releases per product
(plus anything at or above the pinned default) and `bun install`
unpacks them (postinstall runs `docs:sync`). Deploys to
Vercel as a purely static build: no functions, no env vars.

## Develop

```bash
bun install
bun run dev          # astro dev server
bun run build        # static build → dist/
bun run preview      # serve the build locally
bun run lint         # type-aware oxlint (@tsrx/oxc)
bun run format       # oxfmt + prettier --write
bun run format:check # oxfmt + prettier --check (what CI runs)
bun run docs:sync    # fetch + verify + unpack locked docs bundles (also runs on install)
bun run docs:update  # poll product releases for new bundles, rewrite lockfile
```

`docs:update` only rewrites the lockfile; run `bun run docs:sync` after it
so the materialized pages match before building.

## Conventions

- Commit subjects are SemVer-prefixed (`type(scope): subject`), enforced
  locally by `.githooks/commit-msg` (`git config core.hooksPath .githooks`)
  and in CI by `commit-lint` (`scripts/commit-check.sh`).
- No AI/tool attribution on commits or PRs, enforced unconditionally by
  the same gate (`.cursor/rules/no-ai-attribution.mdc`).
- Octane islands live in `src/components/*.tsrx`; page chrome lives in
  `src/layouts/SiteShell.astro`; brand tokens live in `src/styles/tokens.css`
  (Tailwind-free so Starlight can import the palette without preflight).
- Docs content materializes into `src/content/docs/docs/<product>/<ver>/`
  (gitignored). Only the hub `src/content/docs/docs/index.mdx` is authored
  in this repo. The nested `docs/` directory is intentional: it maps doc
  URLs to `/docs/*` while `/` stays free for the landing page. Lock bumps
  arrive via the product-side `docs-release.yml` dispatch, the scheduled
  `docs-poll.yml` job, or a manual `bun run docs:update`. Fix doc pages in
  the owning repo's `docs/site/`, not here.
- Repo-local agent skills (octane, semver-conventions, frontend-design, …)
  are vendored as extension skills under `.ox-agent/skills/`: the
  `ox-agent` materialized set plus ours, surfaced via `.agents/skills`.

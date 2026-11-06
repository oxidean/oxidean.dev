# oxidean.dev

<p align="center">
  <img src="public/oxidean-mark.png" alt="Oxidean" width="96" height="96" />
</p>

The public site for the **Oxidean** organization — covering the three
open-source projects: the [Oxidean](https://github.com/oxidean/oxidean)
forge, the [OxAgent](https://github.com/oxidean/Ox-Agent) AI-SDLC runtime,
and the [oxl](https://github.com/oxidean/oxl) language.

## Stack

Astro static output + [Octane](https://octanejs.dev) `.tsrx` islands — the
same UI stack the forge itself ships. Documentation runs on
[Starlight](https://starlight.astro.build) at `/docs/*` — one section per
product (`docs/oxidean/`, `docs/ox-agent/`, `docs/oxl/`) — themed onto the
forge's palette (charcoal `#121212` / burnt oxide `#D75F00`, Sora + Source
Sans 3). Deploys to Vercel as a purely static build — no functions, no env
vars.

## Develop

```bash
bun install
bun run dev          # astro dev server
bun run build        # static build → dist/
bun run preview      # serve the build locally
bun run lint         # type-aware oxlint (@tsrx/oxc)
bun run format       # oxfmt + prettier --write
```

## Conventions

- Commit subjects are SemVer-prefixed (`type(scope): subject`) — enforced
  locally by `.githooks/commit-msg` (`git config core.hooksPath .githooks`)
  and in CI by `commit-lint` (`scripts/commit-check.sh`).
- No AI/tool attribution on commits or PRs — enforced unconditionally by
  the same gate (`.cursor/rules/no-ai-attribution.mdc`).
- Octane islands live in `src/components/*.tsrx`; page chrome lives in
  `src/layouts/SiteShell.astro`; brand tokens live in `src/styles/tokens.css`
  (Tailwind-free so Starlight can import the palette without preflight).
- Docs pages are `.mdx` under `src/content/docs/docs/` — the nested `docs/`
  directory is intentional: it maps doc URLs to `/docs/*` while `/` stays
  free for the landing page. Content splits per product into `oxidean/`,
  `ox-agent/`, and `oxl/` subdirectories.
- Repo-local agent skills (octane, semver-conventions, frontend-design, …)
  are vendored as extension skills under `.ox-agent/skills/` — the
  `ox-agent` materialized set plus ours, surfaced via `.agents/skills`.

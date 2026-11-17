# Vendored syntax grammars

`oxl.tmLanguage.json` is a byte-exact copy of the canonical TextMate
grammar in [oxidean/oxl](https://github.com/oxidean/oxl) —
`editors/grammars/oxl.tmLanguage.json` at the release tag recorded in
`oxl-source.json`. Do not edit it here; fix the grammar upstream.

`bun run docs:update` keeps it current: when the poll scan discovers a
newer oxl `v*` release, it fetches the grammar file from that tag's git
tree and rewrites both files. Grammar follows the newest language
release — deliberately not the docs-lock default, so highlighting tracks
current syntax even when a doc bundle for that release hasn't shipped.

## Interim for @oxidean/shiki-oxl

This vendor copy stands in for the `oxl` language input while
[oxidean/oxl#122](https://github.com/oxidean/oxl/issues/122) (the
`@oxidean/shiki-oxl` package) is unpublished. When a release ships with
the `shiki-oxl-<ver>.tgz` asset:

1. `bun add https://github.com/oxidean/oxl/releases/download/v<ver>/shiki-oxl-<ver>.tgz`
2. In `astro.config.mjs`, replace the JSON import + inline wrap with
   `import oxlGrammar from "@oxidean/shiki-oxl"`.
3. In `scripts/docs-update.ts`, swap the git-tree fetch for the tarball
   URL + `bun add` (version bump only — the package owns the bytes).
4. Delete this directory.

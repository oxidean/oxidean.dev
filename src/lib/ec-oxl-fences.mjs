// Expressive Code plugin — retitles historical oxl code fences to the
// registered `oxl` grammar at render time.
//
// Published docs bundles predate the grammar and wrote oxl samples as
// `text`/`plaintext` fences carrying a title like `title="main.oxl"` or
// `title="oxl.mod"` (the module manifest file, which shares oxl
// syntax). Bundles are immutable release artifacts, so normalization
// happens here and covers every synced version of every product. New
// bundles authored with native ```oxl fences need no rewrite — `oxl`
// highlights directly.
//
// Fences without an oxl-looking title stay untouched: a bare `text`
// block could be anything. Runs in `preprocessLanguage` — the same hook
// the Text Markers plugin uses to re-alias `diff` — so it works under
// both the satteri and unified markdown processors.
const OXL_FILENAME = /^(?:oxl\.mod|.+\.oxl)$/i;
// Shiki's plain-text lang IDs — anything else is a real language and
// stays untouched.
const PLAIN_LANGS = new Set(["text", "txt", "plain", "plaintext"]);

export function oxlFences() {
  return {
    name: "oxl-fences",
    hooks: {
      preprocessLanguage: ({ codeBlock }) => {
        if (!PLAIN_LANGS.has((codeBlock.language ?? "").toLowerCase())) {
          return;
        }
        const title = codeBlock.metaOptions.getString("title");
        const base = title?.split("/").pop() ?? "";
        if (base && OXL_FILENAME.test(base)) {
          codeBlock.language = "oxl";
        }
      },
    },
  };
}

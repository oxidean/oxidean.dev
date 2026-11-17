import oxlGrammarPkg from "@oxidean/shiki-oxl";
import { oxlFences } from "./src/lib/ec-oxl-fences.mjs";

// @oxidean/shiki-oxl ships the LanguageInput ready-made (lowercase
// `oxl` name, no embedded langs); the `oxl.mod` manifest file shares
// oxl syntax, so it rides as an alias.
const oxlGrammar = { ...oxlGrammarPkg, aliases: ["oxl.mod"] };

// Options live here, not under starlight()'s `expressiveCode` key: the
// <Code> component serializes the options passed to the
// astroExpressiveCode() integration to JSON and rejects anything with
// functions (like the oxlFences plugin below), while this file is
// imported as a real module and auto-loaded by the integration.
// Registers the packaged oxl grammar alongside shiki's bundled langs
// (deep-merged, not replaced) so every docs version can use ```oxl
// fences; the plugin retitles the historical `text` fences that carried
// a *.oxl/oxl.mod title instead.
export default {
  shiki: { langs: [oxlGrammar] },
  plugins: [oxlFences()],
};

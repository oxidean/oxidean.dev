export type ThemePreference = "system" | "light" | "dark";

/**
 * Two storage keys, one setting: `oxidean-theme` is the landing convention
 * (same key the app uses), `starlight-theme` is what the docs theme picker
 * reads/writes (`light | dark | ""` for auto). Boot reads starlight first so a
 * docs-side toggle wins on the next landing paint; applyTheme writes both.
 */
export const THEME_STORAGE_KEY = "oxidean-theme";
export const STARLIGHT_STORAGE_KEY = "starlight-theme";

export function readThemePreference(): ThemePreference {
  try {
    const s = localStorage.getItem(STARLIGHT_STORAGE_KEY);
    if (s === "light" || s === "dark") return s;
    if (s === "auto" || s === "") return "system";
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // Storage can throw (disabled cookies, privacy modes); fall back to
    // system so callers' change listeners still register.
  }
  return "system";
}

export function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(pref: ThemePreference) {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
    localStorage.setItem(STARLIGHT_STORAGE_KEY, pref === "system" ? "" : pref);
  } catch {
    // Persisting is best-effort; the explicit choice still applies for
    // the session even when storage is unavailable.
  }
}

export const THEME_OPTIONS: readonly ThemePreference[] = ["system", "light", "dark"];

// Runs in <head> before first paint. Static literal, never interpolate
// request data or storage values into this string.
export const THEME_BOOT_SCRIPT =
  '(function(){try{var s=localStorage.getItem("starlight-theme");' +
  'var o=localStorage.getItem("oxidean-theme");' +
  'var p=(s==="light"||s==="dark")?s:' +
  '(s==="auto"||s==="")?"system":' +
  '((o==="light"||o==="dark"||o==="system")?o:"system");' +
  'var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);' +
  'var r=document.documentElement;r.classList.toggle("dark",d);' +
  "r.dataset.theme=d?'dark':'light';" +
  "}catch(e){}})();";

/**
 * Warm webfonts into `document.fonts` so full-document navigations do not
 * paint a long stretch of metric fallbacks after CSS re-applies.
 * Static literal, no interpolation (same threat model as theme boot).
 */
export const FONT_WARM_SCRIPT =
  "(function(){try{if(!document.fonts||!document.fonts.load)return;" +
  "document.fonts.load('600 24px \"Sora Variable\"');" +
  "document.fonts.load('400 16px \"Source Sans 3 Variable\"');" +
  "}catch(e){}})();";

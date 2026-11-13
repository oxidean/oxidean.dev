import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import octane from "@octanejs/astro";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import docsLock from "./docs-versions.lock.json";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Product docs are materialized from release bundles under
 * src/content/docs/docs/<product>/<version>/ (see docs-versions.lock.json
 * and `bun run docs:sync`). The sidebar mirrors each bundle's manifest
 * `pages` tree, grouped per version; collapsed groups auto-expand around
 * the current page.
 */
function mapManifestPage(slug, versionSegment, page) {
  if (page.link) {
    const rest = page.link === "/" ? "" : page.link.replace(/\/$/, "");
    return { label: page.label, link: `/docs/${slug}/${versionSegment}${rest}/` };
  }
  return {
    label: page.label,
    collapsed: true,
    items: (page.items ?? []).map((item) => mapManifestPage(slug, versionSegment, item)),
  };
}

const versionGroup = (slug, label, versionSegment, pages) => ({
  label,
  collapsed: true,
  items: (pages ?? []).map((page) => mapManifestPage(slug, versionSegment, page)),
});

// Each product's pinned default is served twice: at its numbered route
// (/docs/<p>/<vseg>/…) for pinning, and under the `latest` alias that all
// internal links target. The sitemap is the crawl signal for which space
// is canonical — drop the numbered default tree so `latest` wins.
const defaultVersionSegs = Object.entries(docsLock.products).map(
  ([slug, product]) => `/docs/${slug}/${product.default.replaceAll(".", "-")}/`,
);

const docsSidebar = [
  { slug: "docs" },
  ...Object.entries(docsLock.products).map(([slug, product]) => {
    const def = product.versions.find((v) => v.version === product.default);
    return {
      label: product.name ?? slug,
      items: [
        // `latest` aliases the default version — docs:sync materializes a
        // matching content tree, so these links keep browsers inside the
        // /docs/<slug>/latest/ space.
        versionGroup(slug, `latest (v${product.default})`, "latest", def?.pages),
        ...product.versions.map((v) =>
          versionGroup(
            slug,
            `v${v.version}${v.version === product.default ? " (latest)" : ""}`,
            v.version.replaceAll(".", "-"),
            v.pages,
          ),
        ),
      ],
    };
  }),
];

const fontPreloads = [
  {
    tag: "link",
    attrs: {
      rel: "preload",
      href: "/fonts/sora-latin.woff2",
      as: "font",
      type: "font/woff2",
      crossorigin: "anonymous",
    },
  },
  {
    tag: "link",
    attrs: {
      rel: "preload",
      href: "/fonts/source-sans-3-latin.woff2",
      as: "font",
      type: "font/woff2",
      crossorigin: "anonymous",
    },
  },
  { tag: "link", attrs: { rel: "icon", href: "/favicon.ico", sizes: "any" } },
  {
    tag: "link",
    attrs: {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      href: "/favicon-32.png",
    },
  },
  {
    tag: "link",
    attrs: {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      href: "/favicon-16.png",
    },
  },
  { tag: "link", attrs: { rel: "apple-touch-icon", href: "/apple-touch-icon.png" } },
  {
    tag: "meta",
    attrs: {
      name: "theme-color",
      content: "#ffffff",
      media: "(prefers-color-scheme: light)",
    },
  },
  {
    tag: "meta",
    attrs: {
      name: "theme-color",
      content: "#121212",
      media: "(prefers-color-scheme: dark)",
    },
  },
];

/**
 * Marketing pages are hand-authored under src/pages; documentation is
 * Starlight-driven from src/content/docs/docs/ (nested so docs URLs land at
 * /docs/*, keeping / free for the landing tree). Octane .tsrx components
 * mount as client:load islands; everything else is static HTML.
 */
export default defineConfig({
  site: "https://oxidean.dev",
  output: "static",
  integrations: [
    octane(),
    // Registered ahead of Starlight so its deferred sitemap setup yields —
    // the filter keeps only the canonical `latest` space for each product's
    // default version; numbered default pages stay reachable, just unlisted.
    sitemap({
      filter: (page) => !defaultVersionSegs.some((seg) => page.includes(seg)),
    }),
    starlight({
      title: "Oxidean",
      favicon: "/favicon.ico",
      description:
        "Oxidean ships three open-source projects: a self-hostable code forge, a repository-local AI-SDLC toolchain, and a language for CLI tools and services.",
      components: {
        SiteTitle: "./src/components/starlight/SiteTitle.astro",
        Sidebar: "./src/components/starlight/Sidebar.astro",
      },
      customCss: ["./src/styles/starlight.css"],
      head: fontPreloads,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/oxidean",
        },
      ],
      sidebar: docsSidebar,
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
      },
    },
  },
});

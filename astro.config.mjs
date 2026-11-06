import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import octane from "@octanejs/astro";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

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
 * mount as client:load islands — everything else is static HTML.
 */
export default defineConfig({
  site: "https://oxidean.dev",
  output: "static",
  integrations: [
    octane(),
    starlight({
      title: "Oxidean",
      description:
        "Self-hostable code forge — git hosting, pull requests, issues, CI actions, and package registries in one product.",
      components: {
        SiteTitle: "./src/components/starlight/SiteTitle.astro",
      },
      customCss: ["./src/styles/starlight.css"],
      head: fontPreloads,
      editLink: {
        baseUrl: "https://github.com/oxidean/oxidean.dev/edit/main/",
      },
      lastUpdated: true,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/oxidean/oxidean",
        },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [{ slug: "docs" }, { slug: "docs/quickstart" }],
        },
        {
          label: "Self-hosting",
          items: [{ autogenerate: { directory: "docs/self-hosting" } }],
        },
        {
          label: "Reference",
          items: [
            { slug: "docs/cli" },
            { slug: "docs/configuration" },
            { slug: "docs/contributing" },
          ],
        },
      ],
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

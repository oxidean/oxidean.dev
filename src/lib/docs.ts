import docsLock from "../../docs-versions.lock.json";

/**
 * Docs routes are versioned: `/docs/<product>/<vseg>/…` where the segment is
 * the dash-joined release version (0.4.2 → 0-4-2). Internal links resolve to
 * the lockfile's pinned default version at build time so navigation lands on
 * a real page; unversioned URLs keep working for external inbound traffic via
 * the meta-refresh stub (src/pages/docs/[product]/[...slug].astro).
 */

type PageTreeItem = {
  link?: string;
  items?: PageTreeItem[];
};

type LockProduct = {
  default: string;
  versions: { version: string; pages?: PageTreeItem[] }[];
};

const products = docsLock.products as unknown as Record<string, LockProduct>;

const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");

const linksCache = new Map<string, Set<string>>();

function defaultPageLinks(slug: string, product: LockProduct): Set<string> {
  let links = linksCache.get(slug);
  if (links) return links;
  links = new Set<string>();
  const def = product.versions.find((v) => v.version === product.default);
  const walk = (items?: PageTreeItem[]) => {
    for (const item of items ?? []) {
      if (item.link) links.add(trimSlashes(item.link));
      if (item.items) walk(item.items);
    }
  };
  walk(def?.pages);
  linksCache.set(slug, links);
  return links;
}

/** `/docs/oxl/` → `/docs/oxl/<default-vseg>/`; `rest` resolves inside it. */
export function docsHref(slug: string, rest = ""): string {
  const product = products[slug];
  const def = product?.versions.find((v) => v.version === product.default);
  if (!def) {
    console.warn(`[docsHref] no lockfile entry for "${slug}"; emitting unversioned link`);
    return `/docs/${slug}/`;
  }
  const r = trimSlashes(rest);
  if (r && !defaultPageLinks(slug, product).has(r)) {
    const msg = `[docsHref] ${slug}@${def.version} has no page "/${r}/"`;
    if (process.env.CI || process.env.VERCEL) throw new Error(msg);
    console.warn(msg);
  }
  const base = `/docs/${slug}/${def.version.replaceAll(".", "-")}`;
  return r ? `${base}/${r}/` : `${base}/`;
}

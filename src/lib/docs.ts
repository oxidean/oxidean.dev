import docsLock from "../../docs-versions.lock.json";

/**
 * Docs routes are versioned: `/docs/<product>/<vseg>/…` where the segment is
 * the dash-joined release version (0.4.2 → 0-4-2). The `latest` segment is
 * an alias of the lockfile's pinned default — docs:sync materializes it as
 * a real content tree, so internal links point straight at `/latest/` and
 * no redirect layer is needed. Unversioned product URLs 404 by design.
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

/** `/docs/oxl/` → `/docs/oxl/latest/`; `rest` resolves inside the default tree. */
export function docsHref(slug: string, rest = ""): string {
  const product = products[slug];
  const def = product?.versions.find((v) => v.version === product.default);
  if (!def) {
    const msg = `[docsHref] no lockfile entry for "${slug}"`;
    if (process.env.CI || process.env.VERCEL) throw new Error(msg);
    console.warn(msg);
    return `/docs/${slug}/latest/`;
  }
  const r = trimSlashes(rest);
  if (r && !defaultPageLinks(slug, product).has(r)) {
    const msg = `[docsHref] ${slug}@${def.version} has no page "/${r}/"`;
    if (process.env.CI || process.env.VERCEL) throw new Error(msg);
    console.warn(msg);
  }
  const base = `/docs/${slug}/latest`;
  return r ? `${base}/${r}/` : `${base}/`;
}

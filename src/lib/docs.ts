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

function pageLinks(product: LockProduct): Set<string> {
  const def = product.versions.find((v) => v.version === product.default);
  const links = new Set<string>();
  const walk = (items?: PageTreeItem[]) => {
    for (const item of items ?? []) {
      if (item.link) links.add(trimSlashes(item.link));
      if (item.items) walk(item.items);
    }
  };
  walk(def?.pages);
  return links;
}

/** `/docs/oxl/` → `/docs/oxl/<default-vseg>/`; `rest` resolves inside it. */
export function docsHref(slug: string, rest = ""): string {
  const product = products[slug];
  const def = product?.versions.find((v) => v.version === product.default);
  if (!def) return `/docs/${slug}/`;
  const r = trimSlashes(rest);
  if (r && !pageLinks(product).has(r)) {
    console.warn(`[docsHref] ${slug}@${def.version} has no page "/${r}/"`);
  }
  const base = `/docs/${slug}/${def.version.replaceAll(".", "-")}`;
  return r ? `${base}/${r}/` : `${base}/`;
}

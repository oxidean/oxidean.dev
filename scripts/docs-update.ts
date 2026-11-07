// docs:update — refresh docs-versions.lock.json from GitHub releases.
//
// For each product: list releases via `gh api` (falls back to the public
// REST API), keep releases whose tag matches the product tag_pattern and
// that carry a docs-<v>.tar.gz asset, take the newest 5 (never dropping
// the pinned default), download each bundle for its sha256 + manifest
// `pages` tree, and rewrite the lockfile.
//
// Usage: bun run docs:update [--dry-run]

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  bundleAssetName,
  compareVersions,
  fetchBytes,
  manifestPages,
  sha256Hex,
  tagGlobToRegExp,
  versionFromTag,
  type DocsLock,
  type LockVersion,
} from "./lib/docs-manifest";

const KEEP = 5;
const root = join(import.meta.dirname, "..");
const lockPath = join(root, "docs-versions.lock.json");
const dryRun = process.argv.includes("--dry-run");

const lock = JSON.parse(readFileSync(lockPath, "utf8")) as DocsLock;

interface Release {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string }[];
}

function listReleases(repo: string): Release[] {
  try {
    const out = execFileSync(
      "gh",
      ["api", `repos/${repo}/releases?per_page=100`],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    return JSON.parse(out) as Release[];
  } catch {
    // fall through to unauthenticated REST
  }
  throw new Error(`gh api failed for ${repo} — is gh authenticated?`);
}

for (const [slug, product] of Object.entries(lock.products)) {
  const tagRe = tagGlobToRegExp(product.tag_pattern);
  const releases = listReleases(product.source).filter(
    (r) => !r.draft && !r.prerelease && tagRe.test(r.tag_name),
  );

  const withDocs = releases.filter((r) =>
    r.assets.some((a) => a.name === bundleAssetName(versionFromTag(r.tag_name))),
  );

  const sorted = [...withDocs].sort((a, b) =>
    compareVersions(versionFromTag(b.tag_name), versionFromTag(a.tag_name)),
  );

  const picked = sorted.filter((r, i) => {
    const v = versionFromTag(r.tag_name);
    return i < KEEP || compareVersions(v, product.default) >= 0;
  });

  const versions: LockVersion[] = [];
  for (const r of picked) {
    const version = versionFromTag(r.tag_name);
    const asset = r.assets.find((a) => a.name === bundleAssetName(version))!;
    const bytes = await fetchBytes(asset.browser_download_url);
    const pages = manifestPages(bytes);
    versions.push({
      version,
      tag: r.tag_name,
      url: asset.browser_download_url,
      sha256: sha256Hex(bytes),
      pages,
    });
    console.log(`  ${slug}@${version} (${r.tag_name}) — ${pages.length} top-level pages`);
  }

  product.versions = versions;
  if (versions.length && !versions.some((v) => v.version === product.default)) {
    product.default = versions[0].version;
    console.log(`  ${slug}: default → ${product.default}`);
  }
}

if (dryRun) {
  console.log("docs:update --dry-run; lockfile unchanged");
} else {
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  console.log(`docs:update — wrote ${lockPath}`);
}

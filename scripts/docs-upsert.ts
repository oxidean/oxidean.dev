// docs:upsert — pin one docs bundle into docs-versions.lock.json.
//
// Targeted variant of docs:update, driven by the docs-release
// workflow_dispatch from a product repo (or run by hand). Downloads
// docs-<version>.tar.gz from the given release, computes its sha256,
// captures the manifest `pages` tree, upserts the version entry, bumps
// `default` forward, prunes to KEEP versions, and rewrites the lockfile.
//
// Usage:
//   bun scripts/docs-upsert.ts --product oxl --version 0.4.0 \
//     --repo oxidean/oxl --tag v0.4.0 [--url file:///path] [--dry-run]

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  bundleAssetName,
  compareVersions,
  fetchBytes,
  manifestPages,
  sha256Hex,
  tagGlobToRegExp,
  type DocsLock,
} from "./lib/docs-manifest";

const KEEP = 5;
const root = join(import.meta.dirname, "..");
const lockPath = join(root, "docs-versions.lock.json");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const productSlug = arg("product");
const version = arg("version");
const repo = arg("repo");
const tag = arg("tag");
const urlOverride = arg("url");
const dryRun = process.argv.includes("--dry-run");

for (const [name, val] of Object.entries({ product: productSlug, version, repo, tag })) {
  if (!val) {
    console.error(`docs:upsert — missing --${name}`);
    process.exit(2);
  }
}

const lock = JSON.parse(readFileSync(lockPath, "utf8")) as DocsLock;
const product = lock.products[productSlug!];
if (!product) {
  console.error(`docs:upsert — unknown product "${productSlug}" (known: ${Object.keys(lock.products).join(", ")})`);
  process.exit(1);
}
if (product.source !== repo) {
  console.error(`docs:upsert — repo mismatch for ${productSlug}: lock has ${product.source}, got ${repo}`);
  process.exit(1);
}
if (!tagGlobToRegExp(product.tag_pattern).test(tag!)) {
  console.error(`docs:upsert — tag "${tag}" does not match ${productSlug} tag_pattern "${product.tag_pattern}"`);
  process.exit(1);
}
if (product.versions.some((v) => v.version === version)) {
  console.log(`docs:upsert — ${productSlug}@${version} already pinned; refreshing entry`);
}

const url =
  urlOverride ?? `https://github.com/${repo}/releases/download/${tag}/${bundleAssetName(version!)}`;
const bytes = await fetchBytes(url);
const digest = sha256Hex(bytes);
const pages = manifestPages(bytes);
console.log(`  ${productSlug}@${version} — ${pages.length} top-level pages, sha256 ${digest.slice(0, 12)}…`);

product.versions = product.versions.filter((v) => v.version !== version);
product.versions.push({ version: version!, tag: tag!, url, sha256: digest, pages });
product.versions.sort((a, b) => compareVersions(b.version, a.version));

if (compareVersions(version!, product.default) > 0) {
  product.default = version!;
  console.log(`  ${productSlug}: default → ${version}`);
}

// Same retention rule as docs:update: newest KEEP, never below default.
product.versions = product.versions.filter(
  (v, i) => i < KEEP || compareVersions(v.version, product.default) >= 0,
);

if (dryRun) {
  console.log("docs:upsert --dry-run; lockfile unchanged");
} else {
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  console.log(`docs:upsert — wrote ${lockPath}`);
}

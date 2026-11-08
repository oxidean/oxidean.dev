// Shared helpers for the docs-manifest contract (manifest_version 1).
// The contract schema lives in oxidean/docs-manifest; these mirror the
// fields the site consumes from docs-versions.lock.json.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";

export interface ManifestPage {
  label: string;
  link?: string;
  items?: ManifestPage[];
}

export interface LockVersion {
  version: string;
  tag: string;
  url: string;
  /** Pinned bundle digest. null = unpinned (bootstrap before first pack). */
  sha256: string | null;
  /** The bundle's manifest `pages` tree, captured at update time. */
  pages: ManifestPage[];
}

export interface LockProduct {
  name: string;
  /** GitHub owner/repo that owns docs/site/. */
  source: string;
  /** Release tag glob carrying docs bundles, e.g. "v*", "ox-v*". */
  tag_pattern: string;
  /** Version treated as latest for unversioned URLs. */
  default: string;
  versions: LockVersion[];
}

export interface DocsLock {
  schema_version: 1;
  products: Record<string, LockProduct>;
}

export function sha256Hex(buf: Uint8Array | ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(buf)).digest("hex");
}

/** "ox-v*" → /^ox-v.*$/ — release-tag glob to RegExp (only `*` supported). */
export function tagGlobToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

/** Strip the longest non-digit prefix: "ox-v0.4.2" → "0.4.2", "v0.1.7" → "0.1.7". */
export function versionFromTag(tag: string): string {
  const m = tag.match(/[0-9].*$/);
  return m ? m[0] : tag;
}

/** Compare semver-ish versions numerically; non-numeric tails rank lower. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((p) => (/^\d+$/.test(p) ? Number(p) : -1));
  const pb = b.split(/[.-]/).map((p) => (/^\d+$/.test(p) ? Number(p) : -1));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export async function fetchBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith("file://")) {
    return new Uint8Array(readFileSync(new URL(url).pathname));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Docs bundle asset name for a version, e.g. docs-0.4.0.tar.gz. */
export function bundleAssetName(version: string): string {
  return `docs-${version}.tar.gz`;
}

/**
 * URL path segment for a docs version: "0.4.2" → "0-4-2".
 * Starlight strips dots from slugs, so dotted versions would route as 042.
 */
export function versionUrlSegment(version: string): string {
  return version.replaceAll(".", "-");
}

/** Extract manifest.yaml from a docs bundle and return its `pages` tree. */
export function manifestPages(bytes: Uint8Array): ManifestPage[] {
  const tmp = mkdtempSync(join(tmpdir(), "docs-manifest-"));
  try {
    const tgz = join(tmp, "bundle.tar.gz");
    writeFileSync(tgz, bytes);
    const raw = execFileSync("tar", ["-xzOf", tgz, "manifest.yaml"], { encoding: "utf8" });
    const manifest = parse(raw) as { pages?: unknown } | null;
    const pages = manifest?.pages;
    if (pages == null) return [];
    if (!Array.isArray(pages)) {
      throw new Error("manifest.yaml: `pages` is not an array");
    }
    return pages as ManifestPage[];
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

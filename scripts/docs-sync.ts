// docs:sync — materialize pinned docs bundles into src/content/docs/docs/.
//
// Reads docs-versions.lock.json, downloads each version's docs-<v>.tar.gz
// (https or file:// URLs), verifies sha256 when pinned, and unpacks the
// bundle's page tree (everything except manifest.yaml) into
// src/content/docs/docs/<product>/<version>/, where <version> is the
// dash-joined form (0.4.2 → 0-4-2) so Starlight keeps it in the slug —
// dots would be stripped (0.4.2 → 042).
//
// Soft by default: a fetch/verify failure warns and keeps going so builds
// work before bundles exist upstream. Pass --strict to fail hard. Strict
// is implicit in CI and Vercel builds — a missing bundle there means the
// deploy would ship sidebar links to nonexistent routes, so the build
// goes red instead (Vercel keeps serving the last good deploy).

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchBytes, sha256Hex, type DocsLock } from "./lib/docs-manifest";

const root = join(import.meta.dirname, "..");
const lockPath = join(root, "docs-versions.lock.json");
const docsRoot = join(root, "src/content/docs/docs");
// DOCS_SYNC_STRICT=0 overrides auto-detect — the ingest workflow's
// install step runs soft because a stale pin is exactly what it exists
// to repair; strict there would deadlock it. Everything else stays
// strict under CI/Vercel.
const strict =
  process.env.DOCS_SYNC_STRICT != null
    ? process.env.DOCS_SYNC_STRICT !== "0"
    : process.argv.includes("--strict") ||
      process.env.CI === "true" ||
      Boolean(process.env.VERCEL);

const lock = JSON.parse(readFileSync(lockPath, "utf8")) as DocsLock;

let fetched = 0;
let skipped = 0;
let failed = 0;

for (const [slug, product] of Object.entries(lock.products)) {
  // The product dir is wiped lazily on the FIRST successful fetch so
  // dropped versions never linger, while a failed run keeps stale content.
  let cleaned = false;
  for (const v of product.versions) {
    const dest = join(docsRoot, slug, v.version.replaceAll(".", "-"));
    try {
      const bytes = await fetchBytes(v.url);
      const digest = sha256Hex(bytes);
      if (v.sha256 && digest !== v.sha256) {
        throw new Error(
          `sha256 mismatch for ${slug}@${v.version}: expected ${v.sha256}, got ${digest}`,
        );
      }
      if (!v.sha256) {
        console.warn(`  ${slug}@${v.version}: unpinned bundle (sha256 ${digest.slice(0, 12)}…)`);
      }

      // Extract + strip in a temp dir first — dest is replaced only
      // after the whole unpack succeeds, so a tar failure keeps the
      // stale copy the warning below claims to keep.
      const tmp = mkdtempSync(join(tmpdir(), "docs-bundle-"));
      const tgz = join(tmp, "bundle.tar.gz");
      const extracted = join(tmp, "x");
      writeFileSync(tgz, bytes);
      mkdirSync(extracted);
      execFileSync("tar", ["-xzf", tgz, "-C", extracted]);
      rmSync(join(extracted, "manifest.yaml"), { force: true });
      if (!cleaned) {
        rmSync(join(docsRoot, slug), { recursive: true, force: true });
        cleaned = true;
      }
      rmSync(dest, { recursive: true, force: true });
      cpSync(extracted, dest, { recursive: true });
      rmSync(tmp, { recursive: true, force: true });
      fetched++;
      console.log(`  ${slug}@${v.version} → ${dest}`);
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      const verb = strict ? "error" : existsSync(dest) ? "warn (stale copy kept)" : "warn";
      console[strict ? "error" : "warn"](`  ${slug}@${v.version}: ${verb}: ${msg}`);
    }
  }
}

console.log(`docs:sync — ${fetched} materialized, ${skipped} skipped, ${failed} failed`);
if (strict && failed > 0) process.exit(1);

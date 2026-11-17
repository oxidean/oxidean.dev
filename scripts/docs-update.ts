// docs:update — refresh docs-versions.lock.json from GitHub releases.
//
// For each product: list releases via `gh api` (paginated — the API has
// no tag filter), keep releases whose tag matches the product
// tag_pattern and that carry a docs-<v>.tar.gz asset, take the newest 5
// plus every still-locked entry the scan omits, download each bundle
// for its sha256 + manifest `pages` tree, and rewrite the lockfile.
//
// Also bumps the @oxidean/shiki-oxl grammar dep when the scan discovers
// a newer oxl release carrying its tarball — the grammar tracks the
// newest language tag, not the docs-lock default, so highlighting
// follows current syntax even before that release's doc bundle ships.
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
// Release-listing pagination: the API has no server-side tag filter and
// oxidean/oxidean floods its feed with ~14 component-tag releases per
// train, so ox-v* tags slide pages deep — pagination is the only way to
// see them. The cap bounds discovery only; locked versions beyond it
// are retained by the keep-pinned guard below.
const PER_PAGE = 100;
const MAX_PAGES = 30;
const root = join(import.meta.dirname, "..");
const lockPath = join(root, "docs-versions.lock.json");
const dryRun = process.argv.includes("--dry-run");

const lock = JSON.parse(readFileSync(lockPath, "utf8")) as DocsLock;

// @oxidean/shiki-oxl is a release-tarball URL dep (see the package
// README in oxidean/oxl) — the spec itself encodes the grammar's repo
// and pinned tag, so this script self-locates both from package.json.
// A missing or non-URL dep disables grammar sync with a warning —
// warn-and-keep applies end to end.
const GRAMMAR_PKG = "@oxidean/shiki-oxl";
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const grammarSpec: string =
  pkg?.dependencies?.[GRAMMAR_PKG] ?? pkg?.devDependencies?.[GRAMMAR_PKG] ?? "";
const specMatch =
  /^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/download\/(v[^/]+)\/[^/]+\.tgz$/.exec(
    grammarSpec,
  );
const grammarSrc: { repo: string; tag: string } | null = specMatch
  ? { repo: specMatch[1], tag: specMatch[2] }
  : null;
if (grammarSrc === null) {
  console.warn(
    `  oxl grammar: ${GRAMMAR_PKG} dep missing or not a GitHub release ` +
      `tarball URL — grammar sync disabled`,
  );
}
// Newest matching release for the grammar's repo, captured during the
// scan (first non-empty match wins — products sharing one source repo
// don't overwrite each other's capture).
let newestGrammarRelease: Release | undefined;

interface Release {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string }[];
}

function listReleases(repo: string): Release[] {
  const releases: Release[] = [];
  let truncated = true;
  for (let page = 1; page <= MAX_PAGES; page++) {
    let batch: Release[];
    try {
      const out = execFileSync(
        "gh",
        ["api", `repos/${repo}/releases?per_page=${PER_PAGE}&page=${page}`],
        { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
      );
      batch = JSON.parse(out) as Release[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`gh api failed for ${repo} (page ${page}): ${msg}`);
    }
    releases.push(...batch);
    if (batch.length < PER_PAGE) {
      truncated = false;
      break;
    }
  }
  if (truncated) {
    console.warn(
      `  ${repo}: listing truncated at ${MAX_PAGES} pages ` +
        `(${releases.length} releases) — older releases not scanned`,
    );
  }
  return releases;
}

for (const [slug, product] of Object.entries(lock.products)) {
  const tagRe = tagGlobToRegExp(product.tag_pattern);
  const releases = listReleases(product.source).filter(
    (r) => !r.draft && !r.prerelease && tagRe.test(r.tag_name),
  );

  if (grammarSrc && product.source === grammarSrc.repo) {
    const byVersion = [...releases].sort((a, b) =>
      compareVersions(versionFromTag(b.tag_name), versionFromTag(a.tag_name)),
    );
    newestGrammarRelease ??= byVersion[0];
  }

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

  // Keep every locked entry the rebuilt list omits (pagination cap,
  // missing asset, tag-filter miss, KEEP cutoff) — dropping it removes
  // its deployed pages and breaks the version switcher. The locked URL
  // is the only remaining evidence: a confirmed-deleted bundle is a
  // hard error (sync can't fetch it and the routes it serves would
  // 404); anything else, including a failed HEAD, is unverifiable —
  // keep the entry and warn.
  for (const locked of product.versions) {
    if (versions.some((v) => v.version === locked.version)) continue;
    const head = await fetch(locked.url, { method: "HEAD" }).catch(() => null);
    if (head?.status === 404) {
      throw new Error(
        `${slug}: locked ${locked.version} bundle is gone upstream ` +
          `(${locked.url}) — re-pin an available version or restore the asset`,
      );
    }
    console.warn(
      `  ${slug}@${locked.version}: not re-discovered — keeping locked ` +
        `entry (bundle HEAD ${head ? head.status : "failed"})`,
    );
    versions.push(locked);
  }
  versions.sort((a, b) => compareVersions(b.version, a.version));

  product.versions = versions;
  if (versions.length) {
    // Same rule as docs:upsert — a newer discovered version takes over as
    // default; also heals a default that dropped out of the list.
    const newest = versions[0].version;
    if (
      !versions.some((v) => v.version === product.default) ||
      compareVersions(newest, product.default) > 0
    ) {
      product.default = newest;
      console.log(`  ${slug}: default → ${product.default}`);
    }
  }
}

// Grammar package bump. Warn-and-keep on any failure: stale
// highlighting must never block a docs-lock update — the next poll
// retries anyway. Only a newer upstream tag re-pins; an equal tag is
// already current (the package manager owns the bytes — a missing
// node_modules copy is `bun install`'s job, not this script's).
if (grammarSrc === null) {
  // Dep missing/malformed — warning already logged above.
} else if (newestGrammarRelease === undefined) {
  console.warn(
    `  oxl grammar: no matching releases on ${grammarSrc.repo} — ` +
      `keeping ${grammarSrc.tag}`,
  );
} else {
  const newestTag = newestGrammarRelease.tag_name;
  const newestVer = versionFromTag(newestTag);
  const drift = compareVersions(newestVer, versionFromTag(grammarSrc.tag));
  if (drift < 0) {
    console.warn(
      `  oxl grammar: upstream newest ${newestTag} is older than ` +
        `pinned ${grammarSrc.tag} — keeping pinned`,
    );
  } else if (drift === 0) {
    console.log(`  oxl grammar: already current (${grammarSrc.tag})`);
  } else {
    // The versioned asset is the pinned unit — the fixed-name
    // shiki-oxl.tgz on the same release floats, so it never lands in a
    // dependency spec.
    const assetName = `oxidean-shiki-oxl-${newestVer}.tgz`;
    const asset = newestGrammarRelease.assets.find((a) => a.name === assetName);
    if (!asset) {
      console.warn(
        `  oxl grammar: ${newestTag} carries no ${assetName} — ` +
          `keeping ${grammarSrc.tag}`,
      );
    } else if (dryRun) {
      console.log(`  oxl grammar: would bump ${grammarSrc.tag} → ${newestTag}`);
    } else {
      try {
        execFileSync(
          "bun",
          ["add", `${GRAMMAR_PKG}@${asset.browser_download_url}`],
          { cwd: root, stdio: ["pipe", "pipe", "pipe"] },
        );
        console.log(`  oxl grammar: bumped ${grammarSrc.tag} → ${newestTag}`);
      } catch (err) {
        // Surface stderr (e.g. the HTTP status) — err.message alone is
        // just "Command failed: bun add …".
        const stderr =
          err && typeof err === "object" && "stderr" in err
            ? String(err.stderr).split("\n")[0]
            : "";
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `  oxl grammar: bump to ${newestTag} failed — keeping ` +
            `${grammarSrc.tag} (${stderr || msg.split("\n")[0]})`,
        );
      }
    }
  }
}

if (dryRun) {
  console.log("docs:update --dry-run; lockfile unchanged");
} else {
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  console.log(`docs:update — wrote ${lockPath}`);
}

#!/usr/bin/env node
// Populates the ~70 MB of runtime binaries the POC needs to run fully offline:
//
//   www/pyodide/   Pyodide runtime + the wheels index.html loads (pinned release,
//                  every file sha256-verified against the release's lock file)
//   www/duckdb/    duckdb-wasm eh-variant WASM + worker, copied from node_modules,
//                  plus a flat esbuild bundle of the browser entry point (the npm
//                  .mjs has a bare `import "apache-arrow"` that only resolves via
//                  jsDelivr's import rewriting, so it must be bundled to work
//                  from a file:// / capacitor:// origin)
//   www/NGC.csv    the OpenNGC catalog, copied from the repo's data/ directory
//
// None of this is checked in; run `npm run fetch-vendor` after cloning. Files that
// already exist with the right hash are skipped, so re-running is cheap.

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WWW = join(ROOT, "www");
const REPO = resolve(ROOT, "..");

// -- Pyodide ---------------------------------------------------------------
// Bump PYODIDE_VERSION and refresh RUNTIME_HASHES together: the wheels are
// verified against pyodide-lock.json, and pyodide-lock.json is verified here.
const PYODIDE_VERSION = "314.0.2";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full`;
const RUNTIME_HASHES = {
  "pyodide.js":
    "95fc4de60f515e3f5c4a9acd86849068f8e5cc0818652c0963e43de08b9b2f30",
  "pyodide.mjs":
    "955d2088bbb7fc79a73c4802aca2370c1d95bfdfaffa4121e0faebda2b0ea3f9",
  "pyodide.asm.mjs":
    "c7eccdfeb7a8419d61f910f0685b45cd5610b7ff5bbe844c3c1050ee6623b641",
  "pyodide.asm.wasm":
    "f7a8a169e513791e18fa0790fb69d6f2656b779e9012ba57e03e973f0df0b39f",
  "python_stdlib.zip":
    "101a9c94ca6304c1478c89b7b595136b9a51b4289bdc5b467d86db553efee9b3",
  "pyodide-lock.json":
    "c963d22858f6bcb8f41586a2142f03905ab370c88ea22a86a2736e95fac2a8f3",
};
// What index.html passes to pyodide.loadPackage. Their
// transitive dependencies are resolved from the lock file below.
const PYODIDE_ROOT_PACKAGES = [
  "numpy",
  "pandas",
  "six",
  "pytz",
  "pydantic",
  "astropy",
];

// -- duckdb-wasm -------------------------------------------------------------
// Version comes from package.json / package-lock.json via npm install.
const DUCKDB_DIST = join(
  ROOT,
  "node_modules",
  "@duckdb",
  "duckdb-wasm",
  "dist",
);
const DUCKDB_COPY = ["duckdb-eh.wasm", "duckdb-browser-eh.worker.js"];

// -- Catalog -----------------------------------------------------------------
const NGC_SRC = join(REPO, "data", "catalogs", "openngc", "NGC.csv");

// ---------------------------------------------------------------------------

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function hashOf(path) {
  try {
    return sha256(await readFile(path));
  } catch {
    return null;
  }
}

async function fetchVerified(url, dest, expected) {
  if ((await hashOf(dest)) === expected) {
    console.log(`  ok       ${dest.replace(ROOT + "/", "")}`);
    return;
  }
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`${res.status} ${res.statusText} fetching ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = sha256(buf);
  if (got !== expected) {
    throw new Error(
      `sha256 mismatch for ${url}\n  expected ${expected}\n  got      ${got}`,
    );
  }
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  console.log(
    `  fetched  ${dest.replace(ROOT + "/", "")}  (${(
      buf.length / 1048576
    ).toFixed(1)} MB)`,
  );
}

async function fetchPyodide() {
  console.log(`Pyodide ${PYODIDE_VERSION}`);
  const dir = join(WWW, "pyodide");
  for (const [name, hash] of Object.entries(RUNTIME_HASHES)) {
    await fetchVerified(`${PYODIDE_CDN}/${name}`, join(dir, name), hash);
  }

  const lock = JSON.parse(
    await readFile(join(dir, "pyodide-lock.json"), "utf8"),
  );
  // Lock keys are PEP 503-normalized ("pydantic-core") but `depends` entries
  // are not always ("pydantic_core"), so normalize before lookup.
  const normalize = (name) => name.toLowerCase().replace(/[-_.]+/g, "-");
  const wanted = new Set();
  const visit = (raw) => {
    const name = normalize(raw);
    if (wanted.has(name)) return;
    const pkg = lock.packages[name];
    if (!pkg) throw new Error(`package "${raw}" not in pyodide-lock.json`);
    wanted.add(name);
    pkg.depends.forEach(visit);
  };
  PYODIDE_ROOT_PACKAGES.forEach(visit);

  for (const name of [...wanted].sort()) {
    const { file_name, sha256: hash } = lock.packages[name];
    await fetchVerified(
      `${PYODIDE_CDN}/${file_name}`,
      join(dir, file_name),
      hash,
    );
  }
}

async function buildDuckdb() {
  const version = JSON.parse(
    await readFile(join(DUCKDB_DIST, "..", "package.json"), "utf8"),
  ).version;
  console.log(`duckdb-wasm ${version}`);
  const dir = join(WWW, "duckdb");
  await mkdir(dir, { recursive: true });

  for (const name of DUCKDB_COPY) {
    const src = join(DUCKDB_DIST, name);
    const dest = join(dir, name);
    if ((await hashOf(src)) === (await hashOf(dest))) {
      console.log(`  ok       www/duckdb/${name}`);
      continue;
    }
    await copyFile(src, dest);
    console.log(
      `  copied   www/duckdb/${name}  (${(
        (await stat(dest)).size / 1048576
      ).toFixed(1)} MB)`,
    );
  }

  const outfile = join(dir, "duckdb-browser.bundle.mjs");
  execFileSync(
    join(ROOT, "node_modules", ".bin", "esbuild"),
    [
      join(DUCKDB_DIST, "duckdb-browser.mjs"),
      "--bundle",
      "--format=esm",
      `--outfile=${outfile}`,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  console.log(`  bundled  www/duckdb/duckdb-browser.bundle.mjs`);
}

async function copyCatalog() {
  console.log("OpenNGC catalog");
  const dest = join(WWW, "NGC.csv");
  if ((await hashOf(NGC_SRC)) === (await hashOf(dest))) {
    console.log("  ok       www/NGC.csv");
    return;
  }
  await copyFile(NGC_SRC, dest);
  console.log("  copied   www/NGC.csv");
}

try {
  await fetchPyodide();
  await buildDuckdb();
  await copyCatalog();
  console.log("done");
} catch (err) {
  console.error(`\nfetch-vendor failed: ${err.message}`);
  process.exit(1);
}

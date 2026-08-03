// Keep public/zbar.wasm in sync with the installed @undecaf/zbar-wasm package.
// The ZBar WASM decoder loads its .wasm by URL; under Next's bundling the
// package-relative path 404s, so we serve it from /public and point the loader
// at "/zbar.wasm" (see BarcodeScanner). Runs on prebuild so deploys stay current.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/@undecaf/zbar-wasm/dist/zbar.wasm");
const dest = resolve(root, "public/zbar.wasm");

if (!existsSync(src)) {
  console.warn("[copy-wasm] source not found, skipping:", src);
  process.exit(0);
}
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log("[copy-wasm] copied zbar.wasm -> public/zbar.wasm");

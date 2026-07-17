import { build } from "esbuild";
import { rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");

if (existsSync(dist)) await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const shared = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  external: [
    "electron",
    "better-sqlite3",
    "pdfkit",
    "fontkit",
    "brotli",
    "*.node",
  ],
  logLevel: "info",
};

await Promise.all([
  build({
    ...shared,
    entryPoints: [path.join(__dirname, "src/main.ts")],
    outfile: path.join(dist, "main.js"),
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  }),
  build({
    ...shared,
    entryPoints: [path.join(__dirname, "src/preload.ts")],
    outfile: path.join(dist, "preload.js"),
    external: ["electron"],
  }),
]);

console.log("Build complete → dist/");

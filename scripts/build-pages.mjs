// Only copy public runtime files. Never copy local records, tests, or backups.
import { cp, mkdir, access, rm } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export async function buildPages(output = resolve("_site")) {
  const target = resolve(output);
  if (target === source || source.startsWith(target + "/"))
    throw Error("Build output must not contain the source directory.");
  const files = [
    "index.html",
    "manifest.webmanifest",
    "install.js",
    "sw.js",
    "icons/icon-192.png",
    "icons/icon-512.png",
    "styles.css",
    "app.js",
    "components/ui.js",
    "services/storage.js",
    "services/portfolio.js",
    "services/market.js",
    "data/catalog.js",
    "config/app.js",
  ];
  for (const file of files) await access(join(source, file));
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const file of files) {
    await mkdir(dirname(join(target, file)), { recursive: true });
    await cp(join(source, file), join(target, file));
  }
  return target;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await buildPages();
  console.log("PRISM runtime built at _site/ (standalone Pages root).");
}

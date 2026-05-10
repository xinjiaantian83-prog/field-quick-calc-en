import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const webDir = new URL("www/", root);
const copyItems = ["index.html", "css", "js", "icons"];

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const item of copyItems) {
  const src = new URL(item, root);
  if (!existsSync(src)) continue;
  await cp(src, new URL(item, webDir), { recursive: true });
}

console.log("Built Capacitor web assets in www");

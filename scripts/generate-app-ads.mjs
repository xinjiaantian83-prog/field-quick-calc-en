import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=")];
}));
const publisherId = args["publisher-id"];
if (!/^pub-\d{16}$/.test(publisherId || "")) throw new Error("Use --publisher-id=pub- followed by 16 digits");
const output = path.resolve(root, args.output || "app-ads.txt");
fs.writeFileSync(output, `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`);
console.log(`created: ${output}`);

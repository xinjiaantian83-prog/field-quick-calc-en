import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=")];
}));
if (args.help !== undefined) {
  console.log("node scripts/configure-monetization-ids.mjs --ios-app-id=ca-app-pub-...~... --android-app-id=ca-app-pub-...~... --ios-banner-id=ca-app-pub-.../... --android-banner-id=ca-app-pub-.../... [--dry-run]");
  process.exit(0);
}
for (const key of ["ios-app-id", "android-app-id", "ios-banner-id", "android-banner-id"]) {
  if (!args[key]) throw new Error(`Missing --${key}=...`);
}
const appId = /^ca-app-pub-\d{16}~\d{10}$/;
const unitId = /^ca-app-pub-\d{16}\/\d{10}$/;
if (!appId.test(args["ios-app-id"]) || !appId.test(args["android-app-id"])) throw new Error("Invalid AdMob App ID format");
if (!unitId.test(args["ios-banner-id"]) || !unitId.test(args["android-banner-id"])) throw new Error("Invalid banner unit ID format");

const edits = [
  { file: "ios/App/App/Info.plist", replace: [[/(<key>GADApplicationIdentifier<\/key>\s*<string>)[^<]+(<\/string>)/, `$1${args["ios-app-id"]}$2`]] },
  { file: "android/app/src/main/res/values/strings.xml", replace: [[/(<string name="admob_app_id">)[^<]+(<\/string>)/, `$1${args["android-app-id"]}$2`]] },
  { file: "js/monetization-config.js", replace: [
    [/(ios:\s*")[^"]+("\s*,)/, `$1${args["ios-banner-id"]}$2`],
    [/(android:\s*")[^"]+("\s*\n?\s*})/, `$1${args["android-banner-id"]}$2`]
  ] }
];
for (const edit of edits) {
  const target = path.join(root, edit.file);
  let content = fs.readFileSync(target, "utf8");
  for (const [pattern, replacement] of edit.replace) {
    if (!pattern.test(content)) throw new Error(`Expected identifier not found in ${edit.file}`);
    content = content.replace(pattern, replacement);
  }
  if (args["dry-run"] === undefined) fs.writeFileSync(target, content);
  console.log(`${args["dry-run"] === undefined ? "updated" : "checked"}: ${edit.file}`);
}
console.log("monetizationEnabled and testMode were not changed.");

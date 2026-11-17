import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sitemapUrls, submitIndexNow } from "../src/lib/indexnow.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sitemapPath = path.join(root, "public", "sitemap.xml");

let xml = "";
if (fs.existsSync(sitemapPath)) {
  xml = fs.readFileSync(sitemapPath, "utf8");
} else {
  const res = await fetch("https://onlyscrubs.org/sitemap.xml");
  if (!res.ok) {
    console.error("Could not read a sitemap. Run npm run build, then try again.");
    process.exit(1);
  }
  xml = await res.text();
}

const urls = sitemapUrls(xml);
if (!urls.length) {
  console.error("Sitemap has no onlyscrubs.org URLs.");
  process.exit(1);
}

const result = await submitIndexNow(urls);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  console.error("IndexNow did not accept the submission. The key file must already be live at https://onlyscrubs.org/<key>.txt. Deploy first, then run this again.");
  process.exit(1);
}

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const FEED_ID = "https://bakaanime-v5.vercel.app/bakaanime.atom";
const DL_URL = "https://github.com/Rzfan03/Bakaanime-V5/releases/tag/latest";

const entryFor = (ver, notes, date) =>
  `  <entry>
    <title>APK v${ver}</title>
    <link rel="alternate" href="${DL_URL}"/>
    <id>urn:baka:release:${ver}</id>
    <updated>${date || new Date().toISOString()}</updated>
    <summary type="html"><![CDATA[${notes}]]></summary>
  </entry>`;

const docFor = (entry, date) => `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>BakaAnime — Rilis APK</title>
  <id>${FEED_ID}</id>
  <link rel="self" href="${FEED_ID}"/>
  <link rel="alternate" href="${DL_URL}"/>
  <updated>${date || new Date().toISOString()}</updated>
  <author>
    <name>BakaAnime</name>
  </author>
${entry}
</feed>
`;

const [path, ver, notes, date] = process.argv.slice(2);

if (path === "--bootstrap") {
  const runs = JSON.parse(readFileSync(ver, "utf8"));
  runs.sort((a, b) => b.n - a.n);
  const seen = new Set();
  const entries = [];
  for (const r of runs) {
    if (seen.has(r.sha)) continue;
    seen.add(r.sha);
    entries.push(entryFor(`1.0.${r.n}`, r.notes, r.date));
  }
  writeFileSync(notes, docFor(entries.join("\n"), runs[0]?.date));
  console.log(`atom: seeded ${entries.length} entries`);
  process.exit(0);
}

let doc = "";
if (existsSync(path)) doc = readFileSync(path, "utf8");
if (doc.includes(`urn:baka:release:${ver}`)) {
  console.log(`atom: entry ${ver} exists, skip`);
  process.exit(0);
}
const entry = entryFor(ver, notes, date);
if (!doc.includes("xmlns=\"http://www.w3.org/2005/Atom\"")) {
  doc = docFor(entry, date);
} else {
  const firstEntry = doc.indexOf("<entry>");
  doc = doc.slice(0, firstEntry) + entry + "\n" + doc.slice(firstEntry);
  doc = doc.replace(/(<updated>)[^<]*(<\/updated>)/, `$1${date || new Date().toISOString()}$2`);
}
writeFileSync(path, doc);
console.log(`atom: entry ${ver} added`);
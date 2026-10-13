import { randomBytes, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const [label = "", roleArg = ""] = process.argv.slice(2);
// Hanya "dev"/"admin" yang dihormati; selain itu user biasa.
const role = roleArg === "dev" || roleArg === "admin" ? roleArg : "user";
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL kosong. Jalankan lewat npm (lihat package.json).");
  process.exit(1);
}

const key = "baka_" + randomBytes(16).toString("hex");
const hash = createHash("sha256").update(key).digest("hex");

const sql = neon(url);
await sql`
  insert into dev_keys (key_hash, label, role)
  values (${hash}, ${label}, ${role})
`;

console.log("Key dev baru dibuat (simpan sekarang, tidak bisa ditampilkan lagi):\n");
console.log("  " + key + "\n");
console.log(`label: ${label || "(kosong)"}   role: ${role}`);

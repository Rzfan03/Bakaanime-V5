import type { VercelRequest } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { sql } from "./db.js";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export type User = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  banner: string | null;
  bio: string;
  verified: boolean;
  role: string;
  font: string;
  frame: string;
};

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

async function userIdFromToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Key login creates a separate account per key (see dev_keys table).
export async function loginWithKey(key: string): Promise<User> {
  const keys = (await sql`
    select id, label, role from dev_keys
    where key_hash = encode(digest(${key}, 'sha256'), 'hex') and active = true
    limit 1
  `) as { id: string; label: string; role: string }[];

  if (keys[0]) {
    const { id, label, role } = keys[0];
    const rows = (await sql`
      insert into users (google_sub, email, name, verified, role)
      values (${"key:" + id}, ${id + "@key.local"}, ${label || "Developer"}, true, ${role})
      on conflict (google_sub) do update
        set verified = true, role = excluded.role, name = excluded.name
      returning id, email, name, avatar, banner, bio, verified, role, font, frame
    `) as User[];
    return rows[0];
  }

  // Fallback for legacy env key so already-distributed keys keep working.
  const expected = process.env.DEV_ACCESS_KEY ?? "";
  if (!expected || !safeEqual(key, expected)) throw new Error("Key tidak valid.");
  const rows = (await sql`
    insert into users (google_sub, email, name, verified, role)
    values ('dev', 'dev@bakaanime.local', 'Developer', true, 'dev')
    on conflict (google_sub) do update set verified = true, role = 'dev'
    returning id, email, name, avatar, banner, bio, verified, role, font, frame
  `) as User[];
  return rows[0];
}

async function userById(id: string): Promise<User | null> {
  const rows = (await sql`
    select id, email, name, avatar, banner, bio, verified, role, font, frame from users where id = ${id}
  `) as User[];
  return rows[0] ?? null;
}

export async function currentUser(req: VercelRequest): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const uid = await userIdFromToken(header.slice(7));
  return uid ? userById(uid) : null;
}

export async function requireUser(
  req: VercelRequest,
): Promise<{ user: User } | { error: "unauthorized" }> {
  const user = await currentUser(req);
  return user ? { user } : { error: "unauthorized" };
}

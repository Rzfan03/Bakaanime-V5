import type { VercelRequest } from "@vercel/node";
import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { OAuth2Client } from "google-auth-library";
import { sql } from "./db.js";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const google = new OAuth2Client(googleClientId);

export type User = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  banner: string | null;
  bio: string;
  verified: boolean;
  role: string;
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

export async function verifyGoogleCredential(credential: string) {
  const ticket = await google.verifyIdToken({
    idToken: credential,
    audience: googleClientId,
  });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email) throw new Error("Token Google tidak valid.");
  return { sub: p.sub, email: p.email, name: p.name ?? p.email, picture: p.picture };
}

export async function upsertUser(profile: {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<User> {
  const rows = (await sql`
    insert into users (google_sub, email, name, avatar)
    values (${profile.sub}, ${profile.email}, ${profile.name}, ${profile.picture ?? null})
    on conflict (google_sub) do update
      set email = excluded.email,
          name  = excluded.name
    returning id, email, name, avatar, banner, bio, verified, role
  `) as User[];
  return rows[0];
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Login pakai key → akun terpisah per key (lihat tabel dev_keys)
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
      returning id, email, name, avatar, banner, bio, verified, role
    `) as User[];
    return rows[0];
  }

  // fallback: key lama dari env (biar key yang sudah beredar tetap jalan)
  const expected = process.env.DEV_ACCESS_KEY ?? "";
  if (!expected || !safeEqual(key, expected)) throw new Error("Key tidak valid.");
  const rows = (await sql`
    insert into users (google_sub, email, name, verified, role)
    values ('dev', 'dev@bakaanime.local', 'Developer', true, 'dev')
    on conflict (google_sub) do update set verified = true, role = 'dev'
    returning id, email, name, avatar, banner, bio, verified, role
  `) as User[];
  return rows[0];
}

async function userById(id: string): Promise<User | null> {
  const rows = (await sql`
    select id, email, name, avatar, banner, bio, verified, role from users where id = ${id}
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

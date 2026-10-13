-- BakaAnime v5 schema (Neon / Postgres)
-- apply: psql "$DATABASE_URL" -f schema.sql

create extension if not exists pgcrypto;

create table if not exists users (
  id           uuid primary key default gen_random_uuid(),
  google_sub   text unique not null,
  email        text not null,
  name         text not null,
  avatar       text,
  banner       text,
  bio          text not null default '',
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);

-- migration untuk DB yang sudah ada
alter table users add column if not exists verified boolean not null default false;

-- role: user | wibu | admin | dev
alter table users add column if not exists role text not null default 'user';

-- font username kustom (hanya admin/dev yang bisa ubah)
-- nilai: 'default' | 'mono' | 'serif' | 'cursive' | 'pixel' | 'rounded'
alter table users add column if not exists font text not null default 'default';

create table if not exists favorites (
  user_id      uuid not null references users(id) on delete cascade,
  anime_slug   text not null,
  title        text not null,
  poster       text not null,
  position     int  not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, anime_slug)
);

create table if not exists library (
  user_id      uuid not null references users(id) on delete cascade,
  anime_slug   text not null,
  title        text not null,
  poster       text not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, anime_slug)
);

create table if not exists watched (
  user_id      uuid not null references users(id) on delete cascade,
  anime_slug   text not null,
  episode_slug text not null,
  watched_at   timestamptz not null default now(),
  primary key (user_id, anime_slug, episode_slug)
);

create table if not exists comments (
  id           uuid primary key default gen_random_uuid(),
  anime_slug   text not null,
  user_id      uuid not null references users(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now()
);
create index if not exists comments_slug_idx on comments (anime_slug, created_at desc);

-- Key login (per-orang, akun terpisah). Tambah key lewat SQL:
--   insert into dev_keys (key_hash, label, role)
--   values (encode(digest('KEY_BARU', 'sha256'), 'hex'), 'Nama', 'dev');
create table if not exists dev_keys (
  id         uuid primary key default gen_random_uuid(),
  key_hash   text unique not null,
  label      text not null default '',
  role       text not null default 'dev',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

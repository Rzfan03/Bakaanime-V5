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

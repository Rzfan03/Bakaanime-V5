# BakaAnime v5 — Design Brief

## 6. Learned constraints

- **2026-10-13** — Gunakan Material Design 3 **Dark** (`md3-dark`): pakai token M3 yang sudah ada (`--m3-surface`, `--m3-surface-low/container/high`, `--color-m3-*`) dan warna M3 (`#141218` surface, `#d0bcff` primary, `#e6e0e9` on-surface, `#938f99` on-surface-variant, dst.) untuk semua komponen & halaman baru — jangan introduce palette/warna sendiri. *Why:* seluruh komponen dan halaman sudah diimplementasikan dengan M3 Dark UI; update berikut harus konsisten supaya tak terjadi campuran gaya.
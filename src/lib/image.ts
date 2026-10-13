function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

function toJpeg(canvas: HTMLCanvasElement): string {
  // ponytail: small output so the PUT to Neon is fast. Move to object storage
  // (S3/R2) when uploading GIFs / large files becomes necessary.
  return canvas.toDataURL("image/jpeg", 0.8);
}

// fallback for browsers without resize options / formats that can't be bitmap-decoded
async function viaImageElement(file: File, maxSize: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await withTimeout(img.decode(), 15000, "Gambar lama diproses / tidak didukung.");
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) throw new Error("Gagal membaca ukuran gambar.");
    if (w * h > 50_000_000) throw new Error("Gambar terlalu besar.");
    const scale = Math.min(1, maxSize / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak didukung browser ini.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return toJpeg(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function fileToResizedDataUrl(
  file: File,
  maxSize: number,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar.");
  }

  // Decode straight to the target size: aspect ratio kept, low memory, off the
  // main thread. This is what prevents freezing on large photos.
  if (typeof createImageBitmap === "function") {
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await withTimeout(
        createImageBitmap(file, { resizeWidth: maxSize, resizeQuality: "high" }),
        15000,
        "Gambar lama diproses.",
      );
    } catch {
      bitmap = null;
    }
    if (bitmap) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas tidak didukung browser ini.");
        ctx.drawImage(bitmap, 0, 0);
        return toJpeg(canvas);
      } finally {
        bitmap.close();
      }
    }
  }

  return viaImageElement(file, maxSize);
}

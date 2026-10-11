import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const raw = neon(url);

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await run();
    } catch (e) {
      lastErr = e;
      if (i < 2) await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

// ponytail: retry 3x — koneksi Neon kadang timeout sekejap (dual-stack flaky)
export const sql = (strings: TemplateStringsArray, ...values: unknown[]) =>
  withRetry(() => raw(strings, ...values));

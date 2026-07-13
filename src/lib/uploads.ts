import path from "path";
import fs from "fs";

// Stored outside /public so uploaded images live on the same Docker volume as
// the SQLite DB (see Dockerfile's `VOLUME /data`) and survive redeploys —
// anything under /public is baked into the image at build time and lost on
// the next build.
const UPLOADS_DIR = process.env.DROIDBOT_UPLOADS_PATH ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");

export function getUploadsDir(): string {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  return UPLOADS_DIR;
}

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

// Filenames we generate ourselves (crypto.randomUUID + a fixed extension from
// ALLOWED_IMAGE_TYPES), so this only needs to guard the read path against a
// malformed/forged request, not attacker-chosen input.
const SAFE_FILENAME = /^[a-f0-9-]{10,60}\.(jpg|png|webp|gif)$/;

export function isSafeUploadFilename(name: string): boolean {
  return SAFE_FILENAME.test(name);
}

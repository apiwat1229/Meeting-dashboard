import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

export const imageMimeByExtension = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
} as const;

export type ImageExtension = keyof typeof imageMimeByExtension;

const storedImagePattern = /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i;

export function getUploadDirectory() {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

export function isStoredImageName(filename: string): filename is string {
  return storedImagePattern.test(filename);
}

export function getImageExtension(mimeType: string): ImageExtension | null {
  switch (mimeType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    default: return null;
  }
}

export function imagePath(filename: string) {
  if (!isStoredImageName(filename)) throw new Error("Invalid image filename.");
  return join(getUploadDirectory(), filename);
}

export async function ensureUploadDirectory() {
  await mkdir(getUploadDirectory(), { recursive: true });
}

export async function deleteStoredImage(imageUrl: string) {
  const prefix = "/api/images/";
  const filename = imageUrl.startsWith(prefix) ? imageUrl.slice(prefix.length) : "";
  if (!isStoredImageName(filename)) return;

  try {
    await unlink(imagePath(filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function hasValidImageSignature(bytes: Uint8Array, extension: ImageExtension) {
  if (extension === "jpg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (extension === "gif") {
    const header = String.fromCharCode(...bytes.subarray(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  return bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
}

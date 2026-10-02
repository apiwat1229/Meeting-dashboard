import { mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

export const mediaMimeByExtension = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
} as const;

export type MediaExtension = keyof typeof mediaMimeByExtension;
export type ImageExtension = Extract<MediaExtension, "jpg" | "png" | "webp" | "gif">;
export type VideoExtension = Extract<MediaExtension, "mp4" | "webm">;

const storedMediaPattern = /^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm)$/i;

export function getUploadDirectory() {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

export function isStoredMediaName(filename: string): filename is string {
  return storedMediaPattern.test(filename);
}

export function getMediaExtension(mimeType: string): MediaExtension | null {
  switch (mimeType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "video/mp4": return "mp4";
    case "video/webm": return "webm";
    default: return null;
  }
}

export function isVideoExtension(extension: string): extension is VideoExtension {
  return extension === "mp4" || extension === "webm";
}

export function mediaPath(filename: string) {
  if (!isStoredMediaName(filename)) throw new Error("Invalid media filename.");
  return join(getUploadDirectory(), filename);
}

export async function ensureUploadDirectory() {
  await mkdir(getUploadDirectory(), { recursive: true });
}

export async function deleteStoredMedia(imageUrl: string) {
  const prefix = "/api/images/";
  const filename = imageUrl.startsWith(prefix) ? imageUrl.slice(prefix.length) : "";
  if (!isStoredMediaName(filename)) return;

  try {
    await unlink(mediaPath(filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function hasValidMediaSignature(bytes: Uint8Array, extension: MediaExtension) {
  if (extension === "jpg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === "png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (extension === "gif") {
    const header = String.fromCharCode(...bytes.subarray(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  if (extension === "webp") return bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  if (extension === "mp4") return bytes.length >= 12 && String.fromCharCode(...bytes.subarray(4, 8)) === "ftyp";
  return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

// Keep the old helper names available for any integrations that still refer to image-only uploads.
export const imageMimeByExtension = mediaMimeByExtension;
export const isStoredImageName = isStoredMediaName;
export const getImageExtension = getMediaExtension;
export const imagePath = mediaPath;
export const deleteStoredImage = deleteStoredMedia;
export const hasValidImageSignature = hasValidMediaSignature;

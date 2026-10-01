import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activities, issues } from "@/db/schema";
import { deleteStoredImage, ensureUploadDirectory, getImageExtension, hasValidImageSignature, imagePath } from "@/lib/image-uploads";

export const runtime = "nodejs";

const maxImageSize = 5 * 1024 * 1024;

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxImageSize + 64 * 1024) {
    return badRequest("Choose an image smaller than 5 MB.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("The image upload request is not valid.");
  }

  const entityType = formData.get("entityType");
  const entityIdValue = formData.get("entityId");
  const entityId = typeof entityIdValue === "string" ? Number(entityIdValue) : NaN;
  const remove = formData.get("remove") === "true";
  if ((entityType !== "issue" && entityType !== "activity") || !Number.isSafeInteger(entityId) || entityId < 1) {
    return badRequest("Choose a valid issue or activity.");
  }

  let previousImageUrl = "";
  if (entityType === "issue") {
    const [record] = await db.select({ imageUrl: issues.imageUrl }).from(issues).where(eq(issues.id, entityId)).limit(1);
    if (!record) return badRequest("The issue could not be found.", 404);
    previousImageUrl = record.imageUrl;
  } else {
    const [record] = await db.select({ imageUrl: activities.imageUrl }).from(activities).where(eq(activities.id, entityId)).limit(1);
    if (!record) return badRequest("The activity could not be found.", 404);
    previousImageUrl = record.imageUrl;
  }

  if (remove) {
    if (entityType === "issue") {
      await db.update(issues).set({ imageUrl: "", updatedAt: new Date() }).where(eq(issues.id, entityId));
    } else {
      await db.update(activities).set({ imageUrl: "" }).where(eq(activities.id, entityId));
    }
    await deleteStoredImage(previousImageUrl).catch(() => undefined);
    return NextResponse.json({ ok: true, imageUrl: "" });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return badRequest("Choose an image to upload.");
  if (file.size < 1) return badRequest("The selected image is empty.");
  if (file.size > maxImageSize) return badRequest("Choose an image smaller than 5 MB.", 413);
  const extension = getImageExtension(file.type);
  if (!extension) return badRequest("Use a JPG, PNG, WebP, or GIF image.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidImageSignature(bytes, extension)) return badRequest("The selected file is not a valid image.");

  const filename = `${randomUUID()}.${extension}`;
  const imageUrl = `/api/images/${filename}`;
  try {
    await ensureUploadDirectory();
    await writeFile(imagePath(filename), bytes, { flag: "wx" });
    let updated = false;
    if (entityType === "issue") {
      const rows = await db.update(issues)
        .set({ imageUrl, updatedAt: new Date() })
        .where(eq(issues.id, entityId))
        .returning({ id: issues.id });
      updated = rows.length > 0;
    } else {
      const rows = await db.update(activities)
        .set({ imageUrl })
        .where(eq(activities.id, entityId))
        .returning({ id: activities.id });
      updated = rows.length > 0;
    }
    if (!updated) {
      await deleteStoredImage(imageUrl);
      return badRequest("The item could not be found.", 404);
    }
  } catch {
    await deleteStoredImage(imageUrl).catch(() => undefined);
    return badRequest("Could not save the image.", 500);
  }

  if (previousImageUrl !== imageUrl) await deleteStoredImage(previousImageUrl).catch(() => undefined);
  return NextResponse.json({ ok: true, imageUrl });
}

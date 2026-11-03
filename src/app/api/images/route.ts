import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activities, dashboardSettings, issues, mediaAttachments, networkServiceStatuses } from "@/db/schema";
import { ensureUploadDirectory, getMediaExtension, hasValidMediaSignature, isVideoExtension, mediaPath } from "@/lib/image-uploads";
import { hasDashboardSession } from "@/lib/dashboard-auth";
import { dashboardSettingsId, deleteMediaIfUnreferenced, getRequestedDashboardContext, isValidReportDate } from "@/lib/daily-reports";

export const runtime = "nodejs";

const maxImageSize = 5 * 1024 * 1024;
const maxVideoSize = 100 * 1024 * 1024;

function badRequest(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function parseOwner(formData: FormData, departmentId: number) {
  const entityType = formData.get("entityType");
  const entityIdValue = formData.get("entityId");
  const reportDate = formData.get("reportDate");
  if (!isValidReportDate(reportDate)) return null;
  if (entityType === "cctv") {
    return entityIdValue === reportDate
      ? { entityType, entityId: dashboardSettingsId(departmentId, reportDate), reportDate, departmentId } as const
      : null;
  }
  const entityId = typeof entityIdValue === "string" ? Number(entityIdValue) : NaN;
  if ((entityType !== "issue" && entityType !== "activity" && entityType !== "networkService") || !Number.isSafeInteger(entityId) || entityId < 1) return null;
  return { entityType, entityId, reportDate, departmentId } as const;
}

async function ownerExists(owner: NonNullable<ReturnType<typeof parseOwner>>) {
  if (owner.entityType === "issue") {
    const [row] = await db.select({ id: issues.id }).from(issues).where(and(eq(issues.id, owner.entityId), eq(issues.reportDate, owner.reportDate), eq(issues.departmentId, owner.departmentId))).limit(1);
    return Boolean(row);
  }
  if (owner.entityType === "networkService") {
    const [row] = await db.select({ id: networkServiceStatuses.id }).from(networkServiceStatuses).where(and(eq(networkServiceStatuses.id, owner.entityId), eq(networkServiceStatuses.reportDate, owner.reportDate), eq(networkServiceStatuses.departmentId, owner.departmentId))).limit(1);
    return Boolean(row);
  }
  if (owner.entityType === "cctv") {
    const [row] = await db.select({ id: dashboardSettings.id }).from(dashboardSettings).where(and(eq(dashboardSettings.id, owner.entityId), eq(dashboardSettings.reportDate, owner.reportDate), eq(dashboardSettings.departmentId, owner.departmentId))).limit(1);
    return Boolean(row);
  }
  const [row] = await db.select({ id: activities.id }).from(activities).where(and(eq(activities.id, owner.entityId), eq(activities.reportDate, owner.reportDate), eq(activities.departmentId, owner.departmentId))).limit(1);
  return Boolean(row);
}

export async function POST(request: Request) {
  if (!(await hasDashboardSession())) return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  let context: Awaited<ReturnType<typeof getRequestedDashboardContext>>;
  try {
    context = await getRequestedDashboardContext();
  } catch {
    return NextResponse.json({ message: "Could not verify department access." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxVideoSize + 64 * 1024) {
    return badRequest("Choose a video smaller than 100 MB.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("The media upload request is not valid.");
  }

  const owner = parseOwner(formData, context.departmentId);
  if (!owner) return badRequest("Choose a valid media owner.");
  if (!(await ownerExists(owner))) return badRequest("The media owner could not be found in this department.", 404);

  const requestedPhase = formData.get("activityPhase");
  if (requestedPhase !== null && (typeof requestedPhase !== "string" || !["GENERAL", "BEFORE", "AFTER"].includes(requestedPhase))) {
    return badRequest("Choose a valid activity photo phase.");
  }
  const activityPhase = (requestedPhase ?? "GENERAL") as "GENERAL" | "BEFORE" | "AFTER";
  if (owner.entityType !== "activity" && activityPhase !== "GENERAL") {
    return badRequest("Before and after photos can only be attached to activities.");
  }
  if (owner.entityType === "activity" && activityPhase !== "GENERAL") {
    const [activity] = await db.select({
      beforeEnabled: activities.beforeEnabled,
      beforeReason: activities.beforeReason,
      afterEnabled: activities.afterEnabled,
      afterReason: activities.afterReason,
    }).from(activities).where(and(
      eq(activities.id, owner.entityId),
      eq(activities.reportDate, owner.reportDate),
      eq(activities.departmentId, owner.departmentId),
    )).limit(1);
    const enabled = activityPhase === "BEFORE" ? activity?.beforeEnabled : activity?.afterEnabled;
    const reason = activityPhase === "BEFORE" ? activity?.beforeReason : activity?.afterReason;
    if (!enabled || !reason?.trim()) {
      return badRequest(`Enable ${activityPhase.toLowerCase()} photos and save a reason before uploading.`);
    }
  }

  const attachmentIdValue = formData.get("attachmentId");
  if (formData.get("remove") === "true" && typeof attachmentIdValue === "string") {
    const attachmentId = Number(attachmentIdValue);
    if (!Number.isSafeInteger(attachmentId) || attachmentId < 1) return badRequest("Choose a valid media attachment.");
    const conditions = (() => {
      switch (owner.entityType) {
        case "issue": return and(eq(mediaAttachments.id, attachmentId), eq(mediaAttachments.issueId, owner.entityId));
        case "activity": return and(eq(mediaAttachments.id, attachmentId), eq(mediaAttachments.activityId, owner.entityId));
        case "networkService": return and(eq(mediaAttachments.id, attachmentId), eq(mediaAttachments.networkServiceId, owner.entityId));
        case "cctv": return and(eq(mediaAttachments.id, attachmentId), eq(mediaAttachments.dashboardSettingsId, owner.entityId));
      }
    })();
    const [attachment] = await db.delete(mediaAttachments).where(conditions).returning({ url: mediaAttachments.url });
    if (!attachment) return badRequest("The media attachment could not be found.", 404);
    await deleteMediaIfUnreferenced(attachment.url);
    return NextResponse.json({ ok: true, attachmentId });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return badRequest("Choose an image or video to upload.");
  if (file.size < 1) return badRequest("The selected file is empty.");
  const extension = getMediaExtension(file.type);
  if (!extension) return badRequest("Use a JPG, PNG, WebP, or GIF image, or an MP4 or WebM video.");
  const isVideo = isVideoExtension(extension);
  if (formData.get("imagesOnly") === "true" && isVideo) return badRequest("Meeting case attachments must be images.");
  if (activityPhase !== "GENERAL" && isVideo) return badRequest("Before and after attachments must be images.");
  const maxFileSize = isVideo ? maxVideoSize : maxImageSize;
  if (file.size > maxFileSize) {
    return badRequest(isVideo ? "Choose a video smaller than 100 MB." : "Choose an image smaller than 5 MB.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidMediaSignature(bytes, extension)) return badRequest("The selected file does not match its media type.");

  const filename = `${randomUUID()}.${extension}`;
  const url = `/api/images/${filename}`;
  try {
    await ensureUploadDirectory();
    await writeFile(mediaPath(filename), bytes, { flag: "wx" });
    const [attachment] = await db.insert(mediaAttachments).values({
      issueId: owner.entityType === "issue" ? owner.entityId : null,
      activityId: owner.entityType === "activity" ? owner.entityId : null,
      networkServiceId: owner.entityType === "networkService" ? owner.entityId : null,
      dashboardSettingsId: owner.entityType === "cctv" ? owner.entityId : null,
      activityPhase,
      url,
    }).returning({ id: mediaAttachments.id, url: mediaAttachments.url });
    if (!attachment) throw new Error("Could not create the media attachment.");
    return NextResponse.json({ ok: true, attachment });
  } catch {
    await deleteMediaIfUnreferenced(url);
    return badRequest("Could not save the media file.", 500);
  }
}

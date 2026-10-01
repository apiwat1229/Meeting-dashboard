"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, issues, projects, themeSettings } from "@/db/schema";
import { themeConfigSchema } from "@/lib/theme-schema";

const projectStatusSchema = z.enum(["ON_TRACK", "ATTENTION", "DELAY"]);
const issueSeveritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
const activitySectionSchema = z.enum(["YESTERDAY", "TODAY", "OTHER"]);

export async function saveThemeAction(
  _previousState: { ok: boolean; message: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const rawConfig = formData.get("theme");
  if (typeof rawConfig !== "string") {
    return { ok: false, message: "ไม่พบค่าธีมที่ต้องการบันทึก" };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(rawConfig);
  } catch {
    return { ok: false, message: "รูปแบบข้อมูลธีมไม่ถูกต้อง" };
  }

  const parsed = themeConfigSchema.safeParse(decoded);
  if (!parsed.success) {
    return { ok: false, message: "ค่าธีมบางรายการไม่ถูกต้อง ตรวจสอบช่วงตัวเลขและสีอีกครั้ง" };
  }

  await db
    .insert(themeSettings)
    .values({ id: "default", config: parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: themeSettings.id,
      set: { config: parsed.data, updatedAt: new Date() },
    });

  revalidatePath("/", "layout");
  return { ok: true, message: "บันทึก Theme กลางแล้ว ทุกหน้าจะใช้ค่าชุดใหม่นี้" };
}

export async function createProjectAction(formData: FormData) {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(140),
      status: projectStatusSchema,
      yesterday: z.string().trim().max(500),
      today: z.string().trim().max(500),
      progress: z.coerce.number().int().min(0).max(100),
    })
    .safeParse({
      name: formData.get("name"),
      status: formData.get("status"),
      yesterday: formData.get("yesterday") ?? "",
      today: formData.get("today") ?? "",
      progress: formData.get("progress"),
    });

  if (!parsed.success) return;

  await db.insert(projects).values({
    ...parsed.data,
    sortOrder: Math.floor(Date.now() / 1000),
  });
  revalidatePath("/");
}

export async function updateProjectAction(formData: FormData) {
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      status: projectStatusSchema,
      progress: z.coerce.number().int().min(0).max(100),
      yesterday: z.string().trim().max(500),
      today: z.string().trim().max(500),
    })
    .safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
      progress: formData.get("progress"),
      yesterday: formData.get("yesterday") ?? "",
      today: formData.get("today") ?? "",
    });

  if (!parsed.success) return;
  const { id, ...values } = parsed.data;
  await db.update(projects).set({ ...values, updatedAt: new Date() }).where(eq(projects.id, id));
  revalidatePath("/");
}

export async function createIssueAction(formData: FormData) {
  const projectValue = formData.get("projectId");
  const parsed = z
    .object({
      projectId: z.number().int().positive().nullable(),
      title: z.string().trim().min(3).max(180),
      severity: issueSeveritySchema,
      detail: z.string().trim().max(1000),
      nextStep: z.string().trim().max(500),
    })
    .safeParse({
      projectId: projectValue ? Number(projectValue) : null,
      title: formData.get("title"),
      severity: formData.get("severity"),
      detail: formData.get("detail") ?? "",
      nextStep: formData.get("nextStep") ?? "",
    });

  if (!parsed.success) return;
  await db.insert(issues).values({ ...parsed.data, sortOrder: Math.floor(Date.now() / 1000) });
  revalidatePath("/");
}

export async function toggleIssueStateAction(formData: FormData) {
  const parsed = z
    .object({ id: z.coerce.number().int().positive(), nextState: z.enum(["OPEN", "CLOSED"]) })
    .safeParse({ id: formData.get("id"), nextState: formData.get("nextState") });

  if (!parsed.success) return;
  await db
    .update(issues)
    .set({ state: parsed.data.nextState, updatedAt: new Date() })
    .where(eq(issues.id, parsed.data.id));
  revalidatePath("/");
}

export async function createActivityAction(formData: FormData) {
  const parsed = z
    .object({
      section: activitySectionSchema,
      content: z.string().trim().min(2).max(220),
    })
    .safeParse({ section: formData.get("section"), content: formData.get("content") });

  if (!parsed.success) return;
  await db.insert(activities).values({ ...parsed.data, sortOrder: Math.floor(Date.now() / 1000) });
  revalidatePath("/");
}

export async function toggleActivityAction(formData: FormData) {
  const parsed = z
    .object({ id: z.coerce.number().int().positive(), completed: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), completed: formData.get("completed") });

  if (!parsed.success) return;
  await db
    .update(activities)
    .set({ completed: parsed.data.completed === "true" })
    .where(eq(activities.id, parsed.data.id));
  revalidatePath("/");
}

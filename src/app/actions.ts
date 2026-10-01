"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, issues, projectTasks, projects, themeSettings } from "@/db/schema";
import { themeConfigSchema } from "@/lib/theme-schema";
import { getBangkokDateKey, shiftDateKey } from "@/lib/date-key";

const projectStatusSchema = z.enum(["ON_TRACK", "DELAY", "FINISH"]);
const projectTaskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const issueSeveritySchema = z.enum(["HIGH", "MEDIUM"]);
const activitySectionSchema = z.enum(["YESTERDAY", "TODAY", "OTHER"]);

type MutationResult = { ok: boolean; message: string };

async function runMutation(
  successMessage: string,
  errorMessage: string,
  mutation: () => Promise<unknown>,
): Promise<MutationResult> {
  try {
    await mutation();
    revalidatePath("/");
    return { ok: true, message: successMessage };
  } catch {
    return { ok: false, message: errorMessage };
  }
}

const invalidFormResult: MutationResult = {
  ok: false,
  message: "Please review the required fields and try again.",
};

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

export async function createProjectAction(formData: FormData): Promise<MutationResult> {
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

  if (!parsed.success) return invalidFormResult;

  return runMutation("Project added.", "Could not add the project.", () => db.insert(projects).values({
    ...parsed.data,
    sortOrder: Math.floor(Date.now() / 1000),
  }));
}

export async function updateProjectAction(formData: FormData): Promise<MutationResult> {
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      name: z.string().trim().min(2).max(140),
      status: projectStatusSchema,
      progress: z.coerce.number().int().min(0).max(100),
      yesterday: z.string().trim().max(500),
      today: z.string().trim().max(500),
    })
    .safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      status: formData.get("status"),
      progress: formData.get("progress"),
      yesterday: formData.get("yesterday") ?? "",
      today: formData.get("today") ?? "",
    });

  if (!parsed.success) return invalidFormResult;
  const { id, ...values } = parsed.data;
  return runMutation("Project updated.", "Could not update the project.", () =>
    db.update(projects).set({ ...values, updatedAt: new Date() }).where(eq(projects.id, id)),
  );
}

export async function deleteProjectAction(formData: FormData): Promise<MutationResult> {
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse({ id: formData.get("id") });

  if (!parsed.success) return invalidFormResult;
  return runMutation("Project deleted.", "Could not delete the project.", () =>
    db.delete(projects).where(eq(projects.id, parsed.data.id)),
  );
}

export async function createProjectTaskAction(formData: FormData): Promise<MutationResult> {
  const parsed = z
    .object({
      projectId: z.coerce.number().int().positive(),
      title: z.string().trim().min(2).max(220),
      status: projectTaskStatusSchema,
    })
    .safeParse({
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      status: formData.get("status"),
    });

  if (!parsed.success) return invalidFormResult;
  return runMutation("Subtask added.", "Could not add the subtask.", () =>
    db.insert(projectTasks).values({ ...parsed.data, sortOrder: Math.floor(Date.now() / 1000) }),
  );
}

export async function updateProjectTaskAction(formData: FormData): Promise<MutationResult> {
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      projectId: z.coerce.number().int().positive(),
      title: z.string().trim().min(2).max(220),
      status: projectTaskStatusSchema,
    })
    .safeParse({
      id: formData.get("id"),
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      status: formData.get("status"),
    });

  if (!parsed.success) return invalidFormResult;
  const { id, projectId, ...values } = parsed.data;
  return runMutation("Subtask updated.", "Could not update the subtask.", () =>
    db.update(projectTasks)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(projectTasks.id, id), eq(projectTasks.projectId, projectId))),
  );
}

export async function deleteProjectTaskAction(formData: FormData): Promise<MutationResult> {
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      projectId: z.coerce.number().int().positive(),
    })
    .safeParse({ id: formData.get("id"), projectId: formData.get("projectId") });

  if (!parsed.success) return invalidFormResult;
  return runMutation("Subtask deleted.", "Could not delete the subtask.", () =>
    db.delete(projectTasks).where(and(eq(projectTasks.id, parsed.data.id), eq(projectTasks.projectId, parsed.data.projectId))),
  );
}

export async function createIssueAction(formData: FormData): Promise<MutationResult> {
  const projectValue = formData.get("projectId");
  const parsed = z
    .object({
      projectId: z.number().int().positive().nullable(),
      title: z.string().trim().min(3).max(180),
      severity: issueSeveritySchema,
      detail: z.string().trim().max(1000),
      nextStep: z.string().trim().max(500),
      prevention: z.string().trim().max(1000),
    })
    .safeParse({
      projectId: projectValue && projectValue !== "none" ? Number(projectValue) : null,
      title: formData.get("title"),
      severity: formData.get("severity"),
      detail: formData.get("detail") ?? "",
      nextStep: formData.get("nextStep") ?? "",
      prevention: formData.get("prevention") ?? "",
    });

  if (!parsed.success) return invalidFormResult;
  return runMutation("Issue added.", "Could not add the issue.", () =>
    db.insert(issues).values({ ...parsed.data, sortOrder: Math.floor(Date.now() / 1000) }),
  );
}

export async function updateIssueAction(formData: FormData): Promise<MutationResult> {
  const projectValue = formData.get("projectId");
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      projectId: z.number().int().positive().nullable(),
      title: z.string().trim().min(3).max(180),
      severity: issueSeveritySchema,
      state: z.enum(["OPEN", "CLOSED"]),
      detail: z.string().trim().max(1000),
      nextStep: z.string().trim().max(500),
      prevention: z.string().trim().max(1000),
    })
    .safeParse({
      id: formData.get("id"),
      projectId: projectValue && projectValue !== "none" ? Number(projectValue) : null,
      title: formData.get("title"),
      severity: formData.get("severity"),
      state: formData.get("state"),
      detail: formData.get("detail") ?? "",
      nextStep: formData.get("nextStep") ?? "",
      prevention: formData.get("prevention") ?? "",
    });

  if (!parsed.success) return invalidFormResult;
  const { id, ...values } = parsed.data;
  return runMutation("Issue updated.", "Could not update the issue.", () =>
    db.update(issues).set({ ...values, updatedAt: new Date() }).where(eq(issues.id, id)),
  );
}

export async function deleteIssueAction(formData: FormData): Promise<MutationResult> {
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse({ id: formData.get("id") });

  if (!parsed.success) return invalidFormResult;
  return runMutation("Issue deleted.", "Could not delete the issue.", () =>
    db.delete(issues).where(eq(issues.id, parsed.data.id)),
  );
}

export async function createActivityAction(formData: FormData): Promise<MutationResult> {
  const parsed = z
    .object({
      section: activitySectionSchema,
      content: z.string().trim().min(2).max(220),
    })
    .safeParse({ section: formData.get("section"), content: formData.get("content") });

  if (!parsed.success) return invalidFormResult;
  const today = getBangkokDateKey();
  return runMutation("Activity added.", "Could not add the activity.", () =>
    db.insert(activities).values({
      ...parsed.data,
      activityDate: parsed.data.section === "YESTERDAY" ? shiftDateKey(today, -1) : today,
      sortOrder: Math.floor(Date.now() / 1000),
    }),
  );
}

export async function updateActivityAction(formData: FormData): Promise<MutationResult> {
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      section: activitySectionSchema,
      content: z.string().trim().min(2).max(220),
      completed: z.enum(["true", "false"]),
    })
    .safeParse({
      id: formData.get("id"),
      section: formData.get("section"),
      content: formData.get("content"),
      completed: formData.get("completed"),
    });

  if (!parsed.success) return invalidFormResult;
  const { id, completed, ...values } = parsed.data;
  const today = getBangkokDateKey();
  return runMutation("Activity updated.", "Could not update the activity.", () =>
    db.update(activities)
      .set({
        ...values,
        completed: completed === "true",
        activityDate: values.section === "YESTERDAY" ? shiftDateKey(today, -1) : today,
      })
      .where(eq(activities.id, id)),
  );
}

export async function deleteActivityAction(formData: FormData): Promise<MutationResult> {
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse({ id: formData.get("id") });

  if (!parsed.success) return invalidFormResult;
  return runMutation("Activity deleted.", "Could not delete the activity.", () =>
    db.delete(activities).where(eq(activities.id, parsed.data.id)),
  );
}

export async function toggleActivityAction(formData: FormData): Promise<MutationResult> {
  const parsed = z
    .object({ id: z.coerce.number().int().positive(), completed: z.enum(["true", "false"]) })
    .safeParse({ id: formData.get("id"), completed: formData.get("completed") });

  if (!parsed.success) return invalidFormResult;
  const completed = parsed.data.completed === "true";
  const [activity] = await db.select().from(activities).where(eq(activities.id, parsed.data.id)).limit(1);
  if (!activity) return { ok: false, message: "Could not find the activity." };

  const nextSection = !completed && activity.section === "YESTERDAY" ? "TODAY" : activity.section;
  return runMutation(
    completed ? "Activity marked done." : "Activity marked in progress.",
    "Could not update the activity status.",
    () => db.update(activities)
      .set({
        completed,
        ...(!completed ? { section: nextSection, activityDate: getBangkokDateKey() } : {}),
      })
      .where(eq(activities.id, parsed.data.id)),
  );
}

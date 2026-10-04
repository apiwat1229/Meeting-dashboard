"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedSession } from "@/lib/dashboard-auth";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activities, dashboardSettings, issues, mediaAttachments, networkServiceStatuses, projectChangeHistory, projectTasks, projects, themeSettings } from "@/db/schema";
import { themeConfigSchema } from "@/lib/theme-schema";
import { getBangkokDateKey, shiftDateKey } from "@/lib/date-key";
import { deleteStoredMedia } from "@/lib/image-uploads";
import { systemNetworkServiceKeys } from "@/lib/system-status";

const projectStatusSchema = z.enum(["ON_TRACK", "DELAY", "FINISH"]);
const projectTaskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);
const issueSeveritySchema = z.enum(["HIGH", "MEDIUM"]);
const activitySeveritySchema = z.enum(["HIGH", "MEDIUM"]);
const activitySectionSchema = z.enum(["YESTERDAY", "TODAY"]);
const networkServiceKeyValues = systemNetworkServiceKeys;
const networkServiceKeySchema = z.enum(networkServiceKeyValues);
const networkServiceUpdateSchema = z.object({
  key: networkServiceKeySchema,
  status: z.enum(["UNKNOWN", "NORMAL", "ABNORMAL"]),
  reason: z.string().trim().max(240),
  detail: z.string().trim().max(2000),
}).superRefine((service, context) => {
  if (service.status === "ABNORMAL") {
    if (!service.reason) context.addIssue({ code: "custom", path: ["reason"], message: "Enter a reason for the abnormal status." });
    if (!service.detail) context.addIssue({ code: "custom", path: ["detail"], message: "Enter details for the abnormal status." });
  }
});
const projectDateSchema = z.string().trim().refine((value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Enter a valid date.").transform((value) => value || null);

type MutationResult = { ok: boolean; message: string };

type ProjectTrackedField = "name" | "status" | "progress" | "yesterday" | "today" | "startDate" | "endDate";
type ProjectChangeValues = Partial<Pick<typeof projects.$inferInsert, ProjectTrackedField>>;

async function updateProjectWithHistory(id: number, values: ProjectChangeValues) {
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(projects).where(eq(projects.id, id)).for("update").limit(1);
    if (!current) throw new Error("Project not found.");

    const currentValues: Record<ProjectTrackedField, string | number | null> = {
      name: current.name,
      status: current.status,
      progress: current.progress,
      yesterday: current.yesterday,
      today: current.today,
      startDate: current.startDate,
      endDate: current.endDate,
    };
    const nextValues = values as Partial<Record<ProjectTrackedField, string | number | null>>;
    const newlySetDates = (Object.keys(values) as ProjectTrackedField[]).filter((field) =>
      (field === "startDate" || field === "endDate") && currentValues[field] === null && nextValues[field] != null,
    );
    const previouslyChangedDateFields = new Set<string>();
    if (newlySetDates.length > 0) {
      const priorDateChanges = await tx.select({ field: projectChangeHistory.field, oldValue: projectChangeHistory.oldValue })
        .from(projectChangeHistory)
        .where(eq(projectChangeHistory.projectId, id));
      for (const change of priorDateChanges) {
        if ((change.field === "startDate" || change.field === "endDate") && change.oldValue !== null) {
          previouslyChangedDateFields.add(change.field);
        }
      }
    }
    const changes = (Object.keys(values) as ProjectTrackedField[])
      .filter((field) => {
        if (currentValues[field] === nextValues[field]) return false;
        const isScheduleDate = field === "startDate" || field === "endDate";
        // Setting an unset date for the first time is initialization, not a change.
        return !(
          isScheduleDate && currentValues[field] === null &&
          !previouslyChangedDateFields.has(field)
        );
      })
      .map((field) => ({
        projectId: id,
        field,
        oldValue: currentValues[field] === null ? null : String(currentValues[field]),
        newValue: nextValues[field] == null ? null : String(nextValues[field]),
      }));

    await tx.update(projects).set({ ...values, updatedAt: new Date() }).where(eq(projects.id, id));
    if (changes.length > 0) await tx.insert(projectChangeHistory).values(changes);
  });
}

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

export async function saveDashboardFocusAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const parsed = z.object({
    focusTitle: z.string().trim().min(1).max(140),
    focusDetail: z.string().trim().max(500),
    activityId: z.string().trim().transform((value) => value === "" ? null : Number(value))
      .pipe(z.number().int().positive().nullable()),
  }).safeParse({
    focusTitle: formData.get("focusTitle"),
    focusDetail: formData.get("focusDetail") ?? "",
    activityId: formData.get("activityId") ?? "",
  });

  if (!parsed.success) return invalidFormResult;
  const { focusTitle, focusDetail, activityId } = parsed.data;
  if (activityId !== null) {
    const [activity] = await db.select({ id: activities.id }).from(activities).where(eq(activities.id, activityId)).limit(1);
    if (!activity) return { ok: false, message: "That activity is no longer available." };
  }

  return runMutation("Today’s Focus saved.", "Could not save Today’s Focus.", () => db
    .insert(dashboardSettings)
    .values({
      id: "default",
      purpose: "",
      focusTitle,
      focusDetail,
      focusActivityId: activityId,
      meetingFlow: "",
      footnote: "",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dashboardSettings.id,
      set: { focusTitle, focusDetail, focusActivityId: activityId, updatedAt: new Date() },
    }));
}

export async function clearDashboardFocusAction(): Promise<MutationResult> {
  await requireAuthenticatedSession();
  return runMutation("Today’s Focus cleared.", "Could not clear Today’s Focus.", () => db
    .insert(dashboardSettings)
    .values({
      id: "default",
      purpose: "",
      focusTitle: "",
      focusDetail: "",
      focusActivityId: null,
      meetingFlow: "",
      footnote: "",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dashboardSettings.id,
      set: { focusTitle: "", focusDetail: "", focusActivityId: null, updatedAt: new Date() },
    }));
}

export async function saveDashboardFocusProjectsAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const rawProjectIds = formData.get("projectIds");
  const rawTaskIds = formData.get("taskIds");
  if (typeof rawProjectIds !== "string" || typeof rawTaskIds !== "string") return invalidFormResult;

  let decodedProjectIds: unknown;
  let decodedTaskIds: unknown;
  try {
    decodedProjectIds = JSON.parse(rawProjectIds);
    decodedTaskIds = JSON.parse(rawTaskIds);
  } catch {
    return invalidFormResult;
  }

  const parsedProjectIds = z.array(z.number().int().positive()).max(100).safeParse(decodedProjectIds);
  const parsedTaskIds = z.array(z.number().int().positive()).max(500).safeParse(decodedTaskIds);
  if (!parsedProjectIds.success || !parsedTaskIds.success) return invalidFormResult;
  if (new Set(parsedProjectIds.data).size !== parsedProjectIds.data.length) return invalidFormResult;
  if (new Set(parsedTaskIds.data).size !== parsedTaskIds.data.length) return invalidFormResult;
  const projectIds = parsedProjectIds.data;
  const taskIds = parsedTaskIds.data;

  if (projectIds.length > 0) {
    const matchingProjects = await db.select({ id: projects.id }).from(projects).where(inArray(projects.id, projectIds));
    if (matchingProjects.length !== projectIds.length) {
      return { ok: false, message: "One or more selected projects are no longer available." };
    }
  }

  if (taskIds.length > 0) {
    if (projectIds.length === 0) return invalidFormResult;
    const matchingTasks = await db.select({ id: projectTasks.id, projectId: projectTasks.projectId })
      .from(projectTasks)
      .where(inArray(projectTasks.id, taskIds));
    if (matchingTasks.length !== taskIds.length || matchingTasks.some((task) => !projectIds.includes(task.projectId))) {
      return { ok: false, message: "Choose subtasks from the selected projects." };
    }
  }

  return runMutation("Today’s Focus projects saved.", "Could not save Today’s Focus projects.", () => db
    .insert(dashboardSettings)
    .values({
      id: "default",
      purpose: "",
      focusTitle: "",
      focusDetail: "",
      focusActivityId: null,
      focusProjectIds: projectIds,
      focusTaskIds: taskIds,
      meetingFlow: "",
      footnote: "",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dashboardSettings.id,
      set: { focusProjectIds: projectIds, focusTaskIds: taskIds, updatedAt: new Date() },
    }));
}

export async function saveNetworkServerStatusAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const rawServices = formData.get("services");
  if (typeof rawServices !== "string") return invalidFormResult;

  let decodedServices: unknown;
  try {
    decodedServices = JSON.parse(rawServices);
  } catch {
    return invalidFormResult;
  }

  const parsed = z.array(networkServiceUpdateSchema).length(networkServiceKeyValues.length).safeParse(decodedServices);
  if (!parsed.success || new Set(parsed.data.map((service) => service.key)).size !== networkServiceKeyValues.length) {
    return invalidFormResult;
  }
  const serviceUpdates = parsed.data;

  return runMutation("Network & Server status saved.", "Could not save Network & Server status.", async () => {
    await db.transaction(async (tx) => {
      const rows = await tx.select({ id: networkServiceStatuses.id, serviceKey: networkServiceStatuses.serviceKey })
        .from(networkServiceStatuses);
      const idsByKey = new Map(rows.map((row) => [row.serviceKey, row.id]));
      if (networkServiceKeyValues.some((key) => !idsByKey.has(key))) throw new Error("Network service status configuration is incomplete.");

      for (const service of serviceUpdates) {
        const id = idsByKey.get(service.key);
        if (id === undefined) throw new Error("Network service status was not found.");
        await tx.update(networkServiceStatuses).set({
          status: service.status,
          reason: service.status === "ABNORMAL" ? service.reason : "",
          detail: service.status === "ABNORMAL" ? service.detail : "",
          updatedAt: new Date(),
        }).where(eq(networkServiceStatuses.id, id));
      }
    });
  });
}

export async function saveCctvStatusAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const parsed = z.object({
    cameraCount: z.coerce.number().int().min(0).max(100000),
    cameraFaultyCount: z.coerce.number().int().min(0).max(100000),
    cameraFaultReason: z.string().trim().max(2000),
    cameraWaitingRepairCount: z.coerce.number().int().min(0).max(100000),
    cameraRepairingCount: z.coerce.number().int().min(0).max(100000),
    cameraInstallingCount: z.coerce.number().int().min(0).max(100000),
  }).safeParse({
    cameraCount: formData.get("cameraCount"),
    cameraFaultyCount: formData.get("cameraFaultyCount"),
    cameraFaultReason: formData.get("cameraFaultReason") ?? "",
    cameraWaitingRepairCount: formData.get("cameraWaitingRepairCount"),
    cameraRepairingCount: formData.get("cameraRepairingCount"),
    cameraInstallingCount: formData.get("cameraInstallingCount"),
  });

  if (!parsed.success) return invalidFormResult;
  const { cameraCount, cameraFaultyCount, cameraFaultReason, cameraWaitingRepairCount, cameraRepairingCount, cameraInstallingCount } = parsed.data;
  if (cameraFaultyCount > 0 && !cameraFaultReason) {
    return { ok: false, message: "Enter the reason for the faulty cameras." };
  }
  if (cameraFaultyCount + cameraWaitingRepairCount + cameraRepairingCount + cameraInstallingCount > cameraCount) {
    return { ok: false, message: "The number of cameras needing attention cannot exceed the total camera count." };
  }

  return runMutation("CCTV status saved.", "Could not save CCTV status.", async () => {
    await db.insert(dashboardSettings).values({
      id: "default",
      owner: "IT",
      reportTime: "08:00",
      purpose: "Align on summary, risks, and details only when needed.",
      focusTitle: "HR System",
      focusDetail: "Fix login error  |  Test by 15:00",
      focusActivityId: null,
      meetingFlow: "Overall status → Red / yellow items → Today’s focus → Detail sheet only if requested",
      footnote: "Dashboard stays shared during the meeting to reduce screen switching and Excel sheet navigation.",
      cameraCount,
      cameraFaultyCount,
      cameraFaultReason: cameraFaultyCount > 0 ? cameraFaultReason : "",
      cameraWaitingRepairCount,
      cameraRepairingCount,
      cameraInstallingCount,
      recorderStatus: "OK",
      updatedAt: new Date(),
    }).onConflictDoNothing();
    await db.update(dashboardSettings).set({
      cameraCount,
      cameraFaultyCount,
      cameraFaultReason: cameraFaultyCount > 0 ? cameraFaultReason : "",
      cameraWaitingRepairCount,
      cameraRepairingCount,
      cameraInstallingCount,
      updatedAt: new Date(),
    }).where(eq(dashboardSettings.id, "default"));
  });
}

export async function saveThemeAction(
  _previousState: { ok: boolean; message: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  await requireAuthenticatedSession();
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
  await requireAuthenticatedSession();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(140),
      status: projectStatusSchema,
      yesterday: z.string().trim().max(500),
      today: z.string().trim().max(500),
      startDate: projectDateSchema,
      endDate: projectDateSchema,
      progress: z.coerce.number().int().min(0).max(100),
    })
    .refine((values) => !values.startDate || !values.endDate || values.startDate <= values.endDate, {
      path: ["endDate"],
      message: "End date must be on or after the start date.",
    })
    .safeParse({
      name: formData.get("name"),
      status: formData.get("status"),
      yesterday: formData.get("yesterday") ?? "",
      today: formData.get("today") ?? "",
      startDate: formData.get("startDate") ?? "",
      endDate: formData.get("endDate") ?? "",
      progress: formData.get("progress"),
    });

  if (!parsed.success) return invalidFormResult;

  return runMutation("Project added.", "Could not add the project.", () => db.insert(projects).values({
    ...parsed.data,
    sortOrder: Math.floor(Date.now() / 1000),
  }));
}

export async function updateProjectAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      name: z.string().trim().min(2).max(140),
      status: projectStatusSchema,
      progress: z.coerce.number().int().min(0).max(100),
      yesterday: z.string().trim().max(500),
      today: z.string().trim().max(500),
      startDate: projectDateSchema,
      endDate: projectDateSchema,
    })
    .refine((values) => !values.startDate || !values.endDate || values.startDate <= values.endDate, {
      path: ["endDate"],
      message: "End date must be on or after the start date.",
    })
    .safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      status: formData.get("status"),
      progress: formData.get("progress"),
      yesterday: formData.get("yesterday") ?? "",
      today: formData.get("today") ?? "",
      startDate: formData.get("startDate") ?? "",
      endDate: formData.get("endDate") ?? "",
    });

  if (!parsed.success) return invalidFormResult;
  const { id, ...values } = parsed.data;
  return runMutation("Project updated.", "Could not update the project.", () =>
    updateProjectWithHistory(id, values),
  );
}

export async function updateProjectScheduleAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      startDate: projectDateSchema,
      endDate: projectDateSchema,
    })
    .safeParse({
      id: formData.get("id"),
      startDate: formData.get("startDate") ?? "",
      endDate: formData.get("endDate") ?? "",
    });

  if (!parsed.success) return invalidFormResult;
  const { id, startDate, endDate } = parsed.data;
  if (startDate && endDate && startDate > endDate) {
    return { ok: false, message: "End date must be on or after the start date." };
  }

  return runMutation("Project dates updated.", "Could not update the project dates.", () =>
    updateProjectWithHistory(id, { startDate, endDate }),
  );
}

export async function updateProjectDailyAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const rawTaskIds = formData.get("taskIds");
  if (typeof rawTaskIds !== "string") return invalidFormResult;

  let taskIdsInput: unknown;
  try {
    taskIdsInput = JSON.parse(rawTaskIds);
  } catch {
    return invalidFormResult;
  }

  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      taskIds: z.array(z.coerce.number().int().positive()).max(100),
      field: z.enum(["yesterday", "today"]),
    })
    .safeParse({
      id: formData.get("id"),
      taskIds: taskIdsInput,
      field: formData.get("field"),
    });

  if (!parsed.success) return invalidFormResult;
  const { id, taskIds, field } = parsed.data;
  if (new Set(taskIds).size !== taskIds.length) return invalidFormResult;

  const taskRows = taskIds.length > 0
    ? await db.select({ id: projectTasks.id, title: projectTasks.title }).from(projectTasks)
      .where(and(eq(projectTasks.projectId, id), inArray(projectTasks.id, taskIds)))
    : [];
  if (taskRows.length !== taskIds.length) return { ok: false, message: "Choose subtasks from this project." };

  const titlesById = new Map(taskRows.map((task) => [task.id, task.title]));
  const updateText = taskIds.map((taskId) => titlesById.get(taskId)).filter((title): title is string => title !== undefined).join("\n");
  const values: ProjectChangeValues = field === "yesterday" ? { yesterday: updateText } : { today: updateText };
  return runMutation("Project update saved.", "Could not save the project update.", () => updateProjectWithHistory(id, values));
}

export async function getProjectChangeHistoryAction(projectId: number): Promise<{
  ok: boolean;
  message?: string;
  entries: Array<{ id: number; field: string; oldValue: string | null; newValue: string | null; changedAt: string }>;
}> {
  await requireAuthenticatedSession();
  const parsed = z.number().int().positive().safeParse(projectId);
  if (!parsed.success) return { ok: false, message: "Invalid project.", entries: [] };

  try {
    const rows = await db.select({
      id: projectChangeHistory.id,
      field: projectChangeHistory.field,
      oldValue: projectChangeHistory.oldValue,
      newValue: projectChangeHistory.newValue,
      changedAt: projectChangeHistory.changedAt,
    })
      .from(projectChangeHistory)
      .where(eq(projectChangeHistory.projectId, parsed.data))
      .orderBy(desc(projectChangeHistory.changedAt), desc(projectChangeHistory.id))
      .limit(100);
    const previouslyChangedDateFields = new Set<string>();
    const visibleRows = [...rows].reverse().filter((row) => {
      const isScheduleDate = row.field === "startDate" || row.field === "endDate";
      if (!isScheduleDate) return true;
      const wasPreviouslyChanged = previouslyChangedDateFields.has(row.field);
      if (row.oldValue !== null) previouslyChangedDateFields.add(row.field);
      // Hide legacy first-time assignments from before initialization was excluded.
      return row.oldValue !== null || wasPreviouslyChanged;
    }).reverse();
    return {
      ok: true,
      entries: visibleRows.map((row) => ({ ...row, changedAt: row.changedAt.toISOString() })),
    };
  } catch {
    return { ok: false, message: "Could not load project history.", entries: [] };
  }
}

export async function deleteProjectAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse({ id: formData.get("id") });

  if (!parsed.success) return invalidFormResult;
  return runMutation("Project deleted.", "Could not delete the project.", () =>
    db.delete(projects).where(eq(projects.id, parsed.data.id)),
  );
}

export async function createProjectTaskAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const parsed = z
    .object({
      projectId: z.coerce.number().int().positive(),
      title: z.string().trim().min(2).max(220),
      status: projectTaskStatusSchema,
      startDate: projectDateSchema,
      endDate: projectDateSchema,
    })
    .refine((values) => !values.startDate || !values.endDate || values.startDate <= values.endDate, {
      path: ["endDate"],
      message: "End date must be on or after the start date.",
    })
    .safeParse({
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      status: formData.get("status"),
      startDate: formData.get("startDate") ?? "",
      endDate: formData.get("endDate") ?? "",
    });

  if (!parsed.success) return invalidFormResult;
  return runMutation("Subtask added.", "Could not add the subtask.", () =>
    db.insert(projectTasks).values({ ...parsed.data, sortOrder: Math.floor(Date.now() / 1000) }),
  );
}

export async function updateProjectTaskAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      projectId: z.coerce.number().int().positive(),
      title: z.string().trim().min(2).max(220),
      status: projectTaskStatusSchema,
      startDate: projectDateSchema,
      endDate: projectDateSchema,
    })
    .refine((values) => !values.startDate || !values.endDate || values.startDate <= values.endDate, {
      path: ["endDate"],
      message: "End date must be on or after the start date.",
    })
    .safeParse({
      id: formData.get("id"),
      projectId: formData.get("projectId"),
      title: formData.get("title"),
      status: formData.get("status"),
      startDate: formData.get("startDate") ?? "",
      endDate: formData.get("endDate") ?? "",
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
  await requireAuthenticatedSession();
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

export async function createIssueAction(formData: FormData): Promise<MutationResult & { issueId?: number }> {
  await requireAuthenticatedSession();
  const projectValue = formData.get("projectId");
  const relatedSectionValue = formData.get("relatedSection");
  const relatedActivityValue = formData.get("relatedActivityId");
  const parsed = z
    .object({
      projectId: z.number().int().positive().nullable(),
      relatedSection: activitySectionSchema.nullable(),
      relatedActivityId: z.number().int().positive().nullable(),
      title: z.string().trim().min(3).max(180),
      severity: issueSeveritySchema,
      detail: z.string().trim().max(1000),
      nextStep: z.string().trim().max(500),
      prevention: z.string().trim().max(1000),
    })
    .safeParse({
      projectId: projectValue && projectValue !== "none" ? Number(projectValue) : null,
      relatedSection: relatedSectionValue && relatedSectionValue !== "none" ? relatedSectionValue : null,
      relatedActivityId: relatedActivityValue && relatedActivityValue !== "none" ? Number(relatedActivityValue) : null,
      title: formData.get("title"),
      severity: formData.get("severity"),
      detail: formData.get("detail") ?? "",
      nextStep: formData.get("nextStep") ?? "",
      prevention: formData.get("prevention") ?? "",
    });

  if (!parsed.success) return invalidFormResult;
  if (parsed.data.relatedActivityId !== null) {
    const [activity] = await db.select({ section: activities.section }).from(activities)
      .where(eq(activities.id, parsed.data.relatedActivityId)).limit(1);
    if (!activity || activity.section !== parsed.data.relatedSection) {
      return { ok: false, message: "Choose an activity from the selected section." };
    }
  }
  try {
    const [createdIssue] = await db.insert(issues)
      .values({ ...parsed.data, sortOrder: Math.floor(Date.now() / 1000) })
      .returning({ id: issues.id });
    revalidatePath("/");
    return { ok: true, message: "Issue added.", issueId: createdIssue.id };
  } catch {
    return { ok: false, message: "Could not add the issue." };
  }
}

export async function updateIssueAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const projectValue = formData.get("projectId");
  const relatedSectionValue = formData.get("relatedSection");
  const relatedActivityValue = formData.get("relatedActivityId");
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      projectId: z.number().int().positive().nullable(),
      relatedSection: activitySectionSchema.nullable(),
      relatedActivityId: z.number().int().positive().nullable(),
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
      relatedSection: relatedSectionValue && relatedSectionValue !== "none" ? relatedSectionValue : null,
      relatedActivityId: relatedActivityValue && relatedActivityValue !== "none" ? Number(relatedActivityValue) : null,
      title: formData.get("title"),
      severity: formData.get("severity"),
      state: formData.get("state"),
      detail: formData.get("detail") ?? "",
      nextStep: formData.get("nextStep") ?? "",
      prevention: formData.get("prevention") ?? "",
    });

  if (!parsed.success) return invalidFormResult;
  if (parsed.data.relatedActivityId !== null) {
    const [activity] = await db.select({ section: activities.section }).from(activities)
      .where(eq(activities.id, parsed.data.relatedActivityId)).limit(1);
    if (!activity || activity.section !== parsed.data.relatedSection) {
      return { ok: false, message: "Choose an activity from the selected section." };
    }
  }
  const { id, ...values } = parsed.data;
  return runMutation("Issue updated.", "Could not update the issue.", () =>
    db.update(issues).set({ ...values, updatedAt: new Date() }).where(eq(issues.id, id)),
  );
}

export async function deleteIssueAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse({ id: formData.get("id") });

  if (!parsed.success) return invalidFormResult;
  let mediaUrls: string[] = [];
  const result = await runMutation("Issue deleted.", "Could not delete the issue.", async () => {
    const [issue] = await db.select({ imageUrl: issues.imageUrl }).from(issues).where(eq(issues.id, parsed.data.id)).limit(1);
    const attachments = await db.select({ url: mediaAttachments.url }).from(mediaAttachments).where(eq(mediaAttachments.issueId, parsed.data.id));
    mediaUrls = [issue?.imageUrl ?? "", ...attachments.map(({ url }) => url)].filter(Boolean);
    await db.delete(issues).where(eq(issues.id, parsed.data.id));
  });
  if (result.ok) await Promise.all(mediaUrls.map((url) => deleteStoredMedia(url).catch(() => undefined)));
  return result;
}

export async function createActivityAction(formData: FormData): Promise<MutationResult & { activityId?: number }> {
  await requireAuthenticatedSession();
  const parsed = z
    .object({
      section: activitySectionSchema,
      content: z.string().trim().min(2).max(220),
      severity: activitySeveritySchema,
      completed: z.enum(["true", "false"]).transform((value) => value === "true"),
    })
    .safeParse({ section: formData.get("section"), content: formData.get("content"), severity: formData.get("severity") ?? "MEDIUM", completed: formData.get("completed") ?? "false" });

  if (!parsed.success) return invalidFormResult;
  const today = getBangkokDateKey();
  try {
    const [activity] = await db.insert(activities).values({
      ...parsed.data,
      activityDate: parsed.data.section === "YESTERDAY" ? shiftDateKey(today, -1) : today,
      sortOrder: Math.floor(Date.now() / 1000),
    }).returning({ id: activities.id });
    if (!activity) return { ok: false, message: "Could not add the activity." };
    revalidatePath("/");
    return { ok: true, message: "Activity added.", activityId: activity.id };
  } catch {
    return { ok: false, message: "Could not add the activity." };
  }
}

export async function updateActivityAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
  const parsed = z
    .object({
      id: z.coerce.number().int().positive(),
      section: activitySectionSchema,
      content: z.string().trim().min(2).max(220),
      severity: activitySeveritySchema,
      completed: z.enum(["true", "false"]),
    })
    .safeParse({
      id: formData.get("id"),
      section: formData.get("section"),
      content: formData.get("content"),
      severity: formData.get("severity"),
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
  await requireAuthenticatedSession();
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse({ id: formData.get("id") });

  if (!parsed.success) return invalidFormResult;
  let mediaUrls: string[] = [];
  const result = await runMutation("Activity deleted.", "Could not delete the activity.", async () => {
    const [activity] = await db.select({ imageUrl: activities.imageUrl }).from(activities).where(eq(activities.id, parsed.data.id)).limit(1);
    const attachments = await db.select({ url: mediaAttachments.url }).from(mediaAttachments).where(eq(mediaAttachments.activityId, parsed.data.id));
    mediaUrls = [activity?.imageUrl ?? "", ...attachments.map(({ url }) => url)].filter(Boolean);
    await db.delete(activities).where(eq(activities.id, parsed.data.id));
  });
  if (result.ok) await Promise.all(mediaUrls.map((url) => deleteStoredMedia(url).catch(() => undefined)));
  return result;
}

export async function toggleActivityAction(formData: FormData): Promise<MutationResult> {
  await requireAuthenticatedSession();
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

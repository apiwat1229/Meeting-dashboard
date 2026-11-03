import "server-only";

import { and, asc, eq, gt, lt, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  activities,
  dashboardReportDays,
  dashboardSettings,
  departments,
  issues,
  mediaAttachments,
  networkServiceStatuses,
  projectTasks,
  projects,
} from "@/db/schema";
import { getBangkokDateKey, shiftDateKey } from "@/lib/date-key";
import { requireAuthenticatedSession } from "@/lib/dashboard-auth";
import { getAccessibleDepartment } from "@/lib/dashboard-scope";
import type { DashboardUser } from "@/lib/dashboard-users";
import { normalizeCctvRecorderItems } from "@/lib/cctv-operations";

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function dashboardSettingsId(departmentId: number, reportDate: string) {
  return `${departmentId}:${reportDate}`;
}

export function isValidReportDate(value: unknown): value is string {
  if (typeof value !== "string" || !dateKeyPattern.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function getRequestedReportDate() {
  return (await getRequestedDashboardContext()).reportDate;
}

export async function getRequestedDashboardContext() {
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer");
  let reportDate = getBangkokDateKey();
  let departmentCode: string | null = null;
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const requested = refererUrl.searchParams.get("date");
      if (isValidReportDate(requested)) reportDate = requested;
      const pathSegments = refererUrl.pathname.split("/").filter(Boolean);
      departmentCode = pathSegments[0] === "dashboard" && pathSegments[1]
        ? pathSegments[1]
        : refererUrl.searchParams.get("department");
    } catch {
      // Fall back to the user's department and Bangkok calendar date without a valid dashboard URL.
    }
  }
  const user = await requireAuthenticatedSession() as DashboardUser | null;
  const department = await getAccessibleDepartment(user, departmentCode);
  if (reportDate > getBangkokDateKey() && !(await reportDayExists(reportDate, department.id))) {
    throw new Error("Future report data is available after the 22:00 Bangkok copy.");
  }
  if (reportDate <= getBangkokDateKey()) await ensureReportDate(reportDate, department.id);
  return { reportDate, departmentId: department.id, departmentCode: department.code, departmentName: department.name };
}

async function reportDayExists(dateKey: string, departmentId: number) {
  const [row] = await db.select({ reportDate: dashboardReportDays.reportDate })
    .from(dashboardReportDays)
    .where(and(eq(dashboardReportDays.reportDate, dateKey), eq(dashboardReportDays.departmentId, departmentId)))
    .limit(1);
  return Boolean(row);
}

async function copyDailyRows(sourceDate: string, targetDate: string, carryActivities: boolean, departmentId: number) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${departmentId}::text || ':' || ${targetDate}))`);
    const [targetDay] = await tx.select({ reportDate: dashboardReportDays.reportDate })
      .from(dashboardReportDays)
      .where(and(eq(dashboardReportDays.reportDate, targetDate), eq(dashboardReportDays.departmentId, departmentId)))
      .limit(1);
    if (targetDay) return;
    const [sourceDay] = await tx.select({ reportDate: dashboardReportDays.reportDate })
      .from(dashboardReportDays)
      .where(and(eq(dashboardReportDays.reportDate, sourceDate), eq(dashboardReportDays.departmentId, departmentId)))
      .limit(1);
    if (!sourceDay) throw new Error(`Source report ${sourceDate} does not exist.`);

    const sourceProjects = await tx.select().from(projects).where(and(eq(projects.departmentId, departmentId), eq(projects.reportDate, sourceDate))).orderBy(asc(projects.id));
    const projectIdMap = new Map<number, number>();
    for (const row of sourceProjects) {
      const { id, reportDate: _reportDate, ...values } = row;
      const [copy] = await tx.insert(projects).values({ ...values, reportDate: targetDate }).returning({ id: projects.id });
      if (copy) projectIdMap.set(id, copy.id);
    }

    const sourceTasks = await tx.select().from(projectTasks).where(and(eq(projectTasks.departmentId, departmentId), eq(projectTasks.reportDate, sourceDate))).orderBy(asc(projectTasks.id));
    const taskIdMap = new Map<number, number>();
    for (const row of sourceTasks) {
      const projectId = projectIdMap.get(row.projectId);
      if (projectId === undefined) continue;
      const { id, reportDate: _reportDate, ...values } = row;
      const [copy] = await tx.insert(projectTasks).values({ ...values, projectId, reportDate: targetDate }).returning({ id: projectTasks.id });
      if (copy) taskIdMap.set(id, copy.id);
    }

    const sourceActivities = await tx.select().from(activities).where(
        carryActivities
        ? and(
            eq(activities.departmentId, departmentId),
            eq(activities.reportDate, sourceDate),
            or(
              eq(activities.section, "TODAY"),
              eq(activities.section, "OTHER"),
              and(eq(activities.section, "YESTERDAY"), eq(activities.completed, false)),
            ),
          )
        : and(eq(activities.departmentId, departmentId), eq(activities.reportDate, sourceDate)),
    ).orderBy(asc(activities.id));
    const activityIdMap = new Map<number, number>();
    for (const row of sourceActivities) {
      const { id, reportDate: _reportDate, section: sourceSection, ...values } = row;
      const [copy] = await tx.insert(activities).values({
        ...values,
        reportDate: targetDate,
        section: carryActivities ? "YESTERDAY" : sourceSection,
      }).returning({ id: activities.id });
      if (copy) activityIdMap.set(id, copy.id);
    }

    const sourceIssues = await tx.select().from(issues).where(and(eq(issues.departmentId, departmentId), eq(issues.reportDate, sourceDate))).orderBy(asc(issues.id));
    const issueIdMap = new Map<number, number>();
    for (const row of sourceIssues) {
      const { id, reportDate: _reportDate, ...values } = row;
      const [copy] = await tx.insert(issues).values({
        ...values,
        reportDate: targetDate,
        projectId: row.projectId === null ? null : projectIdMap.get(row.projectId) ?? null,
        relatedActivityId: row.relatedActivityId === null ? null : activityIdMap.get(row.relatedActivityId) ?? null,
      }).returning({ id: issues.id });
      if (copy) issueIdMap.set(id, copy.id);
    }

    const sourceServices = await tx.select().from(networkServiceStatuses).where(and(eq(networkServiceStatuses.departmentId, departmentId), eq(networkServiceStatuses.reportDate, sourceDate))).orderBy(asc(networkServiceStatuses.id));
    const serviceIdMap = new Map<number, number>();
    for (const row of sourceServices) {
      const { id, reportDate: _reportDate, ...values } = row;
      const [copy] = await tx.insert(networkServiceStatuses).values({ ...values, reportDate: targetDate }).returning({ id: networkServiceStatuses.id });
      if (copy) serviceIdMap.set(id, copy.id);
    }

    const sourceSettingsId = dashboardSettingsId(departmentId, sourceDate);
    const targetSettingsId = dashboardSettingsId(departmentId, targetDate);
    const [sourceSettings] = await tx.select().from(dashboardSettings).where(eq(dashboardSettings.id, sourceSettingsId)).limit(1);
    if (sourceSettings) {
      const [copySettings] = await tx.insert(dashboardSettings).values({
        ...sourceSettings,
        id: targetSettingsId,
        reportDate: targetDate,
        focusActivityId: sourceSettings.focusActivityId === null ? null : activityIdMap.get(sourceSettings.focusActivityId) ?? null,
        focusProjectIds: sourceSettings.focusProjectIds.flatMap((id) => projectIdMap.has(id) ? [projectIdMap.get(id)!] : []),
        focusTaskIds: sourceSettings.focusTaskIds.flatMap((id) => taskIdMap.has(id) ? [taskIdMap.get(id)!] : []),
        updatedAt: new Date(),
      }).onConflictDoNothing().returning({ id: dashboardSettings.id, cctvRecorderItems: dashboardSettings.cctvRecorderItems });

      if (copySettings) {
        const sourceAttachments = await tx.select().from(mediaAttachments).where(eq(mediaAttachments.dashboardSettingsId, sourceSettingsId));
        const attachmentIdMap = new Map<number, number>();
        for (const attachment of sourceAttachments) {
          const [copy] = await tx.insert(mediaAttachments).values({
            dashboardSettingsId: targetSettingsId,
            url: attachment.url,
          }).returning({ id: mediaAttachments.id });
          if (copy) attachmentIdMap.set(attachment.id, copy.id);
        }
        const recorderItems = normalizeCctvRecorderItems(copySettings.cctvRecorderItems).map((item) => ({
          ...item,
          media: item.media.flatMap((media) => {
            const id = attachmentIdMap.get(media.id);
            return id === undefined ? [] : [{ ...media, id }];
          }),
        }));
        await tx.update(dashboardSettings).set({ cctvRecorderItems: recorderItems })
          .where(eq(dashboardSettings.id, targetSettingsId));
      }
    }

    const sourceAttachments = await tx.select().from(mediaAttachments).where(and(
      gt(mediaAttachments.id, 0),
      // Each owner is remapped through IDs created above; this retains media on cloned rows only.
      sql`(${mediaAttachments.issueId} IS NOT NULL OR ${mediaAttachments.activityId} IS NOT NULL OR ${mediaAttachments.networkServiceId} IS NOT NULL)`,
      sql`(
        ${mediaAttachments.issueId} IN (SELECT id FROM issues WHERE report_date = ${sourceDate} AND department_id = ${departmentId}) OR
        ${mediaAttachments.activityId} IN (SELECT id FROM activities WHERE report_date = ${sourceDate} AND department_id = ${departmentId}) OR
        ${mediaAttachments.networkServiceId} IN (SELECT id FROM network_service_statuses WHERE report_date = ${sourceDate} AND department_id = ${departmentId})
      )`,
    ));
    for (const attachment of sourceAttachments) {
      const issueId = attachment.issueId === null ? null : issueIdMap.get(attachment.issueId) ?? null;
      const activityId = attachment.activityId === null ? null : activityIdMap.get(attachment.activityId) ?? null;
      const networkServiceId = attachment.networkServiceId === null ? null : serviceIdMap.get(attachment.networkServiceId) ?? null;
      if (issueId === null && activityId === null && networkServiceId === null) continue;
      await tx.insert(mediaAttachments).values({ issueId, activityId, networkServiceId, activityPhase: attachment.activityPhase, url: attachment.url });
    }

    await tx.insert(dashboardReportDays).values({ departmentId, reportDate: targetDate, copiedFrom: sourceDate, updatedAt: new Date() });
  });
}

export async function ensureReportDate(reportDate: string, departmentId: number) {
  if (!isValidReportDate(reportDate)) throw new Error("Invalid report date.");
  if (reportDate > getBangkokDateKey()) return false;
  if (await reportDayExists(reportDate, departmentId)) return true;

  const [previous] = await db.select({ reportDate: dashboardReportDays.reportDate })
    .from(dashboardReportDays)
    .where(and(eq(dashboardReportDays.departmentId, departmentId), lt(dashboardReportDays.reportDate, reportDate)))
    .orderBy(sql`${dashboardReportDays.reportDate} DESC`)
    .limit(1);
  if (previous) {
    let source = previous.reportDate;
    while (source < reportDate) {
      const target = shiftDateKey(source, 1);
      await copyDailyRows(source, target, true, departmentId);
      source = target;
    }
    return true;
  }

  const [next] = await db.select({ reportDate: dashboardReportDays.reportDate })
    .from(dashboardReportDays)
    .where(and(eq(dashboardReportDays.departmentId, departmentId), gt(dashboardReportDays.reportDate, reportDate)))
    .orderBy(asc(dashboardReportDays.reportDate))
    .limit(1);
  if (!next) return false;
  await copyDailyRows(next.reportDate, reportDate, false, departmentId);
  return true;
}

export async function copyReportToNextDay(sourceDate: string, departmentId: number) {
  await ensureReportDate(sourceDate, departmentId);
  const targetDate = shiftDateKey(sourceDate, 1);
  await copyDailyRows(sourceDate, targetDate, true, departmentId);
  return targetDate;
}

export async function catchUpReportDays(now = new Date()) {
  const today = getBangkokDateKey(now);
  const hourMinute = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const targetDate = hourMinute >= "22:00" ? shiftDateKey(today, 1) : today;
  const activeDepartments = await db.select({ id: departments.id }).from(departments).where(eq(departments.isActive, true));
  for (const department of activeDepartments) {
    const [latest] = await db.select({ reportDate: dashboardReportDays.reportDate })
      .from(dashboardReportDays)
      .where(and(eq(dashboardReportDays.departmentId, department.id), lt(dashboardReportDays.reportDate, shiftDateKey(targetDate, 1))))
      .orderBy(sql`${dashboardReportDays.reportDate} DESC`)
      .limit(1);
    if (!latest) continue;

    let source = latest.reportDate;
    while (source < targetDate) {
      const next = shiftDateKey(source, 1);
      await copyDailyRows(source, next, true, department.id);
      source = next;
    }
  }
}

export async function deleteMediaIfUnreferenced(url: string) {
  const [reference] = await db.select({ id: mediaAttachments.id }).from(mediaAttachments)
    .where(eq(mediaAttachments.url, url)).limit(1);
  if (reference) return;
  const { deleteStoredMedia } = await import("@/lib/image-uploads");
  await deleteStoredMedia(url).catch(() => undefined);
}

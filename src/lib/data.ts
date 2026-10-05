import { and, asc, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { activities, dashboardSettings, issues, mediaAttachments, networkServiceStatuses, projectTasks, projects, themeSettings } from "@/db/schema";
import { defaultTheme } from "@/lib/theme";
import { themeConfigSchema } from "@/lib/theme-schema";
import { getBangkokDateKey, shiftDateKey } from "@/lib/date-key";
import { systemNetworkServiceKeys } from "@/lib/system-status";
import { defaultCctvMeetings, defaultCctvRecorderItems } from "@/lib/cctv-operations";

async function advanceActivities(today: string, yesterday: string) {
  await db.transaction(async (tx) => {
    await tx.update(activities)
      .set({ section: "YESTERDAY" })
      .where(and(
        eq(activities.section, "TODAY"),
        eq(activities.activityDate, yesterday),
        eq(activities.completed, true),
      ));

    await tx.update(activities)
      .set({ section: "YESTERDAY" })
      .where(and(
        inArray(activities.section, ["TODAY", "YESTERDAY"]),
        lt(activities.activityDate, today),
        eq(activities.completed, false),
      ));

    await tx.update(activities)
      .set({ section: "TODAY", activityDate: today })
      .where(eq(activities.section, "OTHER"));

    await tx.update(issues)
      .set({ relatedSection: "TODAY" })
      .where(eq(issues.relatedSection, "OTHER"));
  });
}

export async function getThemeConfig() {
  const [row] = await db.select().from(themeSettings).where(eq(themeSettings.id, "default")).limit(1);
  if (!row) return defaultTheme;

  const parsed = themeConfigSchema.safeParse(row.config);
  if (!parsed.success) return defaultTheme;

  // Expand the old default cap for existing installations so the dashboard
  // uses the available display width after the responsive layout update.
  if (parsed.data.layout.maxWidth === 1840) {
    return {
      ...parsed.data,
      layout: { ...parsed.data.layout, maxWidth: defaultTheme.layout.maxWidth },
    };
  }

  return parsed.data;
}

export async function getDashboardData() {
  const today = getBangkokDateKey();
  const yesterday = shiftDateKey(today, -1);
  await advanceActivities(today, yesterday);

  const [projectRows, projectTaskRows, issueRows, activityRows, settingsRows, mediaRows, networkServiceRows] = await Promise.all([
    db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id)),
    db.select().from(projectTasks).orderBy(asc(projectTasks.sortOrder), asc(projectTasks.id)),
    db
      .select({
        id: issues.id,
        projectId: issues.projectId,
        projectName: projects.name,
        relatedSection: issues.relatedSection,
        relatedActivityId: issues.relatedActivityId,
        relatedActivityTitle: activities.content,
        relatedActivitySection: activities.section,
        title: issues.title,
        severity: issues.severity,
        state: issues.state,
        detail: issues.detail,
        nextStep: issues.nextStep,
        prevention: issues.prevention,
      })
      .from(issues)
      .leftJoin(projects, eq(issues.projectId, projects.id))
      .leftJoin(activities, eq(issues.relatedActivityId, activities.id))
      .orderBy(asc(issues.sortOrder), asc(issues.id)),
    db.select().from(activities)
      .where(or(
        and(eq(activities.section, "TODAY"), eq(activities.activityDate, today)),
        and(eq(activities.section, "YESTERDAY"), eq(activities.activityDate, yesterday)),
        and(eq(activities.section, "YESTERDAY"), lt(activities.activityDate, yesterday), eq(activities.completed, false)),
        eq(activities.section, "OTHER"),
      ))
      .orderBy(asc(activities.section), asc(activities.sortOrder), asc(activities.id)),
    db.select().from(dashboardSettings).where(eq(dashboardSettings.id, "default")).limit(1),
    db.select({ id: mediaAttachments.id, issueId: mediaAttachments.issueId, activityId: mediaAttachments.activityId, networkServiceId: mediaAttachments.networkServiceId, dashboardSettingsId: mediaAttachments.dashboardSettingsId, url: mediaAttachments.url })
      .from(mediaAttachments)
      .orderBy(asc(mediaAttachments.id)),
    db.select().from(networkServiceStatuses)
      .where(inArray(networkServiceStatuses.serviceKey, [...systemNetworkServiceKeys]))
      .orderBy(asc(networkServiceStatuses.id)),
  ]);

  const issueMedia = new Map<number, Array<{ id: number; url: string }>>();
  const activityMedia = new Map<number, Array<{ id: number; url: string }>>();
  const networkServiceMedia = new Map<number, Array<{ id: number; url: string }>>();
  const networkServiceOrder = new Map(systemNetworkServiceKeys.map((key, index) => [key, index]));
  for (const media of mediaRows) {
    if (media.issueId !== null) issueMedia.set(media.issueId, [...(issueMedia.get(media.issueId) ?? []), { id: media.id, url: media.url }]);
    if (media.activityId !== null) activityMedia.set(media.activityId, [...(activityMedia.get(media.activityId) ?? []), { id: media.id, url: media.url }]);
    if (media.networkServiceId !== null) networkServiceMedia.set(media.networkServiceId, [...(networkServiceMedia.get(media.networkServiceId) ?? []), { id: media.id, url: media.url }]);
  }

  const focusActivityId = settingsRows[0]?.focusActivityId ?? null;
  const [focusActivity] = focusActivityId === null ? [null] : await db.select({
    id: activities.id,
    content: activities.content,
    section: activities.section,
    completed: activities.completed,
  }).from(activities).where(eq(activities.id, focusActivityId)).limit(1);

  return {
    reportDateKey: today,
    projects: projectRows,
    projectTasks: projectTaskRows,
    networkServices: [...networkServiceRows]
      .sort((left, right) => (networkServiceOrder.get(left.serviceKey as (typeof systemNetworkServiceKeys)[number]) ?? Number.MAX_SAFE_INTEGER)
        - (networkServiceOrder.get(right.serviceKey as (typeof systemNetworkServiceKeys)[number]) ?? Number.MAX_SAFE_INTEGER))
      .map((service) => ({ ...service, media: networkServiceMedia.get(service.id) ?? [] })),
    cctvMedia: mediaRows.filter((media) => media.dashboardSettingsId === "default").map(({ id, url }) => ({ id, url })),
    issues: issueRows.map(({ relatedSection, relatedActivitySection, relatedActivityId, ...issue }) => {
      const resolvedRelatedSection = relatedActivityId === null ? relatedSection : relatedActivitySection;
      return {
        ...issue,
        relatedActivityId,
        relatedSection: resolvedRelatedSection === "OTHER" ? "TODAY" as const : resolvedRelatedSection,
        media: issueMedia.get(issue.id) ?? [],
      };
    }),
    activities: activityRows.flatMap((activity) => {
      const normalizedActivity = activity.section === "OTHER"
        ? { ...activity, section: "TODAY" as const, activityDate: today }
        : activity;
      const media = activityMedia.get(normalizedActivity.id) ?? [];
      if (normalizedActivity.section !== "YESTERDAY" || normalizedActivity.completed) return [{ ...normalizedActivity, media, isCarryover: false, willCarryOver: false }];
      return [
        { ...normalizedActivity, media, isCarryover: false, willCarryOver: true },
        { ...normalizedActivity, section: "TODAY" as const, activityDate: today, media, isCarryover: true, willCarryOver: false },
      ];
    }),
    focusActivity: focusActivity
      ? { ...focusActivity, section: focusActivity.section === "OTHER" ? "TODAY" as const : focusActivity.section }
      : null,
    settings: settingsRows[0] ?? {
      id: "default",
      owner: "IT",
      reportTime: "08:00",
      purpose: "Align on summary, risks, and details only when needed.",
      focusTitle: "HR System",
      focusDetail: "Fix login error  |  Test by 15:00",
      focusActivityId: null,
      focusProjectIds: [],
      focusTaskIds: [],
      meetingFlow: "Overall status → Red / yellow items → Today’s focus → Detail sheet only if requested",
      footnote: "Dashboard stays shared during the meeting to reduce screen switching and Excel sheet navigation.",
      cameraCount: 135,
      cameraFaultyCount: 0,
      cameraFaultReason: "",
      cameraWaitingRepairCount: 0,
      cameraRepairingCount: 0,
      cameraInstallingCount: 0,
      recorderStatus: "OK",
      cctvRecorderItems: defaultCctvRecorderItems,
      cctvMeetings: defaultCctvMeetings,
      updatedAt: new Date(),
    },
  };
}

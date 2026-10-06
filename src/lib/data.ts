import { and, asc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { activities, dashboardSettings, issues, mediaAttachments, networkServiceStatuses, projectTasks, projects } from "@/db/schema";
import { getBangkokDateKey } from "@/lib/date-key";
import { ensureReportDate } from "@/lib/daily-reports";
import { systemNetworkServiceKeys } from "@/lib/system-status";
import { defaultCctvMeetings, defaultCctvRecorderItems, normalizeCctvRecorderItems } from "@/lib/cctv-operations";

export async function getDashboardData(reportDateKey = getBangkokDateKey()) {
  await ensureReportDate(reportDateKey);

  const [projectRows, projectTaskRows, issueRows, activityRows, supplierNameRows, settingsRows, mediaRows, networkServiceRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.reportDate, reportDateKey)).orderBy(asc(projects.sortOrder), asc(projects.id)),
    db.select().from(projectTasks).where(eq(projectTasks.reportDate, reportDateKey)).orderBy(asc(projectTasks.sortOrder), asc(projectTasks.id)),
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
      .leftJoin(projects, and(eq(issues.projectId, projects.id), eq(projects.reportDate, reportDateKey)))
      .leftJoin(activities, and(eq(issues.relatedActivityId, activities.id), eq(activities.reportDate, reportDateKey)))
      .where(eq(issues.reportDate, reportDateKey))
      .orderBy(asc(issues.sortOrder), asc(issues.id)),
    db.select().from(activities)
      .where(and(
        eq(activities.reportDate, reportDateKey),
        inArray(activities.section, ["TODAY", "YESTERDAY", "OTHER"]),
      ))
      .orderBy(asc(activities.section), asc(activities.sortOrder), asc(activities.id)),
    db.selectDistinct({ supplierName: activities.supplierName })
      .from(activities)
      .where(isNotNull(activities.supplierName))
      .orderBy(asc(activities.supplierName)),
    db.select().from(dashboardSettings).where(eq(dashboardSettings.id, reportDateKey)).limit(1),
    db.select({ id: mediaAttachments.id, issueId: mediaAttachments.issueId, activityId: mediaAttachments.activityId, networkServiceId: mediaAttachments.networkServiceId, dashboardSettingsId: mediaAttachments.dashboardSettingsId, url: mediaAttachments.url })
      .from(mediaAttachments)
      .orderBy(asc(mediaAttachments.id)),
    db.select().from(networkServiceStatuses)
      .where(and(eq(networkServiceStatuses.reportDate, reportDateKey), inArray(networkServiceStatuses.serviceKey, [...systemNetworkServiceKeys])))
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

  const settingsDefaults = {
    id: reportDateKey,
    reportDate: reportDateKey,
    owner: "IT",
    reportTime: "08:00",
    purpose: "Align on summary, risks, and details only when needed.",
    focusTitle: "HR System",
    focusDetail: "Fix login error  |  Test by 15:00",
    focusActivityId: null,
    focusProjectIds: [] as number[],
    focusTaskIds: [] as number[],
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
  };
  const settings = settingsRows[0] ?? settingsDefaults;
  const cctvRecorderItems = normalizeCctvRecorderItems(settings.cctvRecorderItems);
  const cctvRecorderMediaIds = new Set(cctvRecorderItems.flatMap((item) => item.media.map((attachment) => attachment.id)));
  const supplierNames = [...new Map(
    supplierNameRows
      .map(({ supplierName }) => supplierName?.trim() ?? "")
      .filter(Boolean)
      .map((name) => [name.toLocaleLowerCase(), name]),
  ).values()].sort((left, right) => left.localeCompare(right));
  const dashboardActivities = activityRows.flatMap((activity) => {
    const normalizedActivity = activity.section === "OTHER" ? { ...activity, section: "TODAY" as const } : activity;
    const media = activityMedia.get(normalizedActivity.id) ?? [];
    if (normalizedActivity.section !== "YESTERDAY" || normalizedActivity.completed) {
      return [{ ...normalizedActivity, media, isCarryover: false, willCarryOver: false }];
    }
    return [
      { ...normalizedActivity, media, isCarryover: false, willCarryOver: true },
      { ...normalizedActivity, section: "TODAY" as const, media, isCarryover: true, willCarryOver: false },
    ];
  });

  return {
    reportDateKey,
    projects: projectRows,
    projectTasks: projectTaskRows,
    networkServices: [...networkServiceRows]
      .sort((left, right) => (networkServiceOrder.get(left.serviceKey as (typeof systemNetworkServiceKeys)[number]) ?? Number.MAX_SAFE_INTEGER)
        - (networkServiceOrder.get(right.serviceKey as (typeof systemNetworkServiceKeys)[number]) ?? Number.MAX_SAFE_INTEGER))
      .map((service) => ({ ...service, media: networkServiceMedia.get(service.id) ?? [] })),
    cctvMedia: mediaRows.filter((media) => media.dashboardSettingsId === reportDateKey && !cctvRecorderMediaIds.has(media.id)).map(({ id, url }) => ({ id, url })),
    issues: issueRows.map(({ relatedSection, relatedActivitySection, relatedActivityId, ...issue }) => {
      const resolvedRelatedSection = relatedActivityId === null ? relatedSection : relatedActivitySection;
      return {
        ...issue,
        relatedActivityId,
        relatedSection: resolvedRelatedSection === "OTHER" ? "TODAY" as const : resolvedRelatedSection,
        media: issueMedia.get(issue.id) ?? [],
      };
    }),
    activities: dashboardActivities.map((activity) => ({ ...activity, media: activityMedia.get(activity.id) ?? [] })),
    supplierNames,
    settings: { ...settings, cctvRecorderItems },
  };
}

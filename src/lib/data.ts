import { and, asc, desc, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { activities, cctvMeetingCases, dashboardSettings, issues, mediaAttachments, networkServiceStatuses, projectChangeHistory, projectTasks, projects } from "@/db/schema";
import { dashboardSettingsId, ensureReportDate } from "@/lib/daily-reports";
import { systemNetworkServiceKeys } from "@/lib/system-status";
import { defaultCctvMeetings, defaultCctvRecorderItems, normalizeCctvRecorderItems } from "@/lib/cctv-operations";

function isProjectComplete(project: { status: string; progress: number }) {
  const status = String(project.status).toUpperCase();
  return Number(project.progress) >= 100 || ["FINISH", "COMPLETE", "COMPLETED"].includes(status);
}

function getEffectiveProjectStatus<T extends { status: string; progress: number; endDate: string | null }>(project: T, reportDateKey: string, isRescheduled: boolean): T["status"] {
  if (isProjectComplete(project)) return "FINISH" as T["status"];
  // A revised schedule replaces the old target date. Only the current planned
  // finish date determines whether the project is overdue.
  if (project.endDate && project.endDate < reportDateKey) return "DELAY" as T["status"];
  // Clear a previously stored delay once a revised target date is back on schedule.
  if (isRescheduled && project.status === "DELAY") return "ON_TRACK" as T["status"];
  return project.status;
}

export async function getDashboardData(reportDateKey: string, departmentId: number, departmentName: string) {
  await ensureReportDate(reportDateKey, departmentId);
  const settingsId = dashboardSettingsId(departmentId, reportDateKey);

  const [projectRows, projectTaskRows, issueRows, activityRows, supplierNameRows, settingsRows, mediaRows, recentPhotoActivityRows, networkServiceRows, cctvMeetingCaseRows, projectDateHistoryRows] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.departmentId, departmentId), eq(projects.reportDate, reportDateKey))).orderBy(asc(projects.sortOrder), asc(projects.id)),
    db.select().from(projectTasks).where(and(eq(projectTasks.departmentId, departmentId), eq(projectTasks.reportDate, reportDateKey))).orderBy(asc(projectTasks.sortOrder), asc(projectTasks.id)),
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
      .leftJoin(projects, and(eq(issues.projectId, projects.id), eq(projects.departmentId, departmentId), eq(projects.reportDate, reportDateKey)))
      .leftJoin(activities, and(eq(issues.relatedActivityId, activities.id), eq(activities.departmentId, departmentId), eq(activities.reportDate, reportDateKey)))
      .where(and(eq(issues.departmentId, departmentId), eq(issues.reportDate, reportDateKey)))
      .orderBy(asc(issues.sortOrder), asc(issues.id)),
    db.select().from(activities)
      .where(and(
        eq(activities.reportDate, reportDateKey),
        eq(activities.departmentId, departmentId),
        inArray(activities.section, ["TODAY", "YESTERDAY", "OTHER"]),
      ))
      .orderBy(asc(activities.section), asc(activities.sortOrder), asc(activities.id)),
    db.selectDistinct({ supplierName: activities.supplierName })
      .from(activities)
      .where(and(eq(activities.departmentId, departmentId), isNotNull(activities.supplierName)))
      .orderBy(asc(activities.supplierName)),
    db.select().from(dashboardSettings).where(and(eq(dashboardSettings.id, settingsId), eq(dashboardSettings.departmentId, departmentId))).limit(1),
    db.select({ id: mediaAttachments.id, issueId: mediaAttachments.issueId, activityId: mediaAttachments.activityId, networkServiceId: mediaAttachments.networkServiceId, dashboardSettingsId: mediaAttachments.dashboardSettingsId, cctvMeetingCaseId: mediaAttachments.cctvMeetingCaseId, activityPhase: mediaAttachments.activityPhase, url: mediaAttachments.url })
      .from(mediaAttachments)
      .where(or(
        sql`${mediaAttachments.issueId} IN (SELECT id FROM issues WHERE department_id = ${departmentId} AND report_date = ${reportDateKey})`,
        sql`${mediaAttachments.activityId} IN (SELECT id FROM activities WHERE department_id = ${departmentId} AND report_date = ${reportDateKey})`,
        sql`${mediaAttachments.networkServiceId} IN (SELECT id FROM network_service_statuses WHERE department_id = ${departmentId} AND report_date = ${reportDateKey})`,
        eq(mediaAttachments.dashboardSettingsId, settingsId),
        sql`${mediaAttachments.cctvMeetingCaseId} IN (SELECT id FROM cctv_meeting_cases WHERE department_id = ${departmentId})`,
      ))
      .orderBy(asc(mediaAttachments.id)),
    db.select({
      id: activities.id,
      content: activities.content,
      description: activities.description,
      category: activities.category,
      reportDate: activities.reportDate,
      activityDate: activities.activityDate,
      progress: activities.progress,
      completed: activities.completed,
      supplierName: activities.supplierName,
      supplierDetails: activities.supplierDetails,
    })
      .from(activities)
      .innerJoin(mediaAttachments, eq(mediaAttachments.activityId, activities.id))
      .where(and(eq(activities.departmentId, departmentId), lte(activities.reportDate, reportDateKey)))
      .groupBy(activities.id, activities.content, activities.reportDate)
      .orderBy(desc(activities.reportDate), desc(activities.id)),
    db.select().from(networkServiceStatuses)
      .where(and(eq(networkServiceStatuses.departmentId, departmentId), eq(networkServiceStatuses.reportDate, reportDateKey), inArray(networkServiceStatuses.serviceKey, [...systemNetworkServiceKeys])))
      .orderBy(asc(networkServiceStatuses.id)),
    db.select().from(cctvMeetingCases).where(eq(cctvMeetingCases.departmentId, departmentId))
      .orderBy(asc(cctvMeetingCases.sortOrder), asc(cctvMeetingCases.id)),
    db.select({
      id: projectChangeHistory.id,
      projectSeriesId: projects.projectSeriesId,
      field: projectChangeHistory.field,
      oldValue: projectChangeHistory.oldValue,
      newValue: projectChangeHistory.newValue,
      reportDate: projectChangeHistory.reportDate,
      changedAt: projectChangeHistory.changedAt,
    })
      .from(projectChangeHistory)
      .innerJoin(projects, and(
        eq(projectChangeHistory.projectId, projects.id),
        eq(projectChangeHistory.departmentId, projects.departmentId),
        eq(projectChangeHistory.reportDate, projects.reportDate),
      ))
      .where(and(
        eq(projectChangeHistory.departmentId, departmentId),
        lte(projectChangeHistory.reportDate, reportDateKey),
        inArray(projectChangeHistory.field, ["startDate", "endDate"]),
      ))
      .orderBy(asc(projectChangeHistory.reportDate), asc(projectChangeHistory.changedAt), asc(projectChangeHistory.id)),
  ]);

  const recentPhotoMediaRows = recentPhotoActivityRows.length > 0
    ? await db.select({ id: mediaAttachments.id, activityId: mediaAttachments.activityId, activityPhase: mediaAttachments.activityPhase, url: mediaAttachments.url })
      .from(mediaAttachments)
      .where(inArray(mediaAttachments.activityId, recentPhotoActivityRows.map(({ id }) => id)))
      .orderBy(asc(mediaAttachments.id))
    : [];

  const previouslyChangedDateFields = new Set<string>();
  const projectDateChanges = projectDateHistoryRows.filter((change) => {
    const changeKey = `${change.projectSeriesId}:${change.field}`;
    const wasPreviouslyChanged = previouslyChangedDateFields.has(changeKey);
    if (change.oldValue !== null) previouslyChangedDateFields.add(changeKey);
    // Ignore legacy entries for a date's first assignment, which is initialization.
    return change.oldValue !== null || wasPreviouslyChanged;
  });
  const rescheduledProjectSeriesIds = new Set(
    projectDateChanges
      .filter((change) => change.oldValue !== change.newValue)
      .map((change) => change.projectSeriesId),
  );
  const issueMedia = new Map<number, Array<{ id: number; url: string }>>();
  const activityMedia = new Map<number, {
    general: Array<{ id: number; url: string }>;
    before: Array<{ id: number; url: string }>;
    after: Array<{ id: number; url: string }>;
  }>();
  const networkServiceMedia = new Map<number, Array<{ id: number; url: string }>>();
  const meetingCaseMedia = new Map<string, Array<{ id: number; url: string }>>();
  const recentPhotoMedia = new Map<number, Array<{ id: number; url: string; phase: "Activity" | "Before" | "After" }>>();
  const networkServiceOrder = new Map(systemNetworkServiceKeys.map((key, index) => [key, index]));
  for (const media of mediaRows) {
    if (media.issueId !== null) issueMedia.set(media.issueId, [...(issueMedia.get(media.issueId) ?? []), { id: media.id, url: media.url }]);
    if (media.activityId !== null) {
      const groups = activityMedia.get(media.activityId) ?? { general: [], before: [], after: [] };
      const group = media.activityPhase === "BEFORE" ? groups.before : media.activityPhase === "AFTER" ? groups.after : groups.general;
      group.push({ id: media.id, url: media.url });
      activityMedia.set(media.activityId, groups);
    }
    if (media.networkServiceId !== null) networkServiceMedia.set(media.networkServiceId, [...(networkServiceMedia.get(media.networkServiceId) ?? []), { id: media.id, url: media.url }]);
    if (media.cctvMeetingCaseId !== null) meetingCaseMedia.set(media.cctvMeetingCaseId, [...(meetingCaseMedia.get(media.cctvMeetingCaseId) ?? []), { id: media.id, url: media.url }]);
  }
  for (const media of recentPhotoMediaRows) {
    if (media.activityId === null) continue;
    const phase = media.activityPhase === "BEFORE" ? "Before" : media.activityPhase === "AFTER" ? "After" : "Activity";
    recentPhotoMedia.set(media.activityId, [...(recentPhotoMedia.get(media.activityId) ?? []), { id: media.id, url: media.url, phase }]);
  }

  const settingsDefaults = {
    id: settingsId,
    departmentId,
    reportDate: reportDateKey,
    owner: departmentName,
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
    cctvMeetingVisible: true,
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
    const media = activityMedia.get(normalizedActivity.id) ?? { general: [], before: [], after: [] };
    const withMedia = { ...normalizedActivity, media: media.general, beforeMedia: media.before, afterMedia: media.after };
    if (normalizedActivity.section !== "YESTERDAY" || normalizedActivity.completed) {
      return [{ ...withMedia, isCarryover: false, willCarryOver: false }];
    }
    return [
      { ...withMedia, isCarryover: false, willCarryOver: true },
      { ...withMedia, section: "TODAY" as const, isCarryover: true, willCarryOver: false },
    ];
  });
  const tasksByProjectId = new Map<number, Array<(typeof projectTaskRows)[number]>>();
  for (const task of projectTaskRows) {
    tasksByProjectId.set(task.projectId, [...(tasksByProjectId.get(task.projectId) ?? []), task]);
  }

  const dashboardProjects = projectRows.map((project) => {
    const projectTasks = tasksByProjectId.get(project.id) ?? [];
    const allTasksComplete = projectTasks.length > 0 && projectTasks.every((task) => task.status === "DONE");
    const isComplete = allTasksComplete || isProjectComplete(project);
    const isRescheduled = !isComplete && rescheduledProjectSeriesIds.has(project.projectSeriesId);

    return {
      ...project,
      isRescheduled,
      status: isComplete ? "FINISH" as const : getEffectiveProjectStatus(
        project,
        reportDateKey,
        isRescheduled,
      ),
      progress: isComplete ? 100 : project.progress,
    };
  });

  return {
    reportDateKey,
    departmentId,
    projects: dashboardProjects,
    projectTasks: projectTaskRows,
    projectDateChanges,
    networkServices: [...networkServiceRows]
      .sort((left, right) => (networkServiceOrder.get(left.serviceKey as (typeof systemNetworkServiceKeys)[number]) ?? Number.MAX_SAFE_INTEGER)
        - (networkServiceOrder.get(right.serviceKey as (typeof systemNetworkServiceKeys)[number]) ?? Number.MAX_SAFE_INTEGER))
      .map((service) => ({ ...service, media: networkServiceMedia.get(service.id) ?? [] })),
    cctvMeetingCases: cctvMeetingCaseRows.map((meetingCase) => ({ ...meetingCase, media: meetingCaseMedia.get(meetingCase.id) ?? [] })),
    cctvMedia: mediaRows.filter((media) => media.dashboardSettingsId === settingsId && !cctvRecorderMediaIds.has(media.id)).map(({ id, url }) => ({ id, url })),
    issues: issueRows.map(({ relatedSection, relatedActivitySection, relatedActivityId, ...issue }) => {
      const resolvedRelatedSection = relatedActivityId === null ? relatedSection : relatedActivitySection;
      return {
        ...issue,
        relatedActivityId,
        relatedSection: resolvedRelatedSection === "OTHER" ? "TODAY" as const : resolvedRelatedSection,
        media: issueMedia.get(issue.id) ?? [],
      };
    }),
    activities: dashboardActivities,
    recentPhotoActivities: recentPhotoActivityRows.map((activity) => ({
      ...activity,
      photos: recentPhotoMedia.get(activity.id) ?? [],
    })),
    supplierNames,
    settings: { ...settings, cctvRecorderItems },
  };
}

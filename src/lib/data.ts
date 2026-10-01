import { and, asc, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { activities, dashboardSettings, issues, projectTasks, projects, themeSettings } from "@/db/schema";
import { defaultTheme } from "@/lib/theme";
import { themeConfigSchema } from "@/lib/theme-schema";
import { getBangkokDateKey, shiftDateKey } from "@/lib/date-key";

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
      .set({ section: "TODAY", activityDate: today })
      .where(and(
        inArray(activities.section, ["TODAY", "YESTERDAY"]),
        lt(activities.activityDate, today),
        eq(activities.completed, false),
      ));

    await tx.update(activities)
      .set({ activityDate: today })
      .where(and(
        eq(activities.section, "OTHER"),
        lt(activities.activityDate, today),
        eq(activities.completed, false),
      ));
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

  const [projectRows, projectTaskRows, issueRows, activityRows, settingsRows] = await Promise.all([
    db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id)),
    db.select().from(projectTasks).orderBy(asc(projectTasks.sortOrder), asc(projectTasks.id)),
    db
      .select({
        id: issues.id,
        projectId: issues.projectId,
        projectName: projects.name,
        title: issues.title,
        severity: issues.severity,
        state: issues.state,
        detail: issues.detail,
        nextStep: issues.nextStep,
        prevention: issues.prevention,
        imageUrl: issues.imageUrl,
      })
      .from(issues)
      .leftJoin(projects, eq(issues.projectId, projects.id))
      .orderBy(asc(issues.sortOrder), asc(issues.id)),
    db.select().from(activities)
      .where(or(
        and(eq(activities.section, "TODAY"), eq(activities.activityDate, today)),
        and(eq(activities.section, "YESTERDAY"), eq(activities.activityDate, yesterday)),
        eq(activities.section, "OTHER"),
      ))
      .orderBy(asc(activities.section), asc(activities.sortOrder), asc(activities.id)),
    db.select().from(dashboardSettings).where(eq(dashboardSettings.id, "default")).limit(1),
  ]);

  return {
    reportDateKey: today,
    projects: projectRows,
    projectTasks: projectTaskRows,
    issues: issueRows,
    activities: activityRows,
    settings: settingsRows[0] ?? {
      id: "default",
      owner: "IT",
      reportTime: "08:00",
      purpose: "Align on summary, risks, and details only when needed.",
      focusTitle: "HR System",
      focusDetail: "Fix login error  |  Test by 15:00",
      meetingFlow: "Overall status → Red / yellow items → Today’s focus → Detail sheet only if requested",
      footnote: "Dashboard stays shared during the meeting to reduce screen switching and Excel sheet navigation.",
      cameraCount: 48,
      recorderStatus: "OK",
      updatedAt: new Date(),
    },
  };
}

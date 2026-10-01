import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, dashboardSettings, issues, projects, themeSettings } from "@/db/schema";
import { defaultTheme } from "@/lib/theme";
import { themeConfigSchema } from "@/lib/theme-schema";

export async function getThemeConfig() {
  const [row] = await db.select().from(themeSettings).where(eq(themeSettings.id, "default")).limit(1);
  if (!row) return defaultTheme;

  const parsed = themeConfigSchema.safeParse(row.config);
  return parsed.success ? parsed.data : defaultTheme;
}

export async function getDashboardData() {
  const [projectRows, issueRows, activityRows, settingsRows] = await Promise.all([
    db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id)),
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
      })
      .from(issues)
      .leftJoin(projects, eq(issues.projectId, projects.id))
      .orderBy(asc(issues.sortOrder), asc(issues.id)),
    db.select().from(activities).orderBy(asc(activities.section), asc(activities.sortOrder), asc(activities.id)),
    db.select().from(dashboardSettings).where(eq(dashboardSettings.id, "default")).limit(1),
  ]);

  return {
    projects: projectRows,
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

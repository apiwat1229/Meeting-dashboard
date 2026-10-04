import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  FolderKanban,
  ListTodo,
  Settings2,
} from "lucide-react";
import type { getDashboardData } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ReportDatePicker } from "@/components/dashboard/report-date-picker";
import { ActivityEditor, AddActivityMenu } from "@/components/dashboard/activity-crud";
import { ActivityStatusIndicator } from "@/components/dashboard/activity-status-indicator";
import { AddProjectMenu, ProjectEditor } from "@/components/dashboard/project-crud";
import { DailyRefresh } from "@/components/dashboard/daily-refresh";
import { FullScreenToggle } from "@/components/dashboard/full-screen-toggle";
import { TodayFocus } from "@/components/dashboard/today-focus";
import { SystemStatusPanel } from "@/components/dashboard/system-status";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type ProjectStatus = DashboardData["projects"][number]["status"];
type IssueRow = DashboardData["issues"][number];

function formatProjectDate(dateKey: string, includeYear = true) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

function formatProjectDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "—";
  if (!startDate) return `— - ${formatProjectDate(endDate!)}`;
  if (!endDate) return `${formatProjectDate(startDate)} - —`;

  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const sameMonth = startDate.slice(0, 7) === endDate.slice(0, 7);
  const startLabel = sameMonth
    ? String(Number(startDate.slice(8, 10)))
    : formatProjectDate(startDate, !sameYear);

  return `${startLabel} - ${formatProjectDate(endDate)}`;
}

function projectProgressTone(status: ProjectStatus): "success" | "warning" | "danger" | "info" {
  if (status === "DELAY") return "danger";
  if (status === "ATTENTION") return "warning";
  if (status === "FINISH") return "info";
  return "success";
}

function issueTone(issue: IssueRow) {
  if (issue.state === "CLOSED") return "success" as const;
  return issue.severity === "HIGH" ? "danger" as const : "warning" as const;
}

function SummaryBreakdown({
  items,
  label,
  columns = 3,
}: {
  items: Array<{ value: string | number; label: string; tone: "neutral" | "success" | "warning" | "danger"; title?: string; detail?: string }>;
  label: string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div className={`summary-breakdown summary-breakdown-${columns}`} role="group" aria-label={label}>
      {items.map((item) => (
        <div className={`summary-breakdown-item summary-${item.tone}`} key={item.label}>
          {item.title && <strong className="summary-breakdown-title">{item.title}</strong>}
          <strong>{item.value}</strong>
          <span>{item.label}</span>
          {item.detail && <small>{item.detail}</small>}
        </div>
      ))}
    </div>
  );
}

function ProjectRow({ project, tasks, index }: { project: DashboardData["projects"][number]; tasks: DashboardData["projectTasks"]; index: number }) {
  return (
    <ProjectEditor project={project} tasks={tasks}>
      <span className="project-index type-body" role="cell">{index + 1}.</span>
      <div className="project-name type-body" role="cell">{project.name}</div>
      <span className="project-work type-body" role="cell">{project.yesterday || "—"}</span>
      <span className="project-work type-body" role="cell">{project.today || "—"}</span>
      <span className="project-schedule-range type-caption" role="cell">{formatProjectDateRange(project.startDate, project.endDate)}</span>
      <div className="project-progress-cell" role="cell">
        <span className={`project-progress-indicator status-${projectProgressTone(project.status)}`} aria-label={`Progress ${project.progress}%`}>
          <span className="project-progress-dot" aria-hidden="true" />
          <span>{project.progress}%</span>
        </span>
      </div>
    </ProjectEditor>
  );
}

function ProjectSection({ data }: { data: DashboardData }) {
  const delayCount = data.projects.filter((project) => project.status === "DELAY").length;
  const finishCount = data.projects.filter((project) => project.status === "FINISH").length;
  const inProgressCount = data.projects.length - delayCount - finishCount;

  return (
    <Card className="content-card project-card main-overview-projects" aria-labelledby="active-projects-title">
      <div className="section-heading project-heading">
        <div className="project-heading-copy">
          <h2 className="type-h2" id="active-projects-title">Active Projects</h2>
        </div>
        <div className="project-status-summary">
          <SummaryBreakdown
            label={`${data.projects.length} Projects, ${delayCount} Delayed, ${inProgressCount} Ongoing`}
            columns={3}
            items={[
              { value: data.projects.length, label: "Projects", tone: "neutral" },
              { value: delayCount, label: "Delayed", tone: "danger" },
              { value: inProgressCount, label: "Ongoing", tone: "success" },
            ]}
          />
        </div>
        <div className="project-legend" role="group" aria-label="Project status legend">
          <span className="project-legend-item"><span className="project-legend-swatch legend-in-progress" aria-hidden="true" />On schedule</span>
          <span className="project-legend-item"><span className="project-legend-swatch legend-delay" aria-hidden="true" />Delayed</span>
          <span className="project-legend-item"><span className="project-legend-swatch legend-finish" aria-hidden="true" />Early</span>
        </div>
        <AddProjectMenu />
      </div>
      <div className="project-table" role="table" aria-label="Project progress">
        <div className="project-header type-caption" role="row">
          <span role="columnheader">No.</span>
          <span role="columnheader">Project</span>
          <span role="columnheader">Yesterday</span>
          <span role="columnheader">Today</span>
          <span role="columnheader">Start / End</span>
          <span role="columnheader">Progress</span>
        </div>
        <div className="project-body" role="rowgroup">
          {data.projects.map((project, index) => (
            <ProjectRow
              key={project.id}
              project={project}
              tasks={data.projectTasks.filter((task) => task.projectId === project.id)}
              index={index}
            />
          ))}
          {data.projects.length === 0 && (
            <div className="project-empty-row" role="row">
              <div role="cell" aria-colspan={6}>
                <Empty className="dashboard-empty">
                  <EmptyMedia variant="icon"><FolderKanban size={16} /></EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle>No active projects</EmptyTitle>
                    <EmptyDescription>Add a project to start tracking progress.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function ActivitySection({
  section,
  title,
  data,
}: {
  section: "YESTERDAY" | "TODAY";
  title: string;
  data: DashboardData;
}) {
  const entries = data.activities.filter((item) => item.section === section);
  const relatedIssues = data.issues.filter((issue) => issue.relatedSection === section);

  return (
    <Card className="activity-card" aria-label={title}>
      <div className="section-heading activity-heading">
        <h2 className="type-h2">{title}</h2>
        <AddActivityMenu section={section} />
      </div>
      <ul className="activity-list">
        {entries.map((activity, index) => (
          <ActivityEditor
            key={activity.id}
            activity={activity}
            relatedIssues={data.issues.filter((issue) => issue.relatedActivityId === activity.id).map((issue) => ({
              id: issue.id,
              title: issue.title,
              severity: issue.severity,
              state: issue.state,
            }))}
          >
            {section === "YESTERDAY" ? (
              <ActivityStatusIndicator
                completed={activity.completed}
                continuing={Boolean(activity.isCarryover || activity.willCarryOver)}
                highPriority={activity.severity === "HIGH"}
              />
            ) : null}
            <span className="activity-number" aria-hidden="true">{index + 1}.</span>
            <span className="activity-content type-body">{activity.content}</span>
            {(activity.isCarryover || activity.willCarryOver) && (
              <span className={`activity-carryover-tag ${activity.willCarryOver ? "activity-carryover-pending" : "activity-carryover-today"}`}>
                <ArrowLeft size={16} aria-hidden="true" />
                {activity.willCarryOver ? "Continued today" : "From yesterday"}
              </span>
            )}
          </ActivityEditor>
        ))}
        {entries.length === 0 && relatedIssues.length === 0 && (
          <li className="activity-empty-item">
            <Empty className="dashboard-empty">
              <EmptyMedia variant="icon"><ListTodo size={16} /></EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No items yet</EmptyTitle>
                <EmptyDescription>Add an item to this section.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </li>
        )}
      </ul>
      {relatedIssues.length > 0 && (
        <section className="section-linked-issues" aria-label={`Issues related to ${title}`}>
          <h3><CircleAlert size={14} aria-hidden="true" /> Related issues</h3>
          <ul className="section-linked-issue-list">
            {relatedIssues.map((issue) => (
              <li key={issue.id} className={`section-linked-issue section-linked-${issueTone(issue)}`}>
                <span className="section-linked-issue-dot" aria-hidden="true" />
                <div>
                  <strong>{issue.title}</strong>
                  {issue.relatedActivityTitle && <span>{issue.relatedActivityTitle}</span>}
                </div>
                <span className="section-linked-issue-status">
                  {issue.state === "CLOSED" ? "Done" : issue.severity === "HIGH" ? "High" : "Medium"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}

export function Dashboard({ data }: { data: DashboardData }) {
  const reportDateKey = data.reportDateKey;
  const focusProjectOptions = data.projects.map((project) => ({
    id: project.id,
    name: project.name,
    progress: project.progress,
    tasks: data.projectTasks
      .filter((task) => task.projectId === project.id)
      .map(({ id, title, status }) => ({ id, title, status })),
  }));
  const selectedFocusProjectIds = data.settings.focusProjectIds ?? [];
  const selectedFocusTaskIds = data.settings.focusTaskIds ?? [];

  return (
    <main className="page-shell">
      <DailyRefresh initialDateKey={reportDateKey} />
      <section className="dashboard-frame" aria-label="IT morning dashboard">
        <header className="dashboard-topbar">
          <div className="dashboard-name">
            <h2 className="type-h2">IT Daily Status &amp; Operations Summary</h2>
          </div>
          <div className="report-meta type-caption">
            <ReportDatePicker initialDateKey={reportDateKey} />
            <FullScreenToggle />
            <Link
              href="/settings/theme"
              className="button button-secondary theme-topbar-button"
              aria-label="Theme settings"
              title="Theme settings"
            >
              <Settings2 size={17} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="main-grid" aria-label="Active Projects and Today’s Focus">
            <ProjectSection data={data} />
            <Card className="content-card today-focus-card">
              <TodayFocus
                projects={focusProjectOptions}
                selectedProjectIds={selectedFocusProjectIds}
                selectedTaskIds={selectedFocusTaskIds}
              />
            </Card>
          </section>

          <section className="activity-grid" aria-label="Activities and system status">
            <ActivitySection section="TODAY" title="Today Activities" data={data} />
            <ActivitySection section="YESTERDAY" title="Yesterday Activities" data={data} />
            <SystemStatusPanel
              networkServices={data.networkServices}
              cctv={{
                cameraCount: data.settings.cameraCount,
                cameraFaultyCount: data.settings.cameraFaultyCount,
                cameraFaultReason: data.settings.cameraFaultReason,
                cameraWaitingRepairCount: data.settings.cameraWaitingRepairCount,
                cameraRepairingCount: data.settings.cameraRepairingCount,
                cameraInstallingCount: data.settings.cameraInstallingCount,
                media: data.cctvMedia,
              }}
            />
          </section>

        </div>
      </section>
    </main>
  );
}

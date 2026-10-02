import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  FolderKanban,
  ListTodo,
  Settings2,
} from "lucide-react";
import type { ReactNode } from "react";
import type { getDashboardData } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ReportDatePicker } from "@/components/dashboard/report-date-picker";
import { AddIssueMenu } from "@/components/dashboard/add-issue-menu";
import { IssueEditor } from "@/components/dashboard/issue-editor";
import { ActivityEditor, AddActivityMenu } from "@/components/dashboard/activity-crud";
import { ActivityStatusIndicator } from "@/components/dashboard/activity-status-indicator";
import { AddProjectMenu, ProjectEditor } from "@/components/dashboard/project-crud";
import { DailyRefresh } from "@/components/dashboard/daily-refresh";
import { FullScreenToggle } from "@/components/dashboard/full-screen-toggle";
import { TodayFocus } from "@/components/dashboard/today-focus";
import { SystemStatusPanel } from "@/components/dashboard/system-status";
import type { IssueActivityOption } from "@/components/dashboard/issue-activity-link-fields";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type ProjectStatus = DashboardData["projects"][number]["status"];
type IssueRow = DashboardData["issues"][number];

function getIssueActivityOptions(data: DashboardData): IssueActivityOption[] {
  const options = new Map<number, IssueActivityOption>();
  for (const activity of data.activities) {
    if (!options.has(activity.id)) {
      options.set(activity.id, { id: activity.id, content: activity.content, section: activity.section });
    }
  }
  for (const issue of data.issues) {
    if (issue.relatedActivityId !== null && issue.relatedActivityTitle && issue.relatedSection && !options.has(issue.relatedActivityId)) {
      options.set(issue.relatedActivityId, {
        id: issue.relatedActivityId,
        content: issue.relatedActivityTitle,
        section: issue.relatedSection,
      });
    }
  }
  return [...options.values()];
}

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

function SummaryCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="summary-card">
      <p className="summary-label type-caption">{label}</p>
      <div className="summary-card-content">{children}</div>
    </Card>
  );
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
        <Badge className="project-progress-badge" variant={projectProgressTone(project.status)} aria-label={`Progress ${project.progress}%`}>
          {project.progress}%
        </Badge>
      </div>
    </ProjectEditor>
  );
}

function ProjectSection({ data }: { data: DashboardData }) {
  return (
    <Card className="content-card project-card">
      <div className="section-heading project-heading">
        <div className="project-heading-copy">
          <h2 className="type-h2">Active Projects</h2>
          <div className="project-legend" role="group" aria-label="Project status legend">
            <span className="project-legend-item"><span className="project-legend-swatch legend-in-progress" aria-hidden="true" />Ongoing</span>
            <span className="project-legend-item"><span className="project-legend-swatch legend-delay" aria-hidden="true" />Delayed</span>
            <span className="project-legend-item"><span className="project-legend-swatch legend-finish" aria-hidden="true" />Early</span>
          </div>
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

function IssueSection({ data }: { data: DashboardData }) {
  const activityOptions = getIssueActivityOptions(data);
  return (
    <Card className="content-card issue-card">
      <div className="section-heading issue-heading">
        <div className="issue-heading-copy">
          <h2 className="type-h2">Issues / Trouble</h2>
          <div className="issue-legend" role="group" aria-label="Issue color legend">
            <span className="issue-legend-item"><span className="issue-legend-swatch issue-legend-high" aria-hidden="true" />High</span>
            <span className="issue-legend-item"><span className="issue-legend-swatch issue-legend-medium" aria-hidden="true" />Medium</span>
            <span className="issue-legend-item"><span className="issue-legend-swatch issue-legend-done" aria-hidden="true" />Done</span>
          </div>
        </div>
        <AddIssueMenu projects={data.projects.map(({ id, name }) => ({ id, name }))} activities={activityOptions} />
      </div>
      <div className="issue-list">
        {data.issues.map((issue, index) => (
          <IssueEditor
            key={issue.id}
            className={`issue-item issue-${issueTone(issue)}`}
            issue={{
              id: issue.id,
              title: issue.title,
              projectId: issue.projectId,
              relatedSection: issue.relatedSection,
              relatedActivityId: issue.relatedActivityId,
              relatedActivityTitle: issue.relatedActivityTitle,
              severity: issue.severity,
              state: issue.state,
              detail: issue.detail,
              nextStep: issue.nextStep,
              prevention: issue.prevention,
              projectName: issue.projectName,
              media: issue.media,
            }}
            projects={data.projects.map(({ id, name }) => ({ id, name }))}
            activities={activityOptions}
          >
            <span className="issue-index" aria-hidden="true">{index + 1}.</span>
            <div className="issue-copy">
              <div className="issue-title-row">
                <strong className="type-body">{issue.title}</strong>
                {issue.projectName && <span className="issue-project type-caption">{issue.projectName}</span>}
                {issue.relatedSection && (
                  <span className="issue-project issue-related-section type-caption">
                    {issue.relatedSection === "TODAY" ? "Today Other Activities" : issue.relatedSection === "YESTERDAY" ? "Yesterday Other Activities" : "Other Topics"}
                    {issue.relatedActivityTitle ? ` · ${issue.relatedActivityTitle}` : ""}
                  </span>
                )}
              </div>
              {issue.detail && <p className="issue-description">{issue.detail}</p>}
              <p className="issue-follow-up">
                <span className="issue-follow-up-label">{issue.state === "CLOSED" ? "Prevention" : "Action"}</span>
                <span className="issue-follow-up-text">
                  {issue.state === "CLOSED"
                    ? issue.prevention || "Prevention plan not set"
                    : issue.nextStep || "Next step not set"}
                </span>
              </p>
            </div>
          </IssueEditor>
        ))}
        {data.issues.length === 0 && (
          <Empty className="dashboard-empty">
            <EmptyMedia variant="icon"><CircleAlert size={16} /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No issues reported</EmptyTitle>
              <EmptyDescription>Add an issue when the team needs help.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </Card>
  );
}

function ActivityCard({
  section,
  title,
  data,
}: {
  section: "YESTERDAY" | "TODAY" | "OTHER";
  title: string;
  data: DashboardData;
}) {
  const entries = data.activities.filter((item) => item.section === section);
  const relatedIssues = data.issues.filter((issue) => issue.relatedSection === section);

  return (
    <Card className="activity-card">
      <div className="section-heading activity-heading">
        <div>
          <h2 className="type-h2">{title}</h2>
        </div>
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
            <span className="activity-number" aria-hidden="true">{index + 1}.</span>
            <span className="activity-content type-body">{activity.content}</span>
            {(activity.isCarryover || activity.willCarryOver) && (
              <span className={`activity-carryover-tag ${activity.willCarryOver ? "activity-carryover-pending" : "activity-carryover-today"}`}>
                {activity.willCarryOver
                  ? <ArrowRight size={16} aria-hidden="true" />
                  : <ArrowLeft size={16} aria-hidden="true" />}
                {activity.willCarryOver ? "Continued today" : "From yesterday"}
              </span>
            )}
            <ActivityStatusIndicator completed={activity.completed} />
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
  const delayCount = data.projects.filter((project) => project.status === "DELAY").length;
  const finishCount = data.projects.filter((project) => project.status === "FINISH").length;
  const inProgressCount = data.projects.length - delayCount - finishCount;
  const openIssues = data.issues.filter((issue) => issue.state === "OPEN");
  const highCount = openIssues.filter((issue) => issue.severity === "HIGH").length;
  const mediumCount = openIssues.filter((issue) => issue.severity === "MEDIUM").length;

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
          <section className="summary-grid" aria-label="Daily summary">
            <SummaryCard
              label="Overall Status"
            >
              <SummaryBreakdown
                label={`${data.projects.length} Projects, ${delayCount} Delayed, ${inProgressCount} In Progress`}
                columns={3}
                items={[
                  { value: data.projects.length, label: "Projects", tone: "neutral" },
                  { value: delayCount, label: "Delayed", tone: "danger" },
                  { value: inProgressCount, label: "In Progress", tone: "success" },
                ]}
              />
            </SummaryCard>
            <SummaryCard
              label="Issues / Trouble"
            >
              <SummaryBreakdown
                label={`${highCount} High, ${mediumCount} Medium`}
                columns={2}
                items={[
                  { value: highCount, label: "High", tone: "danger" },
                  { value: mediumCount, label: "Medium", tone: "warning" },
                ]}
              />
            </SummaryCard>
            <SystemStatusPanel
              networkServices={data.networkServices}
              cctv={{
                cameraCount: data.settings.cameraCount,
                cameraFaultyCount: data.settings.cameraFaultyCount,
                cameraWaitingRepairCount: data.settings.cameraWaitingRepairCount,
                cameraRepairingCount: data.settings.cameraRepairingCount,
                cameraInstallingCount: data.settings.cameraInstallingCount,
              }}
            />
            <SummaryCard
              label="Today’s Focus"
            >
              <TodayFocus
                title={data.settings.focusTitle}
                detail={data.settings.focusDetail}
                linkedActivity={data.focusActivity}
                activities={Array.from(new Map(data.activities.map((activity) => [activity.id, {
                  id: activity.id,
                  content: activity.content,
                  section: activity.section,
                  completed: activity.completed,
                }])).values())}
              />
            </SummaryCard>
          </section>

          <section className="main-grid" aria-label="Projects and issues">
            <ProjectSection data={data} />
            <IssueSection data={data} />
          </section>

          <section className="activity-grid" aria-label="Other work and topics">
            <ActivityCard section="TODAY" title="Today Other Activities" data={data} />
            <ActivityCard section="YESTERDAY" title="Yesterday Other Activities" data={data} />
            <ActivityCard section="OTHER" title="Other Topics" data={data} />
          </section>

        </div>
      </section>
    </main>
  );
}

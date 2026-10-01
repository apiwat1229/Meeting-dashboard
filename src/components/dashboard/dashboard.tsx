import Link from "next/link";
import {
  CircleAlert,
  FolderKanban,
  ListTodo,
  Settings2,
} from "lucide-react";
import type { ReactNode } from "react";
import type { getDashboardData } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { ReportDatePicker } from "@/components/dashboard/report-date-picker";
import { AddIssueMenu } from "@/components/dashboard/add-issue-menu";
import { IssueEditor } from "@/components/dashboard/issue-editor";
import { ActivityEditor, AddActivityMenu } from "@/components/dashboard/activity-crud";
import { ActivityStatusIndicator } from "@/components/dashboard/activity-status-indicator";
import { AddProjectMenu, ProjectEditor } from "@/components/dashboard/project-crud";
import { ProjectSubtasks } from "@/components/dashboard/project-subtasks";
import { DailyRefresh } from "@/components/dashboard/daily-refresh";
import { FullScreenToggle } from "@/components/dashboard/full-screen-toggle";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type ProjectStatus = DashboardData["projects"][number]["status"];
type IssueRow = DashboardData["issues"][number];

function statusTone(status: ProjectStatus): "success" | "danger" | "finish" {
  if (status === "DELAY") return "danger";
  if (status === "FINISH") return "finish";
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
  items: Array<{ value: string | number; label: string; tone: "neutral" | "success" | "warning" | "danger" }>;
  label: string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div className={`summary-breakdown summary-breakdown-${columns}`} role="group" aria-label={label}>
      {items.map((item) => (
        <div className={`summary-breakdown-item summary-${item.tone}`} key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function ProjectRow({ project, tasks, index }: { project: DashboardData["projects"][number]; tasks: DashboardData["projectTasks"]; index: number }) {
  return (
    <ProjectEditor project={project} tasks={tasks}>
      <span className="project-index type-body" role="cell">{index + 1}.</span>
      <div className="project-name" role="cell"><ProjectSubtasks projectId={project.id} projectName={project.name} tasks={tasks} /></div>
      <span className="project-work type-body" role="cell">{project.yesterday || "—"}</span>
      <span className="project-work type-body" role="cell">{project.today || "—"}</span>
      <div className="project-progress-cell" role="cell">
        <Progress value={project.progress} tone={statusTone(project.status)} />
        <span className="progress-value type-caption">{project.progress}%</span>
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
              <div role="cell" aria-colspan={5}>
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
        <AddIssueMenu projects={data.projects.map(({ id, name }) => ({ id, name }))} />
      </div>
      <div className="issue-list">
        {data.issues.map((issue) => (
          <IssueEditor
            key={issue.id}
            className={`issue-item issue-${issueTone(issue)}`}
            issue={{
              id: issue.id,
              title: issue.title,
              projectId: issue.projectId,
              severity: issue.severity,
              state: issue.state,
              detail: issue.detail,
              nextStep: issue.nextStep,
              prevention: issue.prevention,
              projectName: issue.projectName,
              imageUrl: issue.imageUrl,
            }}
            projects={data.projects.map(({ id, name }) => ({ id, name }))}
          >
            <div className="issue-copy">
              <div className="issue-title-row">
                <strong className="type-body">{issue.title}</strong>
                {issue.projectName && <span className="issue-project type-caption">{issue.projectName}</span>}
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

  return (
    <Card className="activity-card">
      <div className="section-heading activity-heading">
        <div>
          <h2 className="type-h2">{title}</h2>
        </div>
        <AddActivityMenu section={section} />
      </div>
      <ul className="activity-list">
        {entries.map((activity) => (
          <ActivityEditor key={activity.id} activity={activity}>
            <ActivityStatusIndicator completed={activity.completed} />
            <span className="type-body">{activity.content}</span>
          </ActivityEditor>
        ))}
        {entries.length === 0 && (
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
  const camerasWorking = 135;
  const camerasFaulty = 0;

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
            <SummaryCard
              label="CCTV Status"
            >
              <SummaryBreakdown
                label={`${camerasWorking} cameras working normally, ${camerasFaulty} faulty cameras`}
                columns={2}
                items={[
                  { value: camerasWorking, label: "Working Normally", tone: "success" },
                  { value: camerasFaulty > 0 ? camerasFaulty : "-", label: "Faulty", tone: camerasFaulty > 0 ? "danger" : "neutral" },
                ]}
              />
            </SummaryCard>
            <SummaryCard
              label="Today’s Focus"
            >
              <div className="summary-focus">
                <strong>{data.settings.focusTitle}</strong>
                <span>{data.settings.focusDetail}</span>
              </div>
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

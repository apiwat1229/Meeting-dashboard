import Link from "next/link";
import {
  Check,
  CircleAlert,
  Pencil,
  Plus,
  Settings2,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  createActivityAction,
  createIssueAction,
  createProjectAction,
  toggleActivityAction,
  toggleIssueStateAction,
  updateProjectAction,
} from "@/app/actions";
import type { getDashboardData } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ReportDatePicker } from "@/components/dashboard/report-date-picker";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type ProjectStatus = DashboardData["projects"][number]["status"];
type IssueRow = DashboardData["issues"][number];

const statusInfo: Record<ProjectStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
  ON_TRACK: { label: "In Progress", tone: "success" },
  ATTENTION: { label: "Attention", tone: "warning" },
  DELAY: { label: "Delay", tone: "danger" },
};

function getReportDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function statusTone(status: ProjectStatus) {
  return statusInfo[status].tone;
}

function issueTone(issue: IssueRow) {
  if (issue.state === "CLOSED") return "success" as const;
  return issue.severity === "HIGH" ? "danger" as const : "warning" as const;
}

function issueLabel(issue: IssueRow) {
  if (issue.state === "CLOSED") return "Done";
  if (issue.severity === "HIGH") return "High";
  if (issue.severity === "MEDIUM") return "Med.";
  return "Low";
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
  columns?: 2 | 3;
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

function ProjectRow({ project }: { project: DashboardData["projects"][number] }) {
  const info = statusInfo[project.status];
  return (
    <div className="project-row">
      <strong className="project-name type-body">{project.name}</strong>
      <div className="project-status-cell">
        <Badge tone={info.tone} className="project-status-badge">{info.label}</Badge>
      </div>
      <span className="project-work type-body">{project.yesterday || "—"}</span>
      <span className="project-work type-body">{project.today || "—"}</span>
      <div className="project-progress-cell">
        <Progress value={project.progress} tone={statusTone(project.status)} />
        <span className="progress-value type-caption">{project.progress}%</span>
      </div>
      <details className="row-editor">
        <summary aria-label={`Edit ${project.name}`} title="Edit project">
          <Pencil size={15} />
        </summary>
        <form action={updateProjectAction} className="row-editor-form">
          <input type="hidden" name="id" value={project.id} />
          <label>
            Status
            <select name="status" defaultValue={project.status}>
              <option value="ON_TRACK">In Progress</option>
              <option value="ATTENTION">Attention</option>
              <option value="DELAY">Delay</option>
            </select>
          </label>
          <label>
            Progress %
            <input name="progress" type="number" min="0" max="100" defaultValue={project.progress} required />
          </label>
          <label>
            Yesterday
            <input name="yesterday" defaultValue={project.yesterday} maxLength={500} />
          </label>
          <label>
            Today
            <input name="today" defaultValue={project.today} maxLength={500} />
          </label>
          <Button type="submit">Save project</Button>
        </form>
      </details>
    </div>
  );
}

function ProjectSection({ data }: { data: DashboardData }) {
  return (
    <Card className="content-card project-card">
      <div className="section-heading project-heading">
        <div>
          <h2 className="type-h2">Active Projects</h2>
        </div>
        <details className="add-menu">
          <summary className="icon-button" aria-label="Add project" title="Add project"><Plus size={18} /></summary>
          <form action={createProjectAction} className="popover-form">
            <h3 className="type-h3">New project</h3>
            <label className="field-label">Project name<input name="name" minLength={2} maxLength={140} required placeholder="Project name" /></label>
            <div className="field-pair">
            <label className="field-label">Status<select name="status" defaultValue="ON_TRACK"><option value="ON_TRACK">In Progress</option><option value="ATTENTION">Attention</option><option value="DELAY">Delay</option></select></label>
              <label className="field-label">Progress %<input name="progress" type="number" min="0" max="100" defaultValue="0" required /></label>
            </div>
            <label className="field-label">Yesterday<input name="yesterday" maxLength={500} placeholder="Previous update" /></label>
            <label className="field-label">Today<input name="today" maxLength={500} placeholder="Today's next step" /></label>
            <Button type="submit"><Plus size={15} /> Save project</Button>
          </form>
        </details>
      </div>
      <div className="project-table" role="table" aria-label="Project progress">
        <div className="project-header type-caption" role="row">
          <span role="columnheader">Project</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Yesterday</span>
          <span role="columnheader">Today</span>
          <span role="columnheader">Progress</span>
          <span aria-hidden="true" />
        </div>
        <div className="project-body" role="rowgroup">
          {data.projects.map((project) => <ProjectRow key={project.id} project={project} />)}
          {data.projects.length === 0 && <p className="empty-state">No projects yet. Add the first one to start tracking progress.</p>}
        </div>
      </div>
    </Card>
  );
}

function IssueSection({ data }: { data: DashboardData }) {
  return (
    <Card className="content-card issue-card">
      <div className="section-heading issue-heading">
        <div>
          <h2 className="type-h2">Issues / Trouble</h2>
        </div>
        <details className="add-menu">
          <summary className="icon-button" title="Add issue" aria-label="Add issue"><Plus size={18} /></summary>
          <form action={createIssueAction} className="popover-form">
            <h3 className="type-h3">New issue</h3>
            <label className="field-label">Issue title<input name="title" minLength={3} maxLength={180} required placeholder="Short issue title" /></label>
            <div className="field-pair">
              <label className="field-label">Project<select name="projectId" defaultValue=""><option value="">No linked project</option>{data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
              <label className="field-label">Severity<select name="severity" defaultValue="MEDIUM"><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select></label>
            </div>
            <label className="field-label">Detail<input name="detail" maxLength={1000} placeholder="What is happening?" /></label>
            <label className="field-label">Next step<input name="nextStep" maxLength={500} placeholder="Owner / next action / due time" /></label>
            <Button type="submit"><Plus size={15} /> Save issue</Button>
          </form>
        </details>
      </div>
      <div className="issue-list">
        {data.issues.map((issue) => (
          <article className={`issue-item issue-${issueTone(issue)}`} key={issue.id}>
            <div className="issue-label"><Badge tone={issueTone(issue)}>{issueLabel(issue)}</Badge></div>
            <div className="issue-copy">
              <div className="issue-title-row">
                <strong className="type-body">{issue.title}</strong>
                {issue.projectName && <span className="issue-project type-caption">{issue.projectName}</span>}
              </div>
              <p className="issue-next-step type-caption">{issue.nextStep || issue.detail || "No update provided"}</p>
            </div>
            <form action={toggleIssueStateAction} className="issue-state-form">
              <input type="hidden" name="id" value={issue.id} />
              <input type="hidden" name="nextState" value={issue.state === "OPEN" ? "CLOSED" : "OPEN"} />
              <button type="submit" title={issue.state === "OPEN" ? "Mark done" : "Reopen issue"} aria-label={issue.state === "OPEN" ? "Mark issue done" : "Reopen issue"}>
                {issue.state === "OPEN" ? <Check size={16} /> : <CircleAlert size={16} />}
              </button>
            </form>
          </article>
        ))}
        {data.issues.length === 0 && <p className="empty-state">No issues reported. Add an item when a team needs help.</p>}
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
  const isYesterday = section === "YESTERDAY";

  return (
    <Card className="activity-card">
      <div className="section-heading activity-heading">
        <div>
          <h2 className="type-h2">{title}</h2>
        </div>
        <details className="add-menu">
          <summary className="icon-button" title="Add activity" aria-label={`Add item to ${title}`}><Plus size={18} /></summary>
          <form action={createActivityAction} className="popover-form activity-form">
            <h3 className="type-h3">Add activity</h3>
            <input type="hidden" name="section" value={section} />
            <label className="field-label">Description<input name="content" minLength={2} maxLength={220} required placeholder="Activity or shared topic" /></label>
            <Button type="submit"><Plus size={15} /> Add item</Button>
          </form>
        </details>
      </div>
      <ul className="activity-list">
        {entries.map((activity) => (
          <li className={activity.completed ? "activity-done" : ""} key={activity.id}>
            <form action={toggleActivityAction}>
              <input type="hidden" name="id" value={activity.id} />
              <input type="hidden" name="completed" value={String(!activity.completed)} />
              <button type="submit" aria-label={activity.completed ? `Mark ${activity.content} incomplete` : `Mark ${activity.content} complete`}>
                {activity.completed ? <Check size={15} /> : <span className="activity-bullet" />}
              </button>
            </form>
            <span className="type-body">{activity.content}</span>
          </li>
        ))}
        {entries.length === 0 && <li className="empty-state">No items added yet.</li>}
      </ul>
    </Card>
  );
}

export function Dashboard({ data }: { data: DashboardData }) {
  const delayCount = data.projects.filter((project) => project.status === "DELAY").length;
  const inProgressCount = data.projects.length - delayCount;
  const openIssues = data.issues.filter((issue) => issue.state === "OPEN");
  const highCount = openIssues.filter((issue) => issue.severity === "HIGH").length;
  const mediumCount = openIssues.filter((issue) => issue.severity === "MEDIUM").length;
  const camerasWorking = 135;
  const camerasFaulty = 0;

  return (
    <main className="page-shell">
      <section className="dashboard-frame" aria-label="IT morning dashboard">
        <header className="dashboard-topbar">
          <div className="dashboard-name">
            <h2 className="type-h2">IT Daily Status &amp; Operations Summary</h2>
          </div>
          <div className="report-meta type-caption">
            <ReportDatePicker initialDateKey={getReportDateKey()} />
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

import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  HandHeart,
  Leaf,
  ListTodo,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/auth-actions";
import type { getDashboardData } from "@/lib/data";
import type { DepartmentSummary } from "@/lib/dashboard-scope";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ActivityCreateProvider, ActivityEditor, AddActivityMenu } from "@/components/dashboard/activity-crud";
import { CsrActivityPhotos } from "@/components/dashboard/csr-activity-photos";
import { CsrPhotoGallery } from "@/components/dashboard/csr-photo-gallery";
import { AddIssueMenu } from "@/components/dashboard/add-issue-menu";
import { DailyRefresh } from "@/components/dashboard/daily-refresh";
import { FullScreenToggle } from "@/components/dashboard/full-screen-toggle";
import { IssueEditor } from "@/components/dashboard/issue-editor";
import { ProjectDailyUpdateDisplay } from "@/components/dashboard/project-subtasks";
import { ProjectScheduleDate } from "@/components/dashboard/project-schedule-date";
import { AddProjectMenu, ProjectCreateProvider, ProjectEditor } from "@/components/dashboard/project-crud";
import { ReportDatePicker } from "@/components/dashboard/report-date-picker";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type Workstream = "CSR" | "GA" | "SUPPORT" | "GENERAL";

const workstreams: Array<{ key: Workstream; title: string; description: string; icon: typeof HandHeart }> = [
  { key: "CSR", title: "CSR & Community", description: "Farmer engagement, community support, donations, and environmental projects.", icon: HandHeart },
  { key: "GA", title: "GA, Grounds & Safety", description: "Gardens, resident patrols, waste, pond care, and site follow-up.", icon: Leaf },
  { key: "SUPPORT", title: "Support & Coordination", description: "Daily coordination, purchasing, utilities, and meeting support.", icon: ClipboardCheck },
];

function MetricCard({ icon: Icon, value, label, detail, tone }: {
  icon: typeof HandHeart;
  value: number;
  label: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "violet";
}) {
  return (
    <Card className={`csr-metric-card csr-metric-${tone}`}>
      <span className="csr-metric-icon"><Icon size={18} aria-hidden="true" /></span>
      <span className="csr-metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </Card>
  );
}

function ActivityPanel({ category, title, description, icon: Icon, data, subdued = false }: {
  category: Workstream;
  title: string;
  description: string;
  icon: typeof HandHeart;
  data: DashboardData;
  subdued?: boolean;
}) {
  const todayEntries = data.activities.filter(
    (activity): activity is (typeof data.activities)[number] & { section: "TODAY" } => activity.category === category && activity.section === "TODAY",
  );
  const yesterdayCount = data.activities.filter((activity) => activity.category === category && activity.section === "YESTERDAY").length;

  return (
    <ActivityCreateProvider section="TODAY" category={category} supplierNames={data.supplierNames}>
      <Card className={`csr-panel csr-workstream-panel${subdued ? " csr-workstream-subdued" : ""} csr-workstream-${category.toLowerCase()}`}>
        <div className="csr-panel-heading">
          <span className="csr-panel-icon"><Icon size={18} aria-hidden="true" /></span>
          <div className="csr-panel-title-copy">
            <h2 className="type-h2">{title}</h2>
            <p>{description}</p>
          </div>
          <span className="csr-panel-count" aria-label={`${todayEntries.length} activities today`}>{todayEntries.length}</span>
          <AddActivityMenu><span className="csr-add-activity" aria-label={`Add ${title} activity`}><Plus size={17} aria-hidden="true" /></span></AddActivityMenu>
        </div>
        <ul className="csr-activity-list">
          {todayEntries.map((activity) => (
            <ActivityEditor
              key={activity.id}
              activity={activity}
              supplierNames={data.supplierNames}
              relatedIssues={data.issues.filter((issue) => issue.relatedActivityId === activity.id).map(({ id, title: issueTitle, severity, state }) => ({ id, title: issueTitle, severity, state }))}
            >
              <span className="csr-activity-copy">
                <strong>{activity.content}</strong>
                {activity.description && <small>{activity.description}</small>}
                <CsrActivityPhotos
                  activityTitle={activity.content}
                  photos={[
                    ...activity.media.map((photo) => ({ ...photo, phase: "Activity" as const })),
                    ...activity.beforeMedia.map((photo) => ({ ...photo, phase: "Before" as const })),
                    ...activity.afterMedia.map((photo) => ({ ...photo, phase: "After" as const })),
                  ]}
                />
              </span>
              {activity.isCarryover && <span className="csr-activity-tag">From yesterday</span>}
              <span className={`csr-activity-progress${activity.completed ? " is-complete" : ""}`}>
                {activity.completed ? <><CheckCircle2 size={13} aria-hidden="true" /> Done</> : `${activity.progress}%`}
              </span>
            </ActivityEditor>
          ))}
          {todayEntries.length === 0 && (
            <li className="csr-empty-row">
              <Empty className="dashboard-empty">
                <EmptyMedia variant="icon"><ListTodo size={16} /></EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No activities for today</EmptyTitle>
                  <EmptyDescription>Add the day’s work here so CSR and GA stay easy to follow.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </li>
          )}
        </ul>
        {yesterdayCount > 0 && <p className="csr-yesterday-note">{yesterdayCount} item{yesterdayCount === 1 ? "" : "s"} recorded yesterday</p>}
      </Card>
    </ActivityCreateProvider>
  );
}

function ProjectsPanel({ data }: { data: DashboardData }) {
  const completed = data.projects.filter((project) => project.status === "FINISH" || project.progress >= 100).length;

  return (
    <ProjectCreateProvider>
      <Card className="csr-panel csr-programs-panel">
        <div className="csr-panel-heading csr-program-heading">
          <span className="csr-panel-icon"><Sparkles size={18} aria-hidden="true" /></span>
          <div className="csr-panel-title-copy">
            <h2 className="type-h2">CSR Programs &amp; Commitments</h2>
            <p>Programs, planned actions, target dates, and progress.</p>
          </div>
          <span className="csr-program-summary">{completed} of {data.projects.length} complete</span>
          <AddProjectMenu><span className="csr-add-activity" aria-label="Add a CSR program"><Plus size={17} aria-hidden="true" /></span></AddProjectMenu>
        </div>
        <div className="csr-project-table-scroll">
          <table className="csr-project-table" aria-label="CSR programs and commitments">
            <thead>
              <tr><th scope="col">Program</th><th scope="col">Latest action</th><th scope="col">Schedule</th><th scope="col">Progress</th></tr>
            </thead>
            <tbody>
              {data.projects.map((project) => {
                const tasks = data.projectTasks.filter((task) => task.projectId === project.id);
                const dates = data.projectDateChanges.filter((change) => change.projectSeriesId === project.projectSeriesId);
                const statusLabel = project.status === "DELAY" ? "Delayed" : project.status === "ATTENTION" ? "Needs attention" : project.status === "FINISH" || project.progress >= 100 ? "Complete" : "On schedule";
                const statusTone = project.status === "ON_TRACK" ? "on-track" : project.status.toLowerCase();
                return (
                  <ProjectEditor key={project.id} project={project} tasks={tasks}>
                    <td><strong className="csr-project-name">{project.name}</strong><span className="csr-project-status-group"><span className={`csr-project-status status-${statusTone}`}>{statusLabel}</span>{project.isRescheduled && <span className="csr-project-status status-rescheduled">Rescheduled</span>}</span></td>
                    <td><ProjectDailyUpdateDisplay projectName={project.name} title="Today" value={project.today} /></td>
                    <td><div className="csr-project-schedule"><ProjectScheduleDate dateKey={project.startDate} changes={dates.filter((change) => change.field === "startDate")} label="Start" icon="start" /><ProjectScheduleDate dateKey={project.endDate} changes={dates.filter((change) => change.field === "endDate")} label="Finish" icon="finish" /></div></td>
                    <td><div className="csr-progress-value">{project.progress}%</div><div className="csr-progress-track"><span style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} /></div></td>
                  </ProjectEditor>
                );
              })}
              {data.projects.length === 0 && <tr><td colSpan={4} className="csr-table-empty">No CSR programs yet. Add a program to start tracking commitments.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </ProjectCreateProvider>
  );
}

function FollowUpsPanel({ data }: { data: DashboardData }) {
  const openIssues = data.issues.filter((issue) => issue.state === "OPEN");
  const issueActivities = [...new Map(data.activities.filter((activity) => activity.section === "TODAY").map((activity) => [activity.id, activity])).values()]
    .map(({ id, content }) => ({ id, content, section: "TODAY" as const }));
  const projects = data.projects.map(({ id, name }) => ({ id, name }));

  return (
    <Card className="csr-panel csr-followups-panel">
      <div className="csr-panel-heading">
        <span className="csr-panel-icon csr-panel-icon-amber"><ShieldCheck size={18} aria-hidden="true" /></span>
        <div className="csr-panel-title-copy">
          <h2 className="type-h2">Site Follow-ups &amp; Safety</h2>
          <p>Open findings that need an owner or next action.</p>
        </div>
        <span className="csr-panel-count" aria-label={`${openIssues.length} open follow-ups`}>{openIssues.length}</span>
        <AddIssueMenu projects={projects} activities={issueActivities} />
      </div>
      <div className="csr-followup-list">
        {openIssues.map((issue) => (
          <IssueEditor key={issue.id} issue={issue} projects={projects} activities={issueActivities} className={`csr-followup-item csr-followup-${issue.severity.toLowerCase()}`}>
            <span className={`csr-followup-dot csr-followup-dot-${issue.severity.toLowerCase()}`} aria-hidden="true" />
            <div className="csr-followup-copy">
              <strong>{issue.title}</strong>
              {issue.nextStep && <small>{issue.nextStep}</small>}
              {issue.relatedActivityTitle && <span>Related: {issue.relatedActivityTitle}</span>}
            </div>
            <span className="csr-followup-severity">{issue.severity === "HIGH" ? "High" : "Follow-up"}</span>
          </IssueEditor>
        ))}
        {openIssues.length === 0 && (
          <div className="csr-followup-empty"><CheckCircle2 size={19} aria-hidden="true" /><div><strong>No open follow-ups</strong><span>New site findings can be recorded here.</span></div></div>
        )}
      </div>
      <div className="csr-followup-footer"><CircleAlert size={14} aria-hidden="true" /> {data.issues.filter((issue) => issue.state === "CLOSED").length} closed for this report</div>
    </Card>
  );
}

export function CsrGaDashboard({
  data,
  isAdministrator,
  currentDepartmentCode,
  currentDepartmentName,
  availableDepartments,
}: {
  data: DashboardData;
  isAdministrator: boolean;
  currentDepartmentCode: string;
  currentDepartmentName: string;
  availableDepartments: DepartmentSummary[];
}) {
  const todayActivities = data.activities.filter((activity) => activity.section === "TODAY");
  const activePrograms = data.projects.filter((project) => project.status !== "FINISH" && project.progress < 100).length;
  const completeToday = todayActivities.filter((activity) => activity.completed).length;
  const csrToday = todayActivities.filter((activity) => activity.category === "CSR").length;
  const gaToday = todayActivities.filter((activity) => activity.category === "GA").length;
  const supportToday = todayActivities.filter((activity) => activity.category === "SUPPORT").length;
  const openFollowups = data.issues.filter((issue) => issue.state === "OPEN").length;

  return (
    <main className="page-shell">
      <DailyRefresh initialDateKey={data.reportDateKey} />
      <section className="dashboard-frame csr-dashboard-frame" aria-label={`${currentDepartmentName} department dashboard`}>
        <div className="dashboard-content csr-dashboard-content">
          <section className="csr-welcome-band">
            <div className="csr-welcome-icon"><HandHeart size={22} aria-hidden="true" /></div>
            <div className="csr-welcome-copy">
              <p className="csr-eyebrow">{currentDepartmentName.toUpperCase()} · DAILY OPERATIONS</p>
              <h1>People, place, and progress</h1>
            </div>
            <div className="csr-welcome-controls report-meta type-caption" role="group" aria-label="Dashboard controls">
              {isAdministrator && availableDepartments.length > 1 && (
                <form className="dashboard-department-switcher" action="/" method="get">
                  <input type="hidden" name="date" value={data.reportDateKey} />
                  <label htmlFor="dashboard-department"><Building2 size={15} aria-hidden="true" /><span className="sr-only">Department</span></label>
                  <select id="dashboard-department" name="department" defaultValue={currentDepartmentCode} aria-label="Choose department">
                    {availableDepartments.map((department) => <option key={department.id} value={department.code}>{department.name}</option>)}
                  </select>
                  <button className="button button-secondary" type="submit">Open</button>
                </form>
              )}
              <ReportDatePicker initialDateKey={data.reportDateKey} departmentCode={currentDepartmentCode} />
              {isAdministrator && <Link className="button button-secondary dashboard-admin-link" href="/admin/users" title="Manage users and departments"><Users size={17} aria-hidden="true" /><span>Users</span></Link>}
              <FullScreenToggle />
              <form action={logoutAction}><button className="button button-secondary dashboard-logout-button" type="submit" title="Log out" aria-label="Log out"><LogOut size={17} aria-hidden="true" /></button></form>
            </div>
          </section>

          <section className="csr-metrics-grid" aria-label="Department daily summary">
            <MetricCard icon={Sparkles} value={activePrograms} label="Active programs" detail={`${data.projects.length} total commitments`} tone="blue" />
            <MetricCard icon={HandHeart} value={csrToday} label="CSR activities" detail={`${completeToday} of ${todayActivities.length} activities complete`} tone="green" />
            <MetricCard icon={Leaf} value={gaToday} label="GA & site care" detail={`${supportToday} support activities today`} tone="amber" />
            <MetricCard icon={CircleAlert} value={openFollowups} label="Open follow-ups" detail={`${data.issues.filter((issue) => issue.state === "CLOSED").length} closed this report`} tone="violet" />
          </section>

          <section className="csr-primary-grid" aria-label="Programs and follow-ups">
            <ProjectsPanel data={data} />
            <FollowUpsPanel data={data} />
          </section>

            <CsrPhotoGallery activities={data.recentPhotoActivities} />

          <section className="csr-workstream-grid" aria-label="Today by work area">
            {workstreams.map(({ key: category, ...workstream }) => <ActivityPanel key={category} category={category} {...workstream} data={data} />)}
          </section>

          <ActivityPanel
            category="GENERAL"
            title="Other / Unclassified Activities"
            description="Older entries default here until someone assigns them to a work area."
            icon={ArrowDownRight}
            data={data}
            subdued
          />
          <p className="csr-data-note"><ArrowUpRight size={14} aria-hidden="true" /> Counts are calculated from this department’s selected daily report. No activity or impact figures are added unless entered by the team.</p>
        </div>
      </section>
    </main>
  );
}

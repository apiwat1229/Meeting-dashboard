"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { createProjectAction, deleteProjectAction, updateProjectAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxSelect, MultiComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ProjectDetailsDialog } from "@/components/dashboard/detail-dialogs";
import { DatePickerField } from "@/components/dashboard/date-picker-field";

type ProjectTaskData = {
  id: number;
  projectId: number;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  startDate: string | null;
  endDate: string | null;
};

const projectStatusOptions = [
  { value: "ON_TRACK", label: "In Progress" },
  { value: "DELAY", label: "Delay" },
  { value: "FINISH", label: "Finish" },
];

function taskIdsForDailyUpdate(value: string, tasks: ProjectTaskData[]) {
  const taskIdsByTitle = new Map<string, number[]>();
  for (const task of tasks) {
    taskIdsByTitle.set(task.title, [...(taskIdsByTitle.get(task.title) ?? []), task.id]);
  }

  return value.split(/\r?\n/).flatMap((title) => {
    const matches = taskIdsByTitle.get(title);
    const id = matches?.shift();
    return id === undefined ? [] : [id];
  });
}

function ProjectDailyUpdateEditor({
  projectId,
  field,
  title,
  value,
  onChange,
  tasks,
  placeholder,
}: {
  projectId: number;
  field: "yesterday" | "today";
  title: "Yesterday" | "Today";
  value: string;
  onChange: (value: string) => void;
  tasks: ProjectTaskData[];
  placeholder: string;
}) {
  const taskOptions = tasks.map((task) => ({ value: String(task.id), label: task.title }));
  const selectedTaskIds = taskIdsForDailyUpdate(value, tasks).map(String);

  return (
    <div className="project-edit-daily-field">
      <label className="field-label" htmlFor={`project-${projectId}-${field}-update`}>{title}</label>
      <span className="project-edit-daily-picker-label">Select subtasks</span>
      <MultiComboboxSelect
        options={taskOptions}
        value={selectedTaskIds}
        onValueChange={(values) => {
          const nextValue = values
            .map((taskId) => tasks.find((task) => String(task.id) === taskId)?.title)
            .filter((taskTitle): taskTitle is string => taskTitle !== undefined)
            .join("\n");
          onChange(nextValue);
        }}
        ariaLabel={`Select subtasks for ${title.toLowerCase()}`}
        placeholder={tasks.length > 0 ? "Choose subtasks" : "No subtasks available"}
        searchPlaceholder={`Search ${title.toLowerCase()} subtasks`}
        emptyMessage="No subtasks found."
        disabled={tasks.length === 0}
        className="project-edit-daily-task-picker"
      />
      <Textarea
        id={`project-${projectId}-${field}-update`}
        name={field}
        maxLength={500}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
      />
      {tasks.length === 0 && <span className="project-edit-daily-hint">Add subtasks in project details to select them here.</span>}
    </div>
  );
}

type ProjectStatus = "ON_TRACK" | "ATTENTION" | "DELAY" | "FINISH";

type ProjectData = {
  id: number;
  name: string;
  status: ProjectStatus;
  progress: number;
  yesterday: string;
  today: string;
  startDate: string | null;
  endDate: string | null;
};

const ProjectCreateContext = createContext<{ open: boolean; openCreateProject: () => void } | null>(null);

function useProjectCreateContext() {
  const context = useContext(ProjectCreateContext);
  if (!context) throw new Error("Project controls must be inside ProjectCreateProvider.");
  return context;
}

export function ProjectCreateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  async function handleCreate(formData: FormData) {
    const result = await createProjectAction(formData);
    if (result.ok) {
      toast.success(result.message);
      setOpen(false);
    } else {
      toast.error(result.message);
    }
  }

  return (
    <ProjectCreateContext.Provider value={{ open, openCreateProject: () => setOpen(true) }}>
      <Popover open={open} onOpenChange={setOpen}>
        {children}
        <PopoverContent className="crud-popover" align="end">
          <div className="crud-popover-heading">
            <h3 className="type-h3">New project</h3>
            <Button type="button" variant="ghost" className="icon-button" onClick={() => setOpen(false)} aria-label="Close project form" title="Close"><X size={17} /></Button>
          </div>
          <form action={handleCreate} className="crud-form">
            <label className="field-label">Project name<Input name="name" minLength={2} maxLength={140} required placeholder="Project name" /></label>
            <div className="field-pair">
              <label className="field-label">Status
                <ComboboxSelect name="status" options={projectStatusOptions} defaultValue="ON_TRACK" />
              </label>
              <label className="field-label">Progress %<Input name="progress" type="number" min="0" max="100" defaultValue="0" required /></label>
            </div>
            <div className="field-pair date-field-pair">
              <DatePickerField label="Start Date" name="startDate" />
              <DatePickerField label="End Date" name="endDate" />
            </div>
            <Button type="submit"><Plus size={15} /> Save project</Button>
          </form>
        </PopoverContent>
      </Popover>
    </ProjectCreateContext.Provider>
  );
}

export function AddProjectMenu({ children }: { children: ReactNode }) {
  const { open } = useProjectCreateContext();

  return (
    <PopoverTrigger className="today-focus-title-trigger" aria-haspopup="dialog" aria-expanded={open}>
      {children}
    </PopoverTrigger>
  );
}

export function ProjectEditor({ project, tasks, children }: { project: ProjectData; tasks: ProjectTaskData[]; children: ReactNode }) {
  const { openCreateProject } = useProjectCreateContext();
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [yesterday, setYesterday] = useState(project.yesterday);
  const [today, setToday] = useState(project.today);

  useEffect(() => {
    if (!open) return;
    setYesterday(project.yesterday);
    setToday(project.today);
  }, [open, project.id, project.yesterday, project.today]);

  async function saveProject(formData: FormData) {
    setPending(true);
    try {
      const result = await updateProjectAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not update the project.");
    } finally {
      setPending(false);
    }
  }

  async function deleteProject() {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("id", String(project.id));
      const result = await deleteProjectAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not delete the project.");
    } finally {
      setPending(false);
      setConfirmDelete(false);
    }
  }

  return (
    <ContextMenu as="tr" className="project-row" role="row" ariaLabel={`Project ${project.name}`} onActivate={() => {
      setOpen(false);
      setConfirmDelete(false);
      setDetailsOpen(true);
    }} onEdit={() => {
      setDetailsOpen(false);
      setOpen(true);
    }} onDelete={() => {
      setOpen(false);
      setDetailsOpen(false);
      setConfirmDelete(true);
    }} onCreate={openCreateProject} createLabel="New project">
      {children}
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen && confirmDelete) return;
        setOpen(nextOpen);
      }}>
        <DialogContent className="detail-dialog-content project-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Edit project</DialogTitle>
              <DialogDescription>Update the project schedule, status, progress, and daily work.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close project editor"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void saveProject(new FormData(event.currentTarget)); }} className="project-edit-form">
            <input type="hidden" name="id" value={project.id} />
            <div className="project-edit-layout">
              <div className="project-edit-main">
                <section className="project-edit-card project-edit-fields">
                  <h3>Project information</h3>
                  <label className="field-label">Project name<Input name="name" minLength={2} maxLength={140} defaultValue={project.name} required /></label>
                  <div className="field-pair">
                    <label className="field-label">Status
                      <ComboboxSelect name="status" options={projectStatusOptions} defaultValue={project.status === "ATTENTION" ? "ON_TRACK" : project.status} />
                    </label>
                    <label className="field-label">Progress %<Input name="progress" type="number" min="0" max="100" defaultValue={project.progress} required /></label>
                  </div>
                  <div className="field-pair date-field-pair">
                    <DatePickerField label="Start Date" name="startDate" defaultValue={project.startDate} />
                    <DatePickerField label="End Date" name="endDate" defaultValue={project.endDate} />
                  </div>
                </section>
                <section className="project-edit-card project-edit-progress-card">
                  <div className="project-detail-progress-heading"><h3>Current progress</h3><strong>{project.progress}%</strong></div>
                  <Progress value={project.progress} tone={project.status === "DELAY" ? "danger" : project.status === "FINISH" ? "finish" : project.status === "ATTENTION" ? "warning" : "success"} />
                  <p>{project.name}</p>
                </section>
              </div>
              <aside className="project-edit-side">
                <section className="project-edit-card project-edit-updates">
                  <h3>Daily updates</h3>
                  <ProjectDailyUpdateEditor projectId={project.id} field="yesterday" title="Yesterday" value={yesterday} onChange={setYesterday} tasks={tasks} placeholder="What was completed yesterday?" />
                  <ProjectDailyUpdateEditor projectId={project.id} field="today" title="Today" value={today} onChange={setToday} tasks={tasks} placeholder="What is planned for today?" />
                </section>
              </aside>
            </div>
            <div className="project-edit-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmActionDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this project?"
        description={`Delete “${project.name}”? Linked issues will be kept without a project.`}
        actionLabel="Delete project"
        destructive
        pending={pending}
        onConfirm={() => { void deleteProject(); }}
      />
      <ProjectDetailsDialog project={{ ...project, tasks }} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </ContextMenu>
  );
}

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { createProjectAction, deleteProjectAction, updateProjectAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxSelect, MultiComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ProjectDetailsDialog } from "@/components/dashboard/detail-dialogs";
import { ProjectTaskManager } from "@/components/dashboard/project-subtasks";
import { DatePickerField } from "@/components/dashboard/date-picker-field";

type ProjectTaskData = {
  id: number;
  projectId: number;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  startDate: string | null;
  endDate: string | null;
};

type ProjectTaskOption = { id: number | string; title: string };

const projectStatusOptions = [
  { value: "ON_TRACK", label: "In Progress" },
  { value: "DELAY", label: "Delay" },
  { value: "FINISH", label: "Finish" },
];

function taskIdsForDailyUpdate(value: string, tasks: ProjectTaskOption[]) {
  const taskIdsByTitle = new Map<string, string[]>();
  for (const task of tasks) {
    taskIdsByTitle.set(task.title, [...(taskIdsByTitle.get(task.title) ?? []), String(task.id)]);
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
  emptyHint,
}: {
  projectId: number;
  field: "yesterday" | "today";
  title: "Yesterday" | "Today";
  value: string;
  onChange: (value: string) => void;
  tasks: ProjectTaskOption[];
  placeholder: string;
  emptyHint?: string;
}) {
  const availableTasks = tasks.filter((task) => task.title.trim().length > 0);
  const taskOptions = availableTasks.map((task) => ({ value: String(task.id), label: task.title }));
  const selectedTaskIds = taskIdsForDailyUpdate(value, availableTasks);

  return (
    <div className="project-edit-daily-field">
      <label className="field-label" htmlFor={`project-${projectId}-${field}-update`}>{title}</label>
      <span className="project-edit-daily-picker-label">Select subtasks</span>
      {availableTasks.length > 0 ? (
        <MultiComboboxSelect
          options={taskOptions}
          value={selectedTaskIds}
          onValueChange={(values) => {
            const nextValue = values
              .map((taskId) => availableTasks.find((task) => String(task.id) === taskId)?.title)
              .filter((taskTitle): taskTitle is string => taskTitle !== undefined)
              .join("\n");
            onChange(nextValue);
          }}
          ariaLabel={`Select subtasks for ${title.toLowerCase()}`}
          placeholder="Choose subtasks"
          searchPlaceholder={`Search ${title.toLowerCase()} subtasks`}
          emptyMessage="No subtasks found."
          className="project-edit-daily-task-picker"
        />
      ) : (
        <div className="project-edit-empty-task-picker" aria-disabled="true">No subtasks available</div>
      )}
      <Textarea
        id={`project-${projectId}-${field}-update`}
        name={field}
        maxLength={500}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
      />
      {availableTasks.length === 0 && <span className="project-edit-daily-hint">{emptyHint ?? "Add subtasks in project details to select them here."}</span>}
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

type NewProjectSubtask = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  startDate: string;
  endDate: string;
};

const projectTaskStatusOptions = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
] as const;

const ProjectCreateContext = createContext<{ open: boolean; openCreateProject: () => void } | null>(null);

function useProjectCreateContext() {
  const context = useContext(ProjectCreateContext);
  if (!context) throw new Error("Project controls must be inside ProjectCreateProvider.");
  return context;
}

function ProjectFormFields({ project, tasks, yesterday, today, onYesterdayChange, onTodayChange, newSubtasks, onNewSubtasksChange, showCreateExtras = true }: {
  project: ProjectData | null;
  tasks: ProjectTaskData[];
  yesterday: string;
  today: string;
  onYesterdayChange: (value: string) => void;
  onTodayChange: (value: string) => void;
  newSubtasks: NewProjectSubtask[];
  onNewSubtasksChange: (subtasks: NewProjectSubtask[]) => void;
  showCreateExtras?: boolean;
}) {
  const dailyTasks: ProjectTaskOption[] = project ? tasks : newSubtasks.map(({ id, title }) => ({ id, title }));

  return (
    <div className={`project-edit-layout project-form-layout${!project && !showCreateExtras ? " project-form-layout-basic" : ""}`}>
      <div className="project-edit-main">
        <section className="project-edit-card project-edit-fields">
          <h3>Project information</h3>
          <label className="field-label">Project name
            <Input name="name" minLength={2} maxLength={140} defaultValue={project?.name ?? ""} required placeholder="Project name" />
          </label>
          <div className="field-pair">
            <label className="field-label">Status
              <ComboboxSelect name="status" options={projectStatusOptions} defaultValue={!project || project.status === "ATTENTION" ? "ON_TRACK" : project.status} />
            </label>
            <label className="field-label">Progress %
              <Input name="progress" type="number" min="0" max="100" defaultValue={project?.progress ?? 0} required />
            </label>
          </div>
          <div className="field-pair date-field-pair">
            <DatePickerField label="Start Date" name="startDate" defaultValue={project?.startDate ?? null} />
            <DatePickerField label="End Date" name="endDate" defaultValue={project?.endDate ?? null} />
          </div>
        </section>
        {!project && showCreateExtras && (
          <section className="project-edit-card project-create-subtasks">
            <div className="project-create-subtasks-heading">
              <div>
                <h3>Subtasks</h3>
                <p>Add tasks to this project now, or add them later.</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => onNewSubtasksChange([...newSubtasks, {
                id: crypto.randomUUID(),
                title: "",
                status: "TODO",
                startDate: "",
                endDate: "",
              }])} disabled={newSubtasks.length >= 100}>
                <Plus size={15} aria-hidden="true" /> Add subtask
              </Button>
            </div>
            {newSubtasks.length > 0 ? (
              <div className="project-create-subtask-list">
                {newSubtasks.map((subtask, index) => (
                  <fieldset className="project-create-subtask" key={subtask.id}>
                    <legend>Subtask {index + 1}</legend>
                    <button
                      type="button"
                      className="project-create-subtask-remove"
                      aria-label={`Remove subtask ${index + 1}`}
                      onClick={() => onNewSubtasksChange(newSubtasks.filter((item) => item.id !== subtask.id))}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                    <label className="field-label project-create-subtask-title">Task name
                      <Input required minLength={2} maxLength={220} value={subtask.title} onChange={(event) => onNewSubtasksChange(newSubtasks.map((item) => item.id === subtask.id ? { ...item, title: event.currentTarget.value } : item))} placeholder="Enter a subtask" />
                    </label>
                    <label className="field-label">Start date
                      <Input type="date" value={subtask.startDate} onChange={(event) => onNewSubtasksChange(newSubtasks.map((item) => item.id === subtask.id ? { ...item, startDate: event.currentTarget.value } : item))} />
                    </label>
                    <label className="field-label">End date
                      <Input type="date" min={subtask.startDate || undefined} value={subtask.endDate} onChange={(event) => onNewSubtasksChange(newSubtasks.map((item) => item.id === subtask.id ? { ...item, endDate: event.currentTarget.value } : item))} />
                    </label>
                    <label className="field-label project-create-subtask-status">Status
                      <ComboboxSelect
                        options={projectTaskStatusOptions}
                        value={subtask.status}
                        onValueChange={(value) => {
                          if (value === "TODO" || value === "IN_PROGRESS" || value === "DONE") {
                            onNewSubtasksChange(newSubtasks.map((item) => item.id === subtask.id ? { ...item, status: value } : item));
                          }
                        }}
                      />
                    </label>
                  </fieldset>
                ))}
              </div>
            ) : (
              <p className="project-create-subtasks-empty">No subtasks added yet.</p>
            )}
          </section>
        )}
      </div>
      {(project || showCreateExtras) && (
        <section className="project-edit-card project-edit-updates">
          <h3>Daily updates</h3>
          <ProjectDailyUpdateEditor projectId={project?.id ?? 0} field="yesterday" title="Yesterday" value={yesterday} onChange={onYesterdayChange} tasks={dailyTasks} placeholder="What was completed yesterday?" emptyHint={project ? undefined : "Add subtasks above to select them here."} />
          <ProjectDailyUpdateEditor projectId={project?.id ?? 0} field="today" title="Today" value={today} onChange={onTodayChange} tasks={dailyTasks} placeholder="What is planned for today?" emptyHint={project ? undefined : "Add subtasks above to select them here."} />
        </section>
      )}
    </div>
  );
}

export function ProjectCreateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [yesterday, setYesterday] = useState("");
  const [today, setToday] = useState("");
  const [newSubtasks, setNewSubtasks] = useState<NewProjectSubtask[]>([]);

  function openCreateProject() {
    setYesterday("");
    setToday("");
    setNewSubtasks([]);
    setOpen(true);
  }

  async function handleCreate(formData: FormData) {
    try {
      const result = await createProjectAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not add the project.");
    }
  }

  return (
    <ProjectCreateContext.Provider value={{ open, openCreateProject }}>
      <Dialog open={open} onOpenChange={setOpen}>
        {children}
        <DialogContent className="detail-dialog-content project-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>Set the project schedule, status, and progress.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close project form"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void handleCreate(new FormData(event.currentTarget)); }} className="project-edit-form">
            <input type="hidden" name="subtasks" value={JSON.stringify(newSubtasks.map(({ id: _id, ...subtask }) => subtask))} />
            <ProjectFormFields project={null} tasks={[]} yesterday={yesterday} today={today} onYesterdayChange={setYesterday} onTodayChange={setToday} newSubtasks={newSubtasks} onNewSubtasksChange={setNewSubtasks} showCreateExtras={false} />
            <div className="project-edit-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit"><Plus size={15} aria-hidden="true" /> Create project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ProjectCreateContext.Provider>
  );
}

export function AddProjectMenu({ children }: { children: ReactNode }) {
  const { open } = useProjectCreateContext();

  return (
    <DialogTrigger className="today-focus-title-trigger" aria-haspopup="dialog" aria-expanded={open}>
      {children}
    </DialogTrigger>
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

  const formId = `project-edit-form-${project.id}`;

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
              <DialogDescription>Edit project details, daily updates, and timeline steps.</DialogDescription>
            </div>
              <DialogClose className="icon-button project-tasks-close" aria-label="Close project editor"><X size={17} /></DialogClose>
          </div>
          <form id={formId} onSubmit={(event) => { event.preventDefault(); void saveProject(new FormData(event.currentTarget)); }} className="project-edit-form">
            <input type="hidden" name="id" value={project.id} />
            <ProjectFormFields project={project} tasks={tasks} yesterday={yesterday} today={today} onYesterdayChange={setYesterday} onTodayChange={setToday} newSubtasks={[]} onNewSubtasksChange={() => undefined} />
          </form>
          <ProjectTaskManager projectId={project.id} projectName={project.name} tasks={tasks} />
          <div className="project-edit-actions">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form={formId} disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
          </div>
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

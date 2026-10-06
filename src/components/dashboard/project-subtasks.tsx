"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ListTodo, Pencil, Plus, Trash2, X } from "lucide-react";
import { createProjectTaskAction, deleteProjectTaskAction, updateProjectDailyAction, updateProjectTaskAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ComboboxSelect, MultiComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type ProjectTask = {
  id: number;
  projectId: number;
  title: string;
  status: TaskStatus;
  startDate: string | null;
  endDate: string | null;
};

function dailyUpdateTaskIds(value: string, tasks: Array<Pick<ProjectTask, "id" | "title">>) {
  const taskIdsByTitle = new Map<string, number[]>();
  for (const task of tasks) {
    taskIdsByTitle.set(task.title, [...(taskIdsByTitle.get(task.title) ?? []), task.id]);
  }

  return value.split(/\r?\n/).flatMap((title) => {
    const matches = taskIdsByTitle.get(title);
    const id = matches?.shift();
    return id === undefined ? [] : [String(id)];
  });
}

export function ProjectDailyUpdateDisplay({ projectName, title, value }: { projectName: string; title: "Yesterday" | "Today"; value: string }) {
  const lines = value.split(/\r?\n/).filter(Boolean);

  return (
    <div className="project-daily-update-picker">
      <button
        type="button"
        className="project-daily-update-picker-trigger project-daily-update-display-trigger"
        aria-label={`Open full details for ${projectName}. ${title} task: ${value || "No subtasks selected"}`}
      >
        {lines.length > 0 ? (
          <span className="project-daily-update-picker-text">
            {lines.map((label, lineIndex) => (
              <span className="project-daily-update-picker-line" key={`${lineIndex}-${label}`}>
                <span aria-hidden="true">-</span>
                <span className="project-daily-update-picker-label">{label}</span>
              </span>
            ))}
          </span>
        ) : (
          <span className="project-daily-update-picker-placeholder">No subtasks selected — click to view project details</span>
        )}
      </button>
    </div>
  );
}

export function ProjectDailyUpdatePicker({
  projectId,
  field,
  title,
  value,
  tasks,
}: {
  projectId: number;
  field: "yesterday" | "today";
  title: "Yesterday" | "Today";
  value: string;
  tasks: Array<Pick<ProjectTask, "id" | "title">>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState(() => dailyUpdateTaskIds(value, tasks));
  const options = tasks.map((task) => ({ value: String(task.id), label: task.title }));

  useEffect(() => {
    if (!open) setSelectedTaskIds(dailyUpdateTaskIds(value, tasks));
  }, [open, tasks, value]);

  function changeOpen(nextOpen: boolean) {
    if (nextOpen) setSelectedTaskIds(dailyUpdateTaskIds(value, tasks));
    else if (!pending) setSelectedTaskIds(dailyUpdateTaskIds(value, tasks));
    setOpen(nextOpen);
  }

  async function saveSelection() {
    if (pending) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("id", String(projectId));
      formData.set("field", field);
      formData.set("taskIds", JSON.stringify(selectedTaskIds.map(Number)));
      const result = await updateProjectDailyAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(`Could not update ${title.toLowerCase()}'s subtasks.`);
    } finally {
      setPending(false);
    }
  }

  const fallbackTitles = value.split(/\r?\n/).filter(Boolean);
  const footer = (
    <div className="shadcn-combobox-footer project-daily-update-picker-footer">
      <span>{selectedTaskIds.length} selected</span>
      <div>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => changeOpen(false)}>Cancel</Button>
        <Button type="button" disabled={pending} onClick={() => { void saveSelection(); }}>{pending ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  );

  return (
    <div className="project-daily-update-picker" onClick={(event) => event.stopPropagation()}>
      <MultiComboboxSelect
        options={options}
        value={selectedTaskIds}
        onValueChange={setSelectedTaskIds}
        ariaLabel={`Select subtasks for ${title.toLowerCase()}`}
        placeholder={tasks.length > 0 ? "No subtasks selected — click to choose" : "No subtasks available"}
        searchPlaceholder={`Search ${title.toLowerCase()} subtasks`}
        emptyMessage="No subtasks found."
        disabled={tasks.length === 0}
        open={open}
        onOpenChange={changeOpen}
        footer={footer}
        renderValue={(_selectedValues, labels) => {
          const lines = labels.length > 0 ? labels : !open ? fallbackTitles : [];
          return lines.length > 0 ? (
            <span className="project-daily-update-picker-text">
              {lines.map((label, lineIndex) => (
                <span className="project-daily-update-picker-line" key={`${lineIndex}-${label}`}>
                  <span aria-hidden="true">-</span>
                  <span className="project-daily-update-picker-label">{label}</span>
                </span>
              ))}
            </span>
          ) : (
            <span className="project-daily-update-picker-placeholder">{tasks.length > 0 ? "No subtasks selected — click to choose" : "No subtasks available."}</span>
          );
        }}
        className="project-daily-update-picker-trigger"
      />
    </div>
  );
}

const statusOptions = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
] as const;

const taskStatusLabel: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

function formatTaskDate(dateKey: string | null) {
  if (!dateKey) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

function taskDateKeyFromDate(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function TaskDatePicker({
  label,
  name,
  value,
  onChange,
  disabled = false,
}: {
  label: "Start date" | "End date";
  name: "startDate" | "endDate";
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(`${value}T12:00:00.000Z`) : undefined;

  return (
    <div className="field-label task-date-field">
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className="button button-secondary task-date-picker-trigger"
          aria-label={`${label}, ${value ? formatTaskDate(value) : "not set"}. Choose date`}
          disabled={disabled}
        >
          <CalendarDays size={15} aria-hidden="true" />
          <span>{value ? formatTaskDate(value) : "Select date"}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          positionerClassName="project-date-popover-positioner"
          className="date-picker-popover task-date-popover"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(taskDateKeyFromDate(date));
              setOpen(false);
            }}
            timeZone="Asia/Bangkok"
            captionLayout="label"
            className="report-calendar"
          />
          {value && (
            <div className="task-date-popover-footer">
              <Button type="button" variant="ghost" onClick={() => { onChange(""); setOpen(false); }}>
                Clear date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ProjectTaskManager({
  projectId,
  projectName,
  tasks,
}: {
  projectId: number;
  projectName: string;
  tasks: ProjectTask[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [deleteTask, setDeleteTask] = useState<ProjectTask | null>(null);
  const [pending, setPending] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("TODO");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskEndDate, setNewTaskEndDate] = useState("");
  const newTaskTitleRef = useRef<HTMLInputElement>(null);

  async function createTask(formData: FormData) {
    if (pending) return;
    formData.set("projectId", String(projectId));

    setPending(true);
    try {
      const result = await createProjectTaskAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setNewTaskTitle("");
        setNewTaskStatus("TODO");
        setNewTaskStartDate("");
        setNewTaskEndDate("");
        requestAnimationFrame(() => newTaskTitleRef.current?.focus());
      } else {
        toast.error(result.message);
      }
      } catch {
      toast.error("Could not add the timeline step.");
    } finally {
      setPending(false);
    }
  }

  async function saveTask(formData: FormData) {
    setPending(true);
    try {
      const result = await updateProjectTaskAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setEditingTask(null);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not update the timeline step.");
    } finally {
      setPending(false);
    }
  }

  async function removeTask(task: ProjectTask) {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("id", String(task.id));
      formData.set("projectId", String(projectId));
      const result = await deleteProjectTaskAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setEditingTask(null);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not delete the timeline step.");
    } finally {
      setPending(false);
      setDeleteTask(null);
    }
  }

  return (
    <section className="detail-copy-section project-detail-task-section" aria-label={`${projectName} timeline steps`}>
      <div className="project-task-manager-heading">
        <div>
          <h3>Timeline steps</h3>
          <span className="type-caption">{tasks.length} {tasks.length === 1 ? "step" : "steps"}</span>
        </div>
        <Button type="button" variant="secondary" className="project-task-add-trigger" onClick={() => { setEditingTask(null); setShowCreate((value) => !value); }}>
          {showCreate ? <X size={15} /> : <Plus size={15} />}
          {showCreate ? "Cancel" : "Add step"}
        </Button>
      </div>

      {showCreate && (
        <form action={createTask} className="project-task-form">
          <label className="field-label">Step name<Input ref={newTaskTitleRef} name="title" minLength={2} maxLength={220} required autoFocus placeholder="Enter a timeline step" value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.currentTarget.value)} /></label>
          <label className="field-label">Status<ComboboxSelect name="status" options={statusOptions} value={newTaskStatus} onValueChange={(value) => { if (value === "TODO" || value === "IN_PROGRESS" || value === "DONE") setNewTaskStatus(value); }} /></label>
          <TaskDatePicker label="Start date" name="startDate" value={newTaskStartDate} onChange={setNewTaskStartDate} />
          <TaskDatePicker label="End date" name="endDate" value={newTaskEndDate} onChange={setNewTaskEndDate} />
          <Button type="submit" disabled={pending}><Plus size={15} /> {pending ? "Saving…" : "Save step"}</Button>
        </form>
      )}

      {tasks.length === 0 && !showCreate ? (
        <ContextMenu
          as="div"
          className="project-task-empty-context"
          role="group"
          ariaLabel={`${projectName} timeline steps`}
          onCreate={() => setShowCreate(true)}
          createLabel="Add timeline step"
        >
          <Empty className="project-task-empty">
            <EmptyMedia variant="icon"><ListTodo size={18} /></EmptyMedia>
            <EmptyHeader>
            <EmptyTitle>No timeline steps yet</EmptyTitle>
            <EmptyDescription>Add steps to build the project timeline.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </ContextMenu>
      ) : (
        <div className="project-task-list">
          <table className="project-task-table" aria-label={`${projectName} timeline steps`}>
            <thead>
              <tr>
                <th scope="col">Step</th>
                <th scope="col">Start</th>
                <th scope="col">End</th>
                <th scope="col">Status</th>
                <th scope="col" className="project-task-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                return (
                  <ContextMenu
                    as="tr"
                    className="project-task-item"
                    role="row"
                    ariaLabel={`Timeline step ${task.title}`}
                    key={task.id}
                    onEdit={() => { setShowCreate(false); setDeleteTask(null); setEditingTask(task); }}
                    onDelete={() => { setShowCreate(false); setEditingTask(null); setDeleteTask(task); }}
                  >
                    {editingTask?.id === task.id ? (
                      <td colSpan={5} className="project-task-edit-cell">
                        <form className="project-task-form project-task-edit-form" onSubmit={(event) => { event.preventDefault(); void saveTask(new FormData(event.currentTarget)); }}>
                          <input type="hidden" name="id" value={task.id} />
                          <input type="hidden" name="projectId" value={projectId} />
                          <label className="field-label">Step name<Input name="title" minLength={2} maxLength={220} required defaultValue={task.title} /></label>
                          <label className="field-label">Status<ComboboxSelect name="status" options={statusOptions} defaultValue={task.status} /></label>
                          <TaskDatePicker
                            label="Start date"
                            name="startDate"
                            value={editingTask.startDate ?? ""}
                            onChange={(value) => setEditingTask((current) => current?.id === task.id ? { ...current, startDate: value || null } : current)}
                          />
                          <TaskDatePicker
                            label="End date"
                            name="endDate"
                            value={editingTask.endDate ?? ""}
                            onChange={(value) => setEditingTask((current) => current?.id === task.id ? { ...current, endDate: value || null } : current)}
                          />
                          <div className="project-task-form-actions">
                            <Button type="button" variant="secondary" onClick={() => setEditingTask(null)}>Cancel</Button>
                            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="project-task-title type-body">{task.title}</td>
                        <td className="project-task-date-cell">{formatTaskDate(task.startDate)}</td>
                        <td className="project-task-date-cell">{formatTaskDate(task.endDate)}</td>
                        <td className="project-task-status-cell">
                          {deleteTask?.id === task.id ? (
                            <div className="project-task-delete-confirm">
                              <span className="type-caption">Delete this step?</span>
                              <Button type="button" variant="secondary" disabled={pending} onClick={() => setDeleteTask(null)}>Cancel</Button>
                              <Button type="button" variant="danger" disabled={pending} onClick={() => { void removeTask(task); }}>{pending ? "Deleting…" : "Delete"}</Button>
                            </div>
                          ) : (
                            <span className={`project-task-status-text project-task-status-${task.status.toLowerCase()}`}>
                              {taskStatusLabel[task.status]}
                            </span>
                          )}
                        </td>
                        <td className="project-task-actions-cell">
                          {deleteTask?.id !== task.id && (
                            <div className="project-task-row-actions">
                              <Button
                                type="button"
                                variant="ghost"
                                className="icon-button project-task-row-action"
                                aria-label={`Edit timeline step ${task.title}`}
                                title="Edit step"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setShowCreate(false);
                                  setDeleteTask(null);
                                  setEditingTask(task);
                                }}
                              >
                                <Pencil size={15} aria-hidden="true" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="icon-button project-task-row-action project-task-row-action-delete"
                                aria-label={`Delete timeline step ${task.title}`}
                                title="Delete step"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setShowCreate(false);
                                  setEditingTask(null);
                                  setDeleteTask(task);
                                }}
                              >
                                <Trash2 size={15} aria-hidden="true" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </ContextMenu>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { ListTodo, Plus, X } from "lucide-react";
import { createProjectTaskAction, deleteProjectTaskAction, updateProjectTaskAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
type ProjectTask = {
  id: number;
  projectId: number;
  title: string;
  status: TaskStatus;
};

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

  async function createTask(formData: FormData) {
    const result = await createProjectTaskAction(formData);
    if (result.ok) {
      toast.success(result.message);
      setShowCreate(false);
    } else {
      toast.error(result.message);
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
      toast.error("Could not update the subtask.");
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
      toast.error("Could not delete the subtask.");
    } finally {
      setPending(false);
      setDeleteTask(null);
    }
  }

  return (
    <section className="detail-copy-section project-detail-task-section" aria-label={`${projectName} subtasks`}>
      <div className="project-task-manager-heading">
        <div>
          <h3>Subtasks</h3>
          <span className="type-caption">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</span>
        </div>
        <Button type="button" variant="secondary" className="project-task-add-trigger" onClick={() => { setEditingTask(null); setShowCreate((value) => !value); }}>
          {showCreate ? <X size={15} /> : <Plus size={15} />}
          {showCreate ? "Cancel" : "Add task"}
        </Button>
      </div>

      {showCreate && (
        <form action={createTask} className="project-task-form">
          <input type="hidden" name="projectId" value={projectId} />
          <label className="field-label">Task name<Input name="title" minLength={2} maxLength={220} required placeholder="Enter a subtask" /></label>
          <label className="field-label">Status<ComboboxSelect name="status" options={statusOptions} defaultValue="TODO" /></label>
          <Button type="submit"><Plus size={15} /> Save task</Button>
        </form>
      )}

      {tasks.length === 0 && !showCreate ? (
        <Empty className="project-task-empty">
          <EmptyMedia variant="icon"><ListTodo size={18} /></EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No subtasks yet</EmptyTitle>
            <EmptyDescription>Add tasks to break this project into smaller steps.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="project-task-list">
          <table className="project-task-table" aria-label={`${projectName} subtasks`}>
            <thead>
              <tr>
                <th scope="col">Subtask</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                return (
                  <ContextMenu
                    as="tr"
                    className="project-task-item"
                    role="row"
                    ariaLabel={`Subtask ${task.title}`}
                    key={task.id}
                    onEdit={() => { setShowCreate(false); setDeleteTask(null); setEditingTask(task); }}
                    onDelete={() => { setShowCreate(false); setEditingTask(null); setDeleteTask(task); }}
                  >
                    {editingTask?.id === task.id ? (
                      <td colSpan={2} className="project-task-edit-cell">
                        <form className="project-task-form project-task-edit-form" onSubmit={(event) => { event.preventDefault(); void saveTask(new FormData(event.currentTarget)); }}>
                          <input type="hidden" name="id" value={task.id} />
                          <input type="hidden" name="projectId" value={projectId} />
                          <label className="field-label">Task name<Input name="title" minLength={2} maxLength={220} required defaultValue={task.title} /></label>
                          <label className="field-label">Status<ComboboxSelect name="status" options={statusOptions} defaultValue={task.status} /></label>
                          <div className="project-task-form-actions">
                            <Button type="button" variant="secondary" onClick={() => setEditingTask(null)}>Cancel</Button>
                            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="project-task-title type-body">{task.title}</td>
                        <td className="project-task-status-cell">
                          {deleteTask?.id === task.id ? (
                            <div className="project-task-delete-confirm">
                              <span className="type-caption">Delete task?</span>
                              <Button type="button" variant="secondary" disabled={pending} onClick={() => setDeleteTask(null)}>Cancel</Button>
                              <Button type="button" variant="danger" disabled={pending} onClick={() => { void removeTask(task); }}>{pending ? "Deleting…" : "Delete"}</Button>
                            </div>
                          ) : (
                            <span className="project-task-status-text">{taskStatusLabel[task.status]}</span>
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

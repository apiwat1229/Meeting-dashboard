"use client";

import { useRef, useState } from "react";
import { ListTodo, Pencil, Plus, Trash2, X } from "lucide-react";
import { createProjectTaskAction, deleteProjectTaskAction, updateProjectTaskAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

const taskStatusInfo: Record<TaskStatus, { label: string; variant: "neutral" | "warning" | "success" }> = {
  TODO: { label: "To do", variant: "neutral" },
  IN_PROGRESS: { label: "In progress", variant: "warning" },
  DONE: { label: "Done", variant: "success" },
};

export function ProjectSubtasks({
  projectId,
  projectName,
  tasks,
}: {
  projectId: number;
  projectName: string;
  tasks: ProjectTask[];
}) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [deleteTask, setDeleteTask] = useState<ProjectTask | null>(null);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [pending, setPending] = useState(false);
  const editFormRef = useRef<HTMLFormElement>(null);

  async function createTask(formData: FormData) {
    const result = await createProjectTaskAction(formData);
    if (result.ok) {
      toast.success(result.message);
      setShowCreate(false);
    } else {
      toast.error(result.message);
    }
  }

  async function performConfirmedAction() {
    setPending(true);
    try {
      let result: { ok: boolean; message: string } | null = null;
      if (confirmUpdate && editFormRef.current) {
        result = await updateProjectTaskAction(new FormData(editFormRef.current));
      } else if (deleteTask) {
        const formData = new FormData();
        formData.set("id", String(deleteTask.id));
        formData.set("projectId", String(projectId));
        result = await deleteProjectTaskAction(formData);
      }

      if (result?.ok) {
        toast.success(result.message);
        setEditingTask(null);
        setDeleteTask(null);
      } else if (result) {
        toast.error(result.message);
      }
    } catch {
      toast.error(confirmUpdate ? "Could not update the subtask." : "Could not delete the subtask.");
    } finally {
      setPending(false);
      setConfirmUpdate(false);
      setDeleteTask(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setShowCreate(false);
        setEditingTask(null);
      }
    }}>
      <DialogTrigger className="project-name-trigger type-body" aria-label={`View subtasks for ${projectName}`} title={`View subtasks for ${projectName}`}>
        <span>{projectName}</span>
        <ListTodo size={15} aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="project-tasks-dialog">
        <div className="project-tasks-header">
          <div>
            <DialogTitle>{projectName}</DialogTitle>
            <DialogDescription>Subtasks for this project</DialogDescription>
          </div>
          <DialogClose className="icon-button project-tasks-close" aria-label="Close project subtasks"><X size={17} /></DialogClose>
        </div>

        <div className="project-tasks-toolbar">
          <p className="type-caption">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</p>
          <Button type="button" variant="secondary" onClick={() => { setEditingTask(null); setShowCreate((value) => !value); }}>
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
          <div className="project-task-list" role="list" aria-label={`${projectName} subtasks`}>
            {tasks.map((task) => {
              const status = taskStatusInfo[task.status];
              return (
                <div className="project-task-item" role="listitem" key={task.id}>
                  {editingTask?.id === task.id ? (
                    <form ref={editFormRef} className="project-task-form project-task-edit-form" onSubmit={(event) => { event.preventDefault(); setConfirmUpdate(true); }}>
                      <input type="hidden" name="id" value={task.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <label className="field-label">Task name<Input name="title" minLength={2} maxLength={220} required defaultValue={task.title} /></label>
                      <label className="field-label">Status<ComboboxSelect name="status" options={statusOptions} defaultValue={task.status} /></label>
                      <div className="project-task-form-actions">
                        <Button type="button" variant="secondary" onClick={() => setEditingTask(null)}>Cancel</Button>
                        <Button type="submit">Save changes</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="project-task-copy">
                        <span className="project-task-title type-body">{task.title}</span>
                        <Badge variant={status.variant} className="project-task-status">{status.label}</Badge>
                      </div>
                      <div className="project-task-actions">
                        <Button type="button" variant="ghost" className="icon-button" aria-label={`Edit ${task.title}`} title="Edit task" onClick={() => { setShowCreate(false); setEditingTask(task); }}><Pencil size={14} /></Button>
                        <Button type="button" variant="ghost" className="icon-button project-task-delete" aria-label={`Delete ${task.title}`} title="Delete task" onClick={() => setDeleteTask(task)}><Trash2 size={14} /></Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
      <ConfirmActionDialog
        open={confirmUpdate || deleteTask !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setConfirmUpdate(false);
            setDeleteTask(null);
          }
        }}
        title={deleteTask ? "Delete this subtask?" : "Save subtask changes?"}
        description={deleteTask ? `Delete “${deleteTask.title}”? This cannot be undone.` : "Apply the changes to this subtask?"}
        actionLabel={deleteTask ? "Delete task" : "Save changes"}
        destructive={deleteTask !== null}
        pending={pending}
        onConfirm={() => { void performConfirmedAction(); }}
      />
    </Dialog>
  );
}

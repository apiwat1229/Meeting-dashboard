"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, X } from "lucide-react";
import { saveDashboardFocusProjectsAction } from "@/app/actions";
import { dashboardSectionNumbers } from "@/lib/dashboard-section-numbers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { toast } from "@/components/ui/toast";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type FocusProject = {
  id: number;
  name: string;
  progress: number;
  tasks: Array<{ id: number; title: string; status: TaskStatus }>;
};

const taskStatusLabel: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export function TodayFocus({ projects, selectedProjectIds, selectedTaskIds }: { projects: FocusProject[]; selectedProjectIds: number[]; selectedTaskIds: number[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectSelection, setProjectSelection] = useState<number[]>(selectedProjectIds);
  const [taskSelection, setTaskSelection] = useState<number[]>(selectedTaskIds);
  const [pending, setPending] = useState(false);
  const selectedProjects = projects.filter((project) => selectedProjectIds.includes(project.id));

  function beginEditing() {
    const availableTaskIds = new Set(selectedProjects.flatMap((project) => project.tasks.map((task) => task.id)));
    setProjectSelection(selectedProjects.map((project) => project.id));
    setTaskSelection(selectedTaskIds.filter((id) => availableTaskIds.has(id)));
    setOpen(true);
  }

  function toggleProject(projectId: number) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    if (projectSelection.includes(projectId)) {
      setProjectSelection((current) => current.filter((id) => id !== projectId));
      const projectTaskIds = new Set(project.tasks.map((task) => task.id));
      setTaskSelection((current) => current.filter((id) => !projectTaskIds.has(id)));
      return;
    }

    setProjectSelection((current) => [...current, projectId]);
    setTaskSelection((current) => [...new Set([...current, ...project.tasks.map((task) => task.id)])]);
  }

  function toggleTask(taskId: number) {
    setTaskSelection((current) => current.includes(taskId)
      ? current.filter((id) => id !== taskId)
      : [...current, taskId]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("projectIds", JSON.stringify(projectSelection));
      formData.set("taskIds", JSON.stringify(taskSelection));
      const result = await saveDashboardFocusProjectsAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not save Today’s Focus projects.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="today-focus-projects-card main-overview-focus" aria-labelledby="today-focus-projects-title">
      <div className="section-heading">
        <div>
          <button
            type="button"
            className="today-focus-title-trigger"
            onClick={beginEditing}
            aria-label="Choose projects and subtasks for Today’s Focus"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <h2 className="type-h2" id="today-focus-projects-title">{dashboardSectionNumbers.todayFocus}. Today’s Focus</h2>
          </button>
        </div>
      </div>
      {selectedProjects.length > 0 ? (
        <div className="today-focus-project-groups">
          {selectedProjects.map((project, projectIndex) => (
            <article className="today-focus-project-group" key={project.id}>
              <div className="today-focus-project-heading">
                <h3>{dashboardSectionNumbers.todayFocus}.{projectIndex + 1} {project.name}</h3>
              </div>
              {project.tasks.length > 0 ? (
                <ul className="today-focus-subtask-list">
                  {project.tasks.filter((task) => selectedTaskIds.includes(task.id)).map((task) => (
                    <li className={`today-focus-subtask today-focus-subtask-${task.status.toLowerCase()}`} key={task.id}>
                      <span>- {task.title}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="today-focus-no-subtasks">No subtasks yet.</p>
              )}
              {project.tasks.length > 0 && !project.tasks.some((task) => selectedTaskIds.includes(task.id)) && (
                <p className="today-focus-no-subtasks">No subtasks selected.</p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <Empty className="dashboard-empty today-focus-empty">
          <EmptyMedia variant="icon"><FolderKanban size={17} /></EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No projects selected</EmptyTitle>
            <EmptyDescription>Click the Today’s Focus heading to choose projects and subtasks.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="detail-dialog-content focus-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Choose projects for Today’s Focus</DialogTitle>
              <DialogDescription>Select projects, then choose which subtasks to include. Selecting a project checks all its subtasks by default.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close project selector"><X size={17} /></DialogClose>
          </div>
          <form className="focus-edit-form" onSubmit={save}>
            {projects.length > 0 ? (
              <fieldset className="focus-project-options">
                <legend className="field-label">Active Projects</legend>
                {projects.map((project) => (
                  <div className="focus-project-option-group" key={project.id}>
                    <label className="focus-project-option">
                      <input
                        type="checkbox"
                        checked={projectSelection.includes(project.id)}
                        onChange={() => toggleProject(project.id)}
                      />
                      <span>
                        <strong>{project.name}</strong>
                        <small>
                          {project.tasks.length === 0
                            ? "No subtasks"
                            : `${project.tasks.filter((task) => taskSelection.includes(task.id)).length} of ${project.tasks.length} subtasks selected`}
                          {` · ${project.progress}% complete`}
                        </small>
                      </span>
                    </label>
                    {projectSelection.includes(project.id) && project.tasks.length > 0 && (
                      <fieldset className="focus-task-options">
                        <legend className="sr-only">Subtasks for {project.name}</legend>
                        {project.tasks.map((task) => (
                          <label className="focus-task-option" key={task.id}>
                            <input
                              type="checkbox"
                              checked={taskSelection.includes(task.id)}
                              onChange={() => toggleTask(task.id)}
                            />
                            <span>{task.title}</span>
                            <small>{taskStatusLabel[task.status]}</small>
                          </label>
                        ))}
                      </fieldset>
                    )}
                  </div>
                ))}
              </fieldset>
            ) : (
              <p className="focus-no-projects">Add a project in Active Projects before choosing today’s focus.</p>
            )}
            <div className="focus-edit-actions">
              <Button type="button" variant="ghost" onClick={() => { setProjectSelection([]); setTaskSelection([]); }} disabled={pending}>Clear selection</Button>
              <div>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save focus"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

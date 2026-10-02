"use client";

import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { createProjectAction, deleteProjectAction, updateProjectAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ProjectDetailsDialog } from "@/components/dashboard/detail-dialogs";

type ProjectTaskData = { id: number; projectId: number; title: string; status: "TODO" | "IN_PROGRESS" | "DONE" };

const projectStatusOptions = [
  { value: "ON_TRACK", label: "In Progress" },
  { value: "DELAY", label: "Delay" },
  { value: "FINISH", label: "Finish" },
];

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

export function AddProjectMenu() {
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="icon-button" aria-label={open ? "Close project form" : "Add project"} title={open ? "Close" : "Add project"}>
        {open ? <X size={18} /> : <Plus size={18} />}
      </PopoverTrigger>
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
          <div className="field-pair">
            <label className="field-label">Start Date<Input name="startDate" type="date" /></label>
            <label className="field-label">End Date<Input name="endDate" type="date" /></label>
          </div>
          <label className="field-label">Yesterday<Input name="yesterday" maxLength={500} placeholder="Previous update" /></label>
          <label className="field-label">Today<Input name="today" maxLength={500} placeholder="Today's next step" /></label>
          <Button type="submit"><Plus size={15} /> Save project</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function ProjectEditor({ project, tasks, children }: { project: ProjectData; tasks: ProjectTaskData[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);

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
    <ContextMenu as="div" className="project-row" role="row" ariaLabel={`Project ${project.name}`} onActivate={() => {
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
    }}>
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
                  <div className="field-pair">
                    <label className="field-label">Start Date<Input name="startDate" type="date" defaultValue={project.startDate ?? ""} /></label>
                    <label className="field-label">End Date<Input name="endDate" type="date" defaultValue={project.endDate ?? ""} /></label>
                  </div>
                </section>
                <section className="project-edit-card project-edit-updates">
                  <h3>Daily updates</h3>
                  <label className="field-label">Yesterday<Textarea name="yesterday" maxLength={500} rows={4} defaultValue={project.yesterday} placeholder="What was completed yesterday?" /></label>
                  <label className="field-label">Today<Textarea name="today" maxLength={500} rows={4} defaultValue={project.today} placeholder="What is planned for today?" /></label>
                </section>
              </div>
              <aside className="project-edit-side">
                <section className="project-edit-card project-edit-progress-card">
                  <div className="project-detail-progress-heading"><h3>Current progress</h3><strong>{project.progress}%</strong></div>
                  <Progress value={project.progress} tone={project.status === "DELAY" ? "danger" : project.status === "FINISH" ? "finish" : project.status === "ATTENTION" ? "warning" : "success"} />
                  <p>{project.name}</p>
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

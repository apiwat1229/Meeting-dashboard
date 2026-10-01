"use client";

import { useRef, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { createProjectAction, deleteProjectAction, updateProjectAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";

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
          <label className="field-label">Yesterday<Input name="yesterday" maxLength={500} placeholder="Previous update" /></label>
          <label className="field-label">Today<Input name="today" maxLength={500} placeholder="Today's next step" /></label>
          <Button type="submit"><Plus size={15} /> Save project</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function ProjectEditor({ project, children }: { project: ProjectData; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"update" | "delete" | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function performConfirmedAction() {
    const form = formRef.current;
    const action = confirmAction;
    if (!action || (action === "update" && !form)) return;

    setPending(true);
    try {
      const formData = action === "update" && form ? new FormData(form) : new FormData();
      if (action === "delete") formData.set("id", String(project.id));
      const result = action === "update"
        ? await updateProjectAction(formData)
        : await deleteProjectAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(action === "update" ? "Could not update the project." : "Could not delete the project.");
    } finally {
      setPending(false);
      setConfirmAction(null);
    }
  }

  return (
    <ContextMenu as="div" className="project-row" role="row" ariaLabel={`Project ${project.name}`} onEdit={() => setOpen(true)} onDelete={() => setConfirmAction("delete")}>
      {children}
      <Popover open={open} onOpenChange={(nextOpen) => {
        // Keep the form mounted until the confirmation action has run.
        if (!nextOpen && confirmAction !== null) return;
        setOpen(nextOpen);
        if (!nextOpen) setConfirmAction(null);
      }}>
        <PopoverTrigger render={<span className="editor-popover-anchor" aria-hidden="true" />} nativeButton={false} tabIndex={-1} />
        <PopoverContent className="crud-popover" align="end" side="top">
          <div className="crud-popover-heading">
            <h3 className="type-h3">Edit project</h3>
            <Button type="button" variant="ghost" className="icon-button" onClick={() => setOpen(false)} aria-label="Close project editor" title="Close"><X size={17} /></Button>
          </div>
          <form ref={formRef} onSubmit={(event) => { event.preventDefault(); setConfirmAction("update"); }} className="crud-form">
            <input type="hidden" name="id" value={project.id} />
            <label className="field-label">Project name<Input name="name" minLength={2} maxLength={140} defaultValue={project.name} required /></label>
            <div className="field-pair">
              <label className="field-label">Status
                <ComboboxSelect name="status" options={projectStatusOptions} defaultValue={project.status === "ATTENTION" ? "ON_TRACK" : project.status} />
              </label>
              <label className="field-label">Progress %<Input name="progress" type="number" min="0" max="100" defaultValue={project.progress} required /></label>
            </div>
            <label className="field-label">Yesterday<Input name="yesterday" defaultValue={project.yesterday} maxLength={500} /></label>
            <label className="field-label">Today<Input name="today" defaultValue={project.today} maxLength={500} /></label>
            <Button type="submit">Save changes</Button>
          </form>
        </PopoverContent>
      </Popover>
      <ConfirmActionDialog
        open={confirmAction !== null}
        onOpenChange={(nextOpen) => { if (!nextOpen) setConfirmAction(null); }}
        title={confirmAction === "delete" ? "Delete this project?" : "Save project changes?"}
        description={confirmAction === "delete" ? `Delete “${project.name}”? Linked issues will be kept without a project.` : "Apply the changes to this project?"}
        actionLabel={confirmAction === "delete" ? "Delete project" : "Save changes"}
        destructive={confirmAction === "delete"}
        pending={pending}
        onConfirm={() => { void performConfirmedAction(); }}
      />
    </ContextMenu>
  );
}

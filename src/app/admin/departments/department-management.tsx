"use client";

import { useActionState, useCallback, useEffect, useState, type ReactNode } from "react";
import { Building2, CircleCheck, KeyRound, Plus, X } from "lucide-react";
import { createDepartmentAction, updateDepartmentStatusAction, type AdminActionState } from "@/app/admin/actions";
import type { Department } from "@/app/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";

const initialState: AdminActionState = { error: "", success: "" };

function Feedback({ state }: { state: AdminActionState }) {
  if (!state.error && !state.success) return null;
  return <p className={`admin-form-feedback${state.error ? " is-error" : " is-success"}`} role={state.error ? "alert" : "status"}>{state.error || state.success}</p>;
}

function SectionHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="admin-panel-heading"><span className="admin-panel-icon">{icon}</span><div><h2>{title}</h2><p>{description}</p></div></div>;
}

function AddDepartmentDialogForm({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(createDepartmentAction, initialState);
  useEffect(() => {
    if (state.success) onClose();
  }, [onClose, state.success]);

  return (
    <form className="admin-form-grid admin-department-create admin-create-modal-form" action={action}>
      <label>Department code<Input name="code" placeholder="e.g. HR" required minLength={2} maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9_-]+" /></label>
      <label>Department name<Input name="name" placeholder="Human Resources" required minLength={2} maxLength={100} /></label>
      <label className="admin-description-field">Description<Input name="description" placeholder="Optional" maxLength={1000} /></label>
      <Feedback state={state} />
      <p className="admin-field-hint"><KeyRound size={14} aria-hidden="true" /> A separate report workspace will be created for each department.</p>
      <div className="admin-dialog-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}><Plus size={16} aria-hidden="true" />{pending ? "Adding…" : "Add department"}</Button>
      </div>
    </form>
  );
}

export function AddDepartmentDialogButton() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button type="button" className="admin-heading-action" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <Plus size={16} aria-hidden="true" /> Add department
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent className="admin-create-dialog">
            <div className="detail-dialog-header">
              <div>
                <DialogTitle>Add a department</DialogTitle>
                <DialogDescription>Create a report workspace for a department.</DialogDescription>
              </div>
              <DialogClose className="icon-button project-tasks-close" aria-label="Close add department form"><X size={17} /></DialogClose>
            </div>
            <AddDepartmentDialogForm onClose={close} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function DepartmentStatusForm({ department }: { department: Department }) {
  const [state, action, pending] = useActionState(updateDepartmentStatusAction, initialState);
  return (
    <form className="admin-department-status-form" action={action}>
      <input type="hidden" name="id" value={department.id} />
      <label className="sr-only" htmlFor={`department-status-${department.id}-trigger`}>Status for {department.name}</label>
      <Select id={`department-status-${department.id}`} name="isActive" defaultValue={department.isActive ? "true" : "false"} options={[{ value: "true", label: "Active" }, { value: "false", label: "Disabled" }]} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      <Feedback state={state} />
    </form>
  );
}

export function DepartmentManagement({ departments }: { departments: Department[] }) {
  return (
    <Card className="admin-panel admin-department-directory">
      <div className="admin-panel-toolbar">
        <SectionHeading icon={<CircleCheck size={18} aria-hidden="true" />} title="Department directory" description="Review each workspace and control whether its users can sign in." />
        <Badge variant="neutral">{departments.length} {departments.length === 1 ? "department" : "departments"}</Badge>
      </div>
      {departments.length === 0 ? <p className="admin-empty-state">No departments yet. Add one to create a report workspace.</p> : (
        <div className="admin-department-list">
          {departments.map((department) => (
            <div className="admin-department-row" key={department.id}>
              <div className="admin-department-info">
                <span className="admin-department-avatar"><Building2 size={16} aria-hidden="true" /></span>
                <div><strong>{department.name}</strong><span>{department.code}{department.description ? ` · ${department.description}` : ""}</span></div>
              </div>
              <div className="admin-department-actions">
                <Badge variant={department.isActive ? "success" : "neutral"}>{department.isActive ? "Active" : "Disabled"}</Badge>
                <DepartmentStatusForm department={department} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

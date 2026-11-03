"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useActionState } from "react";
import { CircleCheck, KeyRound, Search, UserPlus, X } from "lucide-react";
import { createDashboardUserAction, updateDashboardUserAction, type AdminActionState } from "@/app/admin/actions";
import type { Department, ManagedUser } from "@/app/admin/types";
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

function SectionHeading({ icon, title, description, id }: { icon: ReactNode; title: string; description: string; id?: string }) {
  return (
    <div className="admin-panel-heading">
      <span className="admin-panel-icon">{icon}</span>
      <div><h2 id={id}>{title}</h2><p>{description}</p></div>
    </div>
  );
}

function AddUserDialogForm({ departments, onClose }: { departments: Department[]; onClose: () => void }) {
  const [state, action, pending] = useActionState(createDashboardUserAction, initialState);
  const activeDepartments = departments.filter((department) => department.isActive);
  useEffect(() => {
    if (state.success) onClose();
  }, [onClose, state.success]);

  return (
    <form className="admin-form-grid admin-create-modal-form" action={action}>
      <label>Username<Input name="username" autoComplete="off" placeholder="e.g. somchai" required minLength={3} maxLength={60} pattern="[A-Za-z0-9._-]+" /></label>
      <label>Display name<Input name="displayName" placeholder="Full name" required minLength={2} maxLength={120} /></label>
      <label>Temporary password<Input name="password" type="password" autoComplete="new-password" placeholder="At least 10 characters" required minLength={10} /></label>
      <label>Department<Select name="departmentId" required defaultValue={activeDepartments[0]?.id.toString() ?? null} placeholder="No active departments" options={activeDepartments.map((item) => ({ value: item.id.toString(), label: item.name }))} /></label>
      <label>Role<Select name="role" defaultValue="USER" options={[{ value: "USER", label: "User" }, { value: "ADMIN", label: "Administrator" }]} /></label>
      <p className="admin-field-hint"><KeyRound size={14} aria-hidden="true" /> Passwords are stored as one-way hashes.</p>
      <Feedback state={state} />
      <div className="admin-dialog-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending || activeDepartments.length === 0}><UserPlus size={16} aria-hidden="true" />{pending ? "Creating account…" : "Create account"}</Button>
      </div>
    </form>
  );
}

export function AddUserDialogButton({ departments }: { departments: Department[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button type="button" className="admin-heading-action" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <UserPlus size={16} aria-hidden="true" /> Add user
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent className="admin-create-dialog">
            <div className="detail-dialog-header">
              <div>
                <DialogTitle>Add a user</DialogTitle>
                <DialogDescription>Create a sign-in account and choose its department and access role.</DialogDescription>
              </div>
              <DialogClose className="icon-button project-tasks-close" aria-label="Close add user form"><X size={17} /></DialogClose>
            </div>
            <AddUserDialogForm departments={departments} onClose={close} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function UserEditor({ user, departments, currentUserId }: { user: ManagedUser; departments: Department[]; currentUserId: number }) {
  const [state, action, pending] = useActionState(updateDashboardUserAction, initialState);
  const activeDepartmentOptions = departments.filter((department) => department.isActive || department.id === user.departmentId);
  const statusVariant = user.isActive && user.departmentIsActive ? "success" : "warning";

  return (
    <Card className="admin-user-card">
      <form className="admin-user-edit-form" action={action}>
        <input type="hidden" name="id" value={user.id} />
        <div className="admin-user-summary">
          <span className="admin-user-avatar" aria-hidden="true">{user.displayName.trim().charAt(0).toLocaleUpperCase("en-US") || "U"}</span>
          <div className="admin-user-identity-copy"><strong>{user.username}</strong><span>{user.id === currentUserId ? "Signed in account" : user.displayName}</span></div>
          {user.id === currentUserId && <Badge variant="info">You</Badge>}
        </div>
        <label>Display name<Input name="displayName" defaultValue={user.displayName} required minLength={2} maxLength={120} /></label>
        <label>Department<Select name="departmentId" defaultValue={user.departmentId.toString()} options={activeDepartmentOptions.map((department) => ({ value: department.id.toString(), label: department.name }))} /></label>
        <label>Role<Select name="role" defaultValue={user.role} options={[{ value: "USER", label: "User" }, { value: "ADMIN", label: "Administrator" }]} /></label>
        <label>Access<Select name="isActive" defaultValue={user.isActive ? "true" : "false"} options={[{ value: "true", label: "Active" }, { value: "false", label: "Disabled" }]} /></label>
        <label className="admin-password-reset">Reset password<Input name="password" type="password" autoComplete="new-password" minLength={10} placeholder="Leave blank to keep current" /></label>
        <div className="admin-user-save"><Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></div>
        <div className="admin-user-status"><Badge variant={statusVariant}>{user.isActive && user.departmentIsActive ? "Access active" : "Access disabled"}</Badge><span>{user.departmentName}{!user.departmentIsActive ? " department is disabled" : " department"}</span></div>
        <Feedback state={state} />
      </form>
    </Card>
  );
}

export function UserManagement({ users, departments, currentUserId }: { users: ManagedUser[]; departments: Department[]; currentUserId: number }) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLocaleLowerCase("en-US");
  const filteredUsers = users.filter((user) => `${user.username} ${user.displayName} ${user.departmentName} ${user.role}`.toLocaleLowerCase("en-US").includes(search));

  return (
    <div className="admin-management-grid">
      <Card className="admin-panel admin-users-panel">
        <div className="admin-panel-toolbar">
          <SectionHeading icon={<CircleCheck size={18} aria-hidden="true" />} id="user-list-heading" title="User accounts" description="Review access and update an account's department, role, or password." />
          <label className="admin-search-field"><span className="sr-only">Search accounts</span><Search size={16} aria-hidden="true" /><Input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search accounts…" /></label>
        </div>
        <div className="admin-user-list" aria-live="polite">
          {filteredUsers.length === 0 ? <p className="admin-empty-state">{users.length ? "No accounts match your search." : "No user accounts yet."}</p> : (
            filteredUsers.map((user) => <UserEditor key={user.id} user={user} departments={departments} currentUserId={currentUserId} />)
          )}
        </div>
        <p className="admin-list-count">Showing {filteredUsers.length} of {users.length} {users.length === 1 ? "account" : "accounts"}</p>
      </Card>

    </div>
  );
}

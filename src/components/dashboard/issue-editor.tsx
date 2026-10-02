"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { deleteIssueAction, updateIssueAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";
import { ImageAttachment, IssueDetailsDialog } from "@/components/dashboard/detail-dialogs";
import { IssueActivityLinkFields, type IssueActivityOption } from "@/components/dashboard/issue-activity-link-fields";

type IssueEditorData = {
  id: number;
  title: string;
  projectId: number | null;
  relatedSection: "YESTERDAY" | "TODAY" | "OTHER" | null;
  relatedActivityId: number | null;
  relatedActivityTitle: string | null;
  severity: "HIGH" | "MEDIUM" | "LOW";
  state: "OPEN" | "CLOSED";
  detail: string;
  nextStep: string;
  prevention: string;
  projectName: string | null;
  media: Array<{ id: number; url: string }>;
};

type ProjectOption = { id: number; name: string };
const severityOptions = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
];
const issueStateOptions = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Done" },
];

export function IssueEditor({ issue, projects, activities, className, children }: { issue: IssueEditorData; projects: ProjectOption[]; activities: IssueActivityOption[]; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editState, setEditState] = useState(issue.state);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function saveIssue(formData: FormData) {
    setPending(true);
    try {
      const result = await updateIssueAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not update the issue.");
    } finally {
      setPending(false);
    }
  }

  async function deleteIssue() {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("id", String(issue.id));
      const result = await deleteIssueAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not delete the issue.");
    } finally {
      setPending(false);
      setConfirmDelete(false);
    }
  }

  return (
    <ContextMenu as="article" className={className} ariaLabel={`Issue ${issue.title}`} onActivate={() => {
      setOpen(false);
      setConfirmDelete(false);
      setDetailsOpen(true);
    }} onEdit={() => {
      setDetailsOpen(false);
      setEditState(issue.state);
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
        <DialogContent className="detail-dialog-content issue-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Edit issue</DialogTitle>
              <DialogDescription>Update the issue, its response plan, and supporting image.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close issue editor"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void saveIssue(new FormData(event.currentTarget)); }} className="issue-edit-form issue-edit-modal-form">
            <input type="hidden" name="id" value={issue.id} />
            <div className="issue-edit-layout">
              <section className="project-edit-card issue-edit-information">
                <h3>Issue information</h3>
                <label className="field-label">Issue title<Input name="title" minLength={3} maxLength={180} required defaultValue={issue.title} /></label>
                <label className="field-label">Related project
                  <ComboboxSelect name="projectId" options={[{ value: "none", label: "No linked project" }, ...projects.map((project) => ({ value: String(project.id), label: project.name }))]} defaultValue={issue.projectId === null ? "none" : String(issue.projectId)} placeholder="No linked project" searchPlaceholder="Search projects..." emptyMessage="No matching projects." />
                </label>
                <IssueActivityLinkFields key={`${issue.id}-${open ? "open" : "closed"}`} activities={activities} defaultSection={issue.relatedSection} defaultActivityId={issue.relatedActivityId} />
                <div className="field-pair">
                  <label className="field-label">Severity
                    <ComboboxSelect name="severity" options={severityOptions} defaultValue={issue.severity === "LOW" ? "MEDIUM" : issue.severity} />
                  </label>
                  <label className="field-label">Status
                    <ComboboxSelect name="state" options={issueStateOptions} value={editState} onValueChange={(value) => { if (value === "OPEN" || value === "CLOSED") setEditState(value); }} />
                  </label>
                </div>
              </section>
              <div className="issue-edit-side">
                <section className="project-edit-card issue-edit-response">
                  <h3>Details and response</h3>
                  <label className="field-label">Detail<Textarea name="detail" maxLength={1000} rows={4} defaultValue={issue.detail} placeholder="Describe the issue and its impact." /></label>
                  <label className="field-label">Next step<Textarea name="nextStep" maxLength={500} rows={3} defaultValue={issue.nextStep} placeholder="What action should happen next?" /></label>
                  {editState === "CLOSED" ? (
                    <label className="field-label">Prevention plan<Textarea name="prevention" maxLength={1000} rows={3} defaultValue={issue.prevention} placeholder="How can we prevent this from happening again?" /></label>
                  ) : (
                    <input type="hidden" name="prevention" value={issue.prevention} />
                  )}
                </section>
                <ImageAttachment entityType="issue" entityId={issue.id} initialMedia={issue.media} alt={`Media attached to ${issue.title}`} editable />
              </div>
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
        title="Delete this issue?"
        description={`Delete “${issue.title}”? This cannot be undone.`}
        actionLabel="Delete issue"
        destructive
        pending={pending}
        onConfirm={() => { void deleteIssue(); }}
      />
      <IssueDetailsDialog issue={issue} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </ContextMenu>
  );
}

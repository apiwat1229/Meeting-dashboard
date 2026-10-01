"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Trash2, X } from "lucide-react";
import { deleteIssueAction, updateIssueAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import { Textarea } from "@/components/ui/textarea";

type IssueEditorData = {
  id: number;
  title: string;
  projectId: number | null;
  severity: "HIGH" | "MEDIUM" | "LOW";
  state: "OPEN" | "CLOSED";
  detail: string;
  nextStep: string;
  prevention: string;
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

export function IssueEditor({ issue, projects, className, children }: { issue: IssueEditorData; projects: ProjectOption[]; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editState, setEditState] = useState(issue.state);
  const [confirmAction, setConfirmAction] = useState<"update" | "delete" | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setEditState(issue.state), [issue.state]);

  async function performConfirmedAction() {
    const form = formRef.current;
    const action = confirmAction;
    if (!form || !action) return;

    setPending(true);
    try {
      const result = action === "update"
        ? await updateIssueAction(new FormData(form))
        : await deleteIssueAction(new FormData(form));
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(action === "update" ? "Could not update the issue." : "Could not delete the issue.");
    } finally {
      setPending(false);
      setConfirmAction(null);
    }
  }

  return (
    <ContextMenu as="article" className={className} ariaLabel={`Issue ${issue.title}`} onEdit={() => {
      setEditState(issue.state);
      setOpen(true);
    }}>
      {children}
      <Popover open={open} onOpenChange={(nextOpen) => {
        // A confirmation dialog is portaled outside this popover. Do not let
        // that dialog's clicks close and unmount the edit form prematurely.
        if (!nextOpen && confirmAction !== null) return;
        setOpen(nextOpen);
        if (!nextOpen) setConfirmAction(null);
      }}>
        <PopoverTrigger render={<span className="editor-popover-anchor" aria-hidden="true" />} nativeButton={false} tabIndex={-1} />
        <PopoverContent className="crud-popover issue-editor-popover" align="end" side="top">
          <form ref={formRef} onSubmit={(event) => { event.preventDefault(); setConfirmAction("update"); }} className="issue-edit-form">
            <div className="crud-popover-heading">
              <h3 className="type-h3">Edit issue</h3>
              <Button type="button" variant="ghost" className="icon-button" onClick={() => setOpen(false)} aria-label="Close edit issue form" title="Close"><X size={17} /></Button>
            </div>
            <input type="hidden" name="id" value={issue.id} />
            <label className="field-label">Issue title<Input name="title" minLength={3} maxLength={180} required defaultValue={issue.title} /></label>
            <div className="field-pair">
              <label className="field-label">Project
                <ComboboxSelect name="projectId" options={[{ value: "none", label: "No linked project" }, ...projects.map((project) => ({ value: String(project.id), label: project.name }))]} defaultValue={issue.projectId === null ? "none" : String(issue.projectId)} placeholder="No linked project" searchPlaceholder="Search projects..." emptyMessage="No matching projects." />
              </label>
              <label className="field-label">Severity
                <ComboboxSelect name="severity" options={severityOptions} defaultValue={issue.severity === "LOW" ? "MEDIUM" : issue.severity} />
              </label>
            </div>
            <label className="field-label">Status
              <ComboboxSelect name="state" options={issueStateOptions} value={editState} onValueChange={(value) => { if (value === "OPEN" || value === "CLOSED") setEditState(value); }} />
            </label>
            <label className="field-label">Detail<Textarea name="detail" maxLength={1000} rows={2} defaultValue={issue.detail} /></label>
            <label className="field-label">Next step<Input name="nextStep" maxLength={500} defaultValue={issue.nextStep} /></label>
            {editState === "CLOSED" ? (
              <label className="field-label">Prevention plan<Textarea name="prevention" maxLength={1000} rows={2} defaultValue={issue.prevention} placeholder="How can we prevent this from happening again?" /></label>
            ) : (
              <input type="hidden" name="prevention" value={issue.prevention} />
            )}
            <Button type="submit">Save changes</Button>
          </form>
          <div className="crud-delete-row">
            <Button type="button" variant="ghost" className="crud-delete-trigger" onClick={() => setConfirmAction("delete")}><Trash2 size={14} /> Delete issue</Button>
          </div>
        </PopoverContent>
      </Popover>
      <ConfirmActionDialog
        open={confirmAction !== null}
        onOpenChange={(nextOpen) => { if (!nextOpen) setConfirmAction(null); }}
        title={confirmAction === "delete" ? "Delete this issue?" : "Save issue changes?"}
        description={confirmAction === "delete" ? `Delete “${issue.title}”? This cannot be undone.` : "Apply the changes to this issue?"}
        actionLabel={confirmAction === "delete" ? "Delete issue" : "Save changes"}
        destructive={confirmAction === "delete"}
        pending={pending}
        onConfirm={() => { void performConfirmedAction(); }}
      />
    </ContextMenu>
  );
}

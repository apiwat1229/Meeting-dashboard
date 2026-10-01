"use client";

import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { createActivityAction, deleteActivityAction, updateActivityAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ActivityDetailsDialog, ImageAttachment } from "@/components/dashboard/detail-dialogs";

type ActivitySection = "YESTERDAY" | "TODAY" | "OTHER";
type ActivityData = { id: number; content: string; section: ActivitySection; completed: boolean; activityDate: string; imageUrl: string };

const sectionOptions = [
  { value: "TODAY", label: "Today Other Activities" },
  { value: "YESTERDAY", label: "Yesterday Other Activities" },
  { value: "OTHER", label: "Other Topics" },
] satisfies Array<{ value: ActivitySection; label: string }>;
const completionOptions = [
  { value: "false", label: "In progress" },
  { value: "true", label: "Done" },
];

export function AddActivityMenu({ section }: { section: ActivitySection }) {
  const [open, setOpen] = useState(false);

  async function handleCreate(formData: FormData) {
    const result = await createActivityAction(formData);
    if (result.ok) {
      toast.success(result.message);
      setOpen(false);
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="icon-button" aria-label="Add activity" title="Add activity">
        {open ? <X size={18} /> : <Plus size={18} />}
      </PopoverTrigger>
      <PopoverContent className="crud-popover" align="end">
        <div className="crud-popover-heading">
          <h3 className="type-h3">Add activity</h3>
          <Button type="button" variant="ghost" className="icon-button" onClick={() => setOpen(false)} aria-label="Close activity form" title="Close"><X size={17} /></Button>
        </div>
        <form action={handleCreate} className="crud-form">
          <input type="hidden" name="section" value={section} />
          <label className="field-label">Description<Input name="content" minLength={2} maxLength={220} required placeholder="Activity or shared topic" /></label>
          <Button type="submit"><Plus size={15} /> Add item</Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function ActivityEditor({ activity, children }: { activity: ActivityData; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editSection, setEditSection] = useState<ActivitySection>(activity.section);
  const [editCompleted, setEditCompleted] = useState(String(activity.completed));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);

  async function saveActivity(formData: FormData) {
    setPending(true);
    try {
      const result = await updateActivityAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not update the activity.");
    } finally {
      setPending(false);
    }
  }

  async function deleteActivity() {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("id", String(activity.id));
      const result = await deleteActivityAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not delete the activity.");
    } finally {
      setPending(false);
      setConfirmDelete(false);
    }
  }

  function openEditor() {
    setEditSection(activity.section);
    setEditCompleted(String(activity.completed));
    setDetailsOpen(false);
    setConfirmDelete(false);
    setOpen(true);
  }

  return (
    <ContextMenu as="li" className={activity.completed ? "activity-done" : ""} ariaLabel={`Activity ${activity.content}`} onActivate={() => {
      setOpen(false);
      setConfirmDelete(false);
      setDetailsOpen(true);
    }} onEdit={openEditor} onDelete={() => {
      setOpen(false);
      setDetailsOpen(false);
      setConfirmDelete(true);
    }}>
      {children}
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen && confirmDelete) return;
        setOpen(nextOpen);
        if (nextOpen) {
          setEditSection(activity.section);
          setEditCompleted(String(activity.completed));
        } else {
          setConfirmDelete(false);
        }
      }}>
        <DialogContent className="detail-dialog-content activity-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Edit activity</DialogTitle>
              <DialogDescription>Update the activity, choose where it appears, and attach a supporting image.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close activity editor"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void saveActivity(new FormData(event.currentTarget)); }} className="activity-edit-form">
            <input type="hidden" name="id" value={activity.id} />
            <input type="hidden" name="section" value={editSection} />
            <input type="hidden" name="completed" value={editCompleted} />
            <div className="activity-edit-layout">
              <section className="project-edit-card activity-edit-information">
                <h3>Activity information</h3>
                <label className="field-label">Description<Textarea name="content" minLength={2} maxLength={220} required rows={5} defaultValue={activity.content} /></label>
                <label className="field-label">Section
                  <ComboboxSelect
                    value={editSection}
                    options={sectionOptions}
                    onValueChange={(value) => {
                      if (value === "TODAY" || value === "YESTERDAY" || value === "OTHER") setEditSection(value);
                    }}
                  />
                </label>
                <label className="field-label">Status
                  <ComboboxSelect
                    value={editCompleted}
                    options={completionOptions}
                    onValueChange={(value) => {
                      if (value === "true" || value === "false") setEditCompleted(value);
                    }}
                  />
                </label>
              </section>
              <aside className="activity-edit-side">
                <section className="project-edit-card activity-edit-summary">
                  <h3>Current activity</h3>
                  <p>{activity.content}</p>
                  <span>{activity.section === "TODAY" ? "Today Other Activities" : activity.section === "YESTERDAY" ? "Yesterday Other Activities" : "Other Topics"}</span>
                </section>
                <ImageAttachment entityType="activity" entityId={activity.id} initialImageUrl={activity.imageUrl} alt={`Image attached to ${activity.content}`} editable />
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
        title="Delete this activity?"
        description={`Delete “${activity.content}”?`}
        actionLabel="Delete activity"
        destructive
        pending={pending}
        onConfirm={() => { void deleteActivity(); }}
      />
      <ActivityDetailsDialog activity={activity} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </ContextMenu>
  );
}

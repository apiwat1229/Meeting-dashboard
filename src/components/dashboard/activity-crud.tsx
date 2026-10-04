"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createActivityAction, deleteActivityAction, updateActivityAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ActivityDetailsDialog, ImageAttachment } from "@/components/dashboard/detail-dialogs";
import { MediaFilePicker, uploadMediaFiles } from "@/components/dashboard/media-file-picker";

type ActivitySection = "YESTERDAY" | "TODAY";
type ActivitySeverity = "HIGH" | "MEDIUM";
type ActivityData = { id: number; content: string; section: ActivitySection; severity: ActivitySeverity; completed: boolean; activityDate: string; media: Array<{ id: number; url: string }>; isCarryover?: boolean; willCarryOver?: boolean };

const sectionOptions = [
  { value: "TODAY", label: "Activities" },
  { value: "YESTERDAY", label: "Yesterday Activities" },
] satisfies Array<{ value: ActivitySection; label: string }>;
const completionOptions = [
  { value: "false", label: "In progress" },
  { value: "true", label: "Done" },
];
const severityOptions = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
];

const activitySectionLabels: Record<ActivitySection, string> = {
  TODAY: "Activities",
  YESTERDAY: "Yesterday Activities",
};

export function AddActivityMenu({ section, children }: { section: ActivitySection; children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [editSection, setEditSection] = useState<ActivitySection>(section);
  const [editSeverity, setEditSeverity] = useState<ActivitySeverity>("MEDIUM");
  const [editCompleted, setEditCompleted] = useState("false");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);

  async function handleCreate(formData: FormData) {
    setPending(true);
    try {
      const result = await createActivityAction(formData);
      if (!result.ok || !result.activityId) {
        toast.error(result.message);
        return;
      }

      if (mediaFiles.length > 0) {
        const uploadResult = await uploadMediaFiles("activity", result.activityId, mediaFiles);
        if (uploadResult.uploaded > 0) {
          router.refresh();
        }
        if (uploadResult.failed.length > 0) toast.error(`Activity added; ${uploadResult.uploaded} media uploaded, ${uploadResult.failed.length} failed. ${uploadResult.failed[0].message}`);
        else toast.success(`Activity added with ${uploadResult.uploaded} media file${uploadResult.uploaded === 1 ? "" : "s"}.`);
      } else {
        toast.success(result.message);
      }
      setOpen(false);
      setContent("");
      setMediaFiles([]);
    } catch {
      toast.error("Could not add the activity.");
    } finally {
      setPending(false);
    }
  }

  function openAddForm() {
    setContent("");
    setEditSection(section);
    setEditSeverity("MEDIUM");
    setEditCompleted("false");
    setMediaFiles([]);
    setOpen(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setContent("");
      setMediaFiles([]);
    }
  }

  return (
    <>
      <button
        type="button"
        className="today-focus-title-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openAddForm}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="detail-dialog-content activity-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Add activity</DialogTitle>
              <DialogDescription>Add an activity, choose where it appears, and attach a supporting image or video.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close activity form"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void handleCreate(new FormData(event.currentTarget)); }} className="activity-edit-form">
            <input type="hidden" name="section" value={editSection} />
            <input type="hidden" name="severity" value={editSeverity} />
            <input type="hidden" name="completed" value={editCompleted} />
            <div className="activity-edit-layout">
              <section className="project-edit-card activity-edit-information">
                <h3>Activity information</h3>
                <label className="field-label">Description<Textarea name="content" minLength={2} maxLength={220} required rows={5} value={content} onChange={(event) => setContent(event.currentTarget.value)} placeholder="Describe the activity" /></label>
                <label className="field-label">Section
                  <ComboboxSelect value={editSection} options={sectionOptions} onValueChange={(value) => {
                    if (value === "TODAY" || value === "YESTERDAY") setEditSection(value);
                  }} />
                </label>
                <label className="field-label">Priority
                  <ComboboxSelect value={editSeverity} options={severityOptions} onValueChange={(value) => {
                    if (value === "HIGH" || value === "MEDIUM") setEditSeverity(value);
                  }} />
                </label>
                <label className="field-label">Status
                  <ComboboxSelect value={editCompleted} options={completionOptions} onValueChange={(value) => {
                    if (value === "true" || value === "false") setEditCompleted(value);
                  }} />
                </label>
              </section>
              <aside className="activity-edit-side">
                <section className="project-edit-card activity-edit-summary">
                  <h3>New activity</h3>
                  <p>{content.trim() || "Your activity description will appear here."}</p>
                  <span>{activitySectionLabels[editSection]}</span>
                  <Badge variant={editCompleted === "true" ? "success" : editSeverity === "HIGH" ? "danger" : "warning"}>
                    {editCompleted === "true" ? "Done" : editSeverity === "HIGH" ? "High" : "Medium"}
                  </Badge>
                </section>
                <MediaFilePicker files={mediaFiles} pending={pending} onFilesChange={setMediaFiles} />
              </aside>
            </div>
            <div className="project-edit-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add activity"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ActivityEditor({ activity, relatedIssues, children }: { activity: ActivityData; relatedIssues: Array<{ id: number; title: string; severity: "HIGH" | "MEDIUM" | "LOW"; state: "OPEN" | "CLOSED" }>; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editSection, setEditSection] = useState<ActivitySection>(activity.section);
  const [editSeverity, setEditSeverity] = useState<ActivitySeverity>(activity.severity);
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
    setEditSection(activity.isCarryover ? "YESTERDAY" : activity.section);
    setEditSeverity(activity.severity);
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
            setEditSection(activity.isCarryover ? "YESTERDAY" : activity.section);
            setEditSeverity(activity.severity);
            setEditCompleted(String(activity.completed));
        } else {
          setConfirmDelete(false);
        }
      }}>
        <DialogContent className="detail-dialog-content activity-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Edit activity</DialogTitle>
              <DialogDescription>Update the activity, choose where it appears, and attach a supporting image or video.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close activity editor"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void saveActivity(new FormData(event.currentTarget)); }} className="activity-edit-form">
            <input type="hidden" name="id" value={activity.id} />
            <input type="hidden" name="section" value={editSection} />
            <input type="hidden" name="severity" value={editSeverity} />
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
                      if (value === "TODAY" || value === "YESTERDAY") setEditSection(value);
                    }}
                  />
                </label>
                <label className="field-label">Priority
                  <ComboboxSelect
                    value={editSeverity}
                    options={severityOptions}
                    onValueChange={(value) => {
                      if (value === "HIGH" || value === "MEDIUM") setEditSeverity(value);
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
                  <span>{activitySectionLabels[activity.section]}</span>
                  <Badge variant={activity.completed ? "success" : activity.severity === "HIGH" ? "danger" : "warning"}>
                    {activity.completed ? "Done" : activity.severity === "HIGH" ? "High" : "Medium"}
                  </Badge>
                </section>
                <ImageAttachment entityType="activity" entityId={activity.id} initialMedia={activity.media} alt={`Media attached to ${activity.content}`} editable />
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
      <ActivityDetailsDialog activity={activity} relatedIssues={relatedIssues} open={detailsOpen} onOpenChange={setDetailsOpen} />
    </ContextMenu>
  );
}

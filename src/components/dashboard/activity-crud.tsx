"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Plus, X } from "lucide-react";
import { createActivityAction, deleteActivityAction, updateActivityAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

const activitySectionLabels: Record<ActivitySection, string> = {
  TODAY: "Today Other Activities",
  YESTERDAY: "Yesterday Other Activities",
  OTHER: "Other Topics",
};

function ActivityImagePicker({ file, pending, onFileChange }: { file: File | null; pending: boolean; onFileChange: (file: File | null) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectedFile = input.files?.[0] ?? null;
    input.value = "";
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Choose an image smaller than 5 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(selectedFile.type)) {
      toast.error("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    onFileChange(selectedFile);
  }

  return (
    <section className="detail-image-section" aria-label="Image attachment">
      <div className="detail-image-heading">
        <h3>Image</h3>
        <div className="detail-image-actions">
          <input ref={fileInput} className="detail-image-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Upload an image" onChange={handleFileChange} disabled={pending} />
          <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={pending}>
            <ImagePlus size={15} aria-hidden="true" />
            {file ? "Replace image" : "Upload image"}
          </Button>
          {file && <Button type="button" variant="ghost" className="detail-image-remove" onClick={() => onFileChange(null)} disabled={pending}>Remove</Button>}
        </div>
      </div>
      {previewUrl ? (
        <div className="detail-image-frame"><Image className="activity-image-preview" src={previewUrl} alt="Selected activity attachment preview" fill sizes="(max-width: 700px) 90vw, 640px" unoptimized /></div>
      ) : (
        <p className="detail-image-empty">No image attached.</p>
      )}
      <p className="detail-image-help">JPG, PNG, WebP, or GIF · maximum 5 MB</p>
    </section>
  );
}

export function AddActivityMenu({ section }: { section: ActivitySection }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [editSection, setEditSection] = useState<ActivitySection>(section);
  const [editCompleted, setEditCompleted] = useState("false");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCreate(formData: FormData) {
    setPending(true);
    try {
      const result = await createActivityAction(formData);
      if (!result.ok || !result.activityId) {
        toast.error(result.message);
        return;
      }

      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.set("entityType", "activity");
        imageFormData.set("entityId", String(result.activityId));
        imageFormData.set("file", imageFile);
        let imageSaved = false;
        let imageError = "Could not save the image.";
        try {
          const response = await fetch("/api/images", { method: "POST", body: imageFormData });
          const imageResult = await response.json() as { ok?: boolean; message?: string };
          imageSaved = response.ok && Boolean(imageResult.ok);
          imageError = imageResult.message ?? imageError;
        } catch {
          imageSaved = false;
        }
        if (imageSaved) {
          router.refresh();
          toast.success("Activity added with image.");
        } else {
          toast.error(`Activity added, but the image could not be attached. ${imageError}`);
        }
      } else {
        toast.success(result.message);
      }
      setOpen(false);
      setContent("");
      setImageFile(null);
    } catch {
      toast.error("Could not add the activity.");
    } finally {
      setPending(false);
    }
  }

  function openAddForm() {
    setContent("");
    setEditSection(section);
    setEditCompleted("false");
    setImageFile(null);
    setOpen(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setContent("");
      setImageFile(null);
    }
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="icon-button" aria-label="Add activity" onClick={openAddForm}>
            <Plus size={18} />
          </TooltipTrigger>
          <TooltipContent>Add activity</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="detail-dialog-content activity-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Add activity</DialogTitle>
              <DialogDescription>Add an activity, choose where it appears, and attach a supporting image.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close activity form"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void handleCreate(new FormData(event.currentTarget)); }} className="activity-edit-form">
            <input type="hidden" name="section" value={editSection} />
            <input type="hidden" name="completed" value={editCompleted} />
            <div className="activity-edit-layout">
              <section className="project-edit-card activity-edit-information">
                <h3>Activity information</h3>
                <label className="field-label">Description<Textarea name="content" minLength={2} maxLength={220} required rows={5} value={content} onChange={(event) => setContent(event.currentTarget.value)} placeholder="Describe the activity" /></label>
                <label className="field-label">Section
                  <ComboboxSelect value={editSection} options={sectionOptions} onValueChange={(value) => {
                    if (value === "TODAY" || value === "YESTERDAY" || value === "OTHER") setEditSection(value);
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
                  <Badge variant={editCompleted === "true" ? "info" : "success"}>{editCompleted === "true" ? "Done" : "In progress"}</Badge>
                </section>
                <ActivityImagePicker file={imageFile} pending={pending} onFileChange={setImageFile} />
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

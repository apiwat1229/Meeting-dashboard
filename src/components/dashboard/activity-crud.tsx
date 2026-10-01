"use client";

import { useRef, useState, type ReactNode } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { createActivityAction, deleteActivityAction, updateActivityAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";

type ActivitySection = "YESTERDAY" | "TODAY" | "OTHER";
type ActivityData = { id: number; content: string; section: ActivitySection; completed: boolean };

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
  const [editSection, setEditSection] = useState<ActivitySection>(activity.section);
  const [editCompleted, setEditCompleted] = useState(String(activity.completed));
  const [confirmAction, setConfirmAction] = useState<"update" | "delete" | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function performConfirmedAction() {
    const form = formRef.current;
    const action = confirmAction;
    if (!form || !action) return;

    setPending(true);
    try {
      const result = action === "update"
        ? await updateActivityAction(new FormData(form))
        : await deleteActivityAction(new FormData(form));
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error(action === "update" ? "Could not update the activity." : "Could not delete the activity.");
    } finally {
      setPending(false);
      setConfirmAction(null);
    }
  }

  function openEditor() {
    setEditSection(activity.section);
    setEditCompleted(String(activity.completed));
    setConfirmAction(null);
    setOpen(true);
  }

  return (
    <ContextMenu as="li" className={activity.completed ? "activity-done" : ""} ariaLabel={`Activity ${activity.content}`} onEdit={openEditor}>
      {children}
      <Popover open={open} onOpenChange={(nextOpen) => {
        // Keep the editor mounted while its confirmation AlertDialog is open.
        // Otherwise the dialog's portaled action is treated as an outside click,
        // unmounting the form before FormData can be submitted.
        if (!nextOpen && confirmAction !== null) return;
        setOpen(nextOpen);
        if (nextOpen) {
          setEditSection(activity.section);
          setEditCompleted(String(activity.completed));
        } else {
          setConfirmAction(null);
        }
      }}>
        <PopoverTrigger render={<span className="editor-popover-anchor" aria-hidden="true" />} nativeButton={false} tabIndex={-1} />
        <PopoverContent className="crud-popover activity-editor-popover" align="end" side="top">
          <div className="crud-popover-heading">
            <h3 className="type-h3">Edit activity</h3>
            <Button type="button" variant="ghost" className="icon-button" onClick={() => setOpen(false)} aria-label="Close activity editor" title="Close"><X size={17} /></Button>
          </div>
          <form ref={formRef} onSubmit={(event) => { event.preventDefault(); setConfirmAction("update"); }} className="crud-form">
            <input type="hidden" name="id" value={activity.id} />
            <label className="field-label">Description<Input name="content" minLength={2} maxLength={220} required defaultValue={activity.content} /></label>
            <input type="hidden" name="section" value={editSection} />
            <label className="field-label">Section
              <ComboboxSelect
                value={editSection}
                options={sectionOptions}
                onValueChange={(value) => {
                  if (value === "TODAY" || value === "YESTERDAY" || value === "OTHER") setEditSection(value);
                }}
              />
            </label>
            <input type="hidden" name="completed" value={editCompleted} />
            <label className="field-label">Status
              <ComboboxSelect
                value={editCompleted}
                options={completionOptions}
                onValueChange={(value) => {
                  if (value === "true" || value === "false") setEditCompleted(value);
                }}
              />
            </label>
            <Button type="submit">Save changes</Button>
          </form>
          <div className="crud-delete-row">
            <Button type="button" variant="ghost" className="crud-delete-trigger" onClick={() => setConfirmAction("delete")}><Trash2 size={14} /> Delete activity</Button>
          </div>
        </PopoverContent>
      </Popover>
      <ConfirmActionDialog
        open={confirmAction !== null}
        onOpenChange={(nextOpen) => { if (!nextOpen) setConfirmAction(null); }}
        title={confirmAction === "delete" ? "Delete this activity?" : "Save activity changes?"}
        description={confirmAction === "delete" ? `Delete “${activity.content}”?` : "Apply the changes to this activity?"}
        actionLabel={confirmAction === "delete" ? "Delete activity" : "Save changes"}
        destructive={confirmAction === "delete"}
        pending={pending}
        onConfirm={() => { void performConfirmedAction(); }}
      />
    </ContextMenu>
  );
}

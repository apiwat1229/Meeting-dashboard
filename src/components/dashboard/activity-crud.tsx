"use client";

import { createContext, useContext, useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { createActivityAction, deleteActivityAction, updateActivityAction } from "@/app/actions";
import { ConfirmActionDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ComboboxSelect } from "@/components/ui/combobox";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { ActivityDetailsDialog, ImageAttachment } from "@/components/dashboard/detail-dialogs";
import { MediaFilePicker, uploadMediaFiles } from "@/components/dashboard/media-file-picker";
import { getBangkokDateKey, shiftDateKey } from "@/lib/date-key";

type ActivitySection = "YESTERDAY" | "TODAY";
type ActivityCategory = "CSR" | "GA" | "SUPPORT" | "GENERAL";
type ActivityData = {
  id: number;
  content: string;
  description: string;
  section: ActivitySection;
  category: ActivityCategory;
  completed: boolean;
  progress: number;
  activityDate: string;
  startDate: string | null;
  finishDate: string | null;
  supplierRequired: boolean;
  supplierName: string | null;
  supplierPhone: string | null;
  beforeEnabled: boolean;
  beforeReason: string;
  beforeMedia: Array<{ id: number; url: string }>;
  afterEnabled: boolean;
  afterReason: string;
  afterMedia: Array<{ id: number; url: string }>;
  media: Array<{ id: number; url: string }>;
  isCarryover?: boolean;
  willCarryOver?: boolean;
};

const completionOptions = [
  { value: "false", label: "In progress" },
  { value: "true", label: "Done" },
];

const activityCategoryOptions = [
  { value: "CSR", label: "CSR programs & community" },
  { value: "GA", label: "GA, grounds & safety" },
  { value: "SUPPORT", label: "Support & coordination" },
  { value: "GENERAL", label: "Other / not categorized" },
] as const;

function activityDateKeyFromDate(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatActivityDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function ActivityDatePicker({
  label,
  name,
  value,
  onChange,
  min,
  max,
}: {
  label: "Start" | "Finish";
  name: "startDate" | "finishDate";
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(`${value}T12:00:00.000Z`) : undefined;

  return (
    <div className="field-label task-date-field">
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className="button button-secondary task-date-picker-trigger"
          aria-label={`${label}, ${value ? formatActivityDate(value) : "not set"}. Choose date`}
        >
          <CalendarDays size={15} aria-hidden="true" />
          <span>{value ? formatActivityDate(value) : "Select date"}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          positionerClassName="project-date-popover-positioner"
          className="date-picker-popover task-date-popover"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            disabled={(date) => {
              const dateKey = activityDateKeyFromDate(date);
              return Boolean((min && dateKey < min) || (max && dateKey > max));
            }}
            onSelect={(date) => {
              if (!date) return;
              onChange(activityDateKeyFromDate(date));
              setOpen(false);
            }}
            timeZone="Asia/Bangkok"
            captionLayout="label"
            className="report-calendar"
          />
          {value && (
            <div className="task-date-popover-footer">
              <Button type="button" variant="ghost" onClick={() => { onChange(""); setOpen(false); }}>
                Clear date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SupplierFields({
  required,
  onRequiredChange,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  supplierNames,
}: {
  required: boolean;
  onRequiredChange: (value: boolean) => void;
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  supplierNames: string[];
}) {
  const supplierListId = useId();

  function changeRequired(value: boolean) {
    onRequiredChange(value);
    if (!value) {
      onNameChange("");
      onPhoneChange("");
    }
  }

  return (
    <section className="project-edit-card supplier-requirement-card">
      <h3>Supplier</h3>
      <input type="hidden" name="supplierRequired" value={String(required)} />
      <label className="supplier-required-toggle">
        <input type="checkbox" checked={required} onChange={(event) => changeRequired(event.currentTarget.checked)} />
        <span>
          <strong>Requires a supplier</strong>
          <small>Choose this if the activity depends on a supplier.</small>
        </span>
      </label>
      {required && (
        <div className="supplier-details-fields">
          <label className="field-label">Supplier name
            <Input name="supplierName" list={supplierListId} maxLength={180} required value={name} onChange={(event) => onNameChange(event.currentTarget.value)} placeholder="Enter supplier name" />
            <datalist id={supplierListId}>
              {supplierNames.map((supplierName) => <option key={supplierName} value={supplierName} />)}
            </datalist>
          </label>
          <label className="field-label">Phone
            <Input name="supplierPhone" maxLength={80} value={phone} onChange={(event) => onPhoneChange(event.currentTarget.value)} placeholder="Enter phone number" />
          </label>
        </div>
      )}
    </section>
  );
}

function ActivityPhotoStageFields({
  phase,
  reason,
  onReasonChange,
  files,
  onFilesChange,
  pending,
  entityId,
  media = [],
}: {
  phase: "BEFORE" | "AFTER";
  reason: string;
  onReasonChange: (reason: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  pending: boolean;
  entityId?: number;
  media?: Array<{ id: number; url: string }>;
}) {
  const stage = phase === "BEFORE" ? "Before" : "After";
  const lowerStage = stage.toLowerCase();
  const reasonName = `${lowerStage}Reason`;

  return (
    <section className="project-edit-card activity-photo-stage">
      <h3>{stage} photos</h3>
      <label className="field-label">Reason (required)
        <Textarea name={reasonName} maxLength={2000} rows={3} required value={reason} onChange={(event) => onReasonChange(event.currentTarget.value)} placeholder={`Explain what the ${lowerStage} photos show`} />
      </label>
      {entityId !== undefined && media.length > 0 && (
        <ImageAttachment
          entityType="activity"
          entityId={entityId}
          initialMedia={media}
          alt={`${stage} photos for this activity`}
          label={`Saved ${lowerStage} photos`}
          activityPhase={phase}
          editable
          allowUpload={false}
        />
      )}
      <MediaFilePicker
        files={files}
        pending={pending}
        onFilesChange={onFilesChange}
        label={`Upload ${lowerStage} photos`}
        imagesOnly
      />
    </section>
  );
}

function ActivityPhotoPairToggle({ enabled, onEnabledChange }: { enabled: boolean; onEnabledChange: (enabled: boolean) => void }) {
  return (
    <section className="project-edit-card activity-photo-pair-toggle-card">
      <h3>Before &amp; After photos</h3>
      <label className="supplier-required-toggle activity-photo-stage-toggle">
        <input type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.currentTarget.checked)} />
        <span>
          <strong>Enable Before &amp; After photo uploads</strong>
          <small>When enabled, provide photos and a reason for both stages.</small>
        </span>
      </label>
    </section>
  );
}

const ActivityCreateContext = createContext<(() => void) | null>(null);

export function ActivityCreateProvider({ section, category: defaultCategory = "GENERAL", children, supplierNames }: { section: ActivitySection; category?: ActivityCategory; children: ReactNode; supplierNames: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [progress, setProgress] = useState("0");
  const [category, setCategory] = useState<ActivityCategory>(defaultCategory);
  const [supplierRequired, setSupplierRequired] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [editCompleted, setEditCompleted] = useState("false");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [beforeEnabled, setBeforeEnabled] = useState(false);
  const [beforeReason, setBeforeReason] = useState("");
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterEnabled, setAfterEnabled] = useState(false);
  const [afterReason, setAfterReason] = useState("");
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);

  async function handleCreate(formData: FormData) {
    setPending(true);
    try {
      const result = await createActivityAction(formData);
      if (!result.ok || !result.activityId) {
        toast.error(result.message);
        return;
      }

      const uploadResults = await Promise.all([
        ...(mediaFiles.length > 0 ? [uploadMediaFiles("activity", result.activityId, mediaFiles)] : []),
        ...(beforeEnabled && beforeFiles.length > 0 ? [uploadMediaFiles("activity", result.activityId, beforeFiles, "BEFORE")] : []),
        ...(afterEnabled && afterFiles.length > 0 ? [uploadMediaFiles("activity", result.activityId, afterFiles, "AFTER")] : []),
      ]);
      const uploaded = uploadResults.reduce((total, item) => total + item.uploaded, 0);
      const failed = uploadResults.flatMap((item) => item.failed);
      if (failed.length > 0) toast.error(`Activity added; ${uploaded} media uploaded, ${failed.length} failed. ${failed[0].message}`);
      else toast.success(uploaded > 0 ? `Activity added with ${uploaded} media file${uploaded === 1 ? "" : "s"}.` : result.message);
      router.refresh();
      setOpen(false);
      setContent("");
      setDescription("");
      setProgress("0");
      setSupplierRequired(false);
      setSupplierName("");
      setSupplierPhone("");
      setMediaFiles([]);
      setBeforeEnabled(false);
      setBeforeReason("");
      setBeforeFiles([]);
      setAfterEnabled(false);
      setAfterReason("");
      setAfterFiles([]);
    } catch {
      toast.error("Could not add the activity.");
    } finally {
      setPending(false);
    }
  }

  function openAddForm() {
    setContent("");
    setDescription("");
    const today = getBangkokDateKey();
    setStartDate(section === "YESTERDAY" ? shiftDateKey(today, -1) : today);
    setFinishDate("");
    setProgress("0");
    setCategory(defaultCategory);
    setSupplierRequired(false);
    setSupplierName("");
    setSupplierPhone("");
    setEditCompleted("false");
    setMediaFiles([]);
    setBeforeEnabled(false);
    setBeforeReason("");
    setBeforeFiles([]);
    setAfterEnabled(false);
    setAfterReason("");
    setAfterFiles([]);
    setOpen(true);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setContent("");
      setDescription("");
      setSupplierRequired(false);
      setSupplierName("");
      setSupplierPhone("");
      setMediaFiles([]);
      setBeforeEnabled(false);
      setBeforeReason("");
      setBeforeFiles([]);
      setAfterEnabled(false);
      setAfterReason("");
      setAfterFiles([]);
    }
  }

  return (
    <ActivityCreateContext.Provider value={openAddForm}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
        <DialogContent className="detail-dialog-content activity-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Add activity</DialogTitle>
              <DialogDescription>Add an activity, set its schedule, and optionally enable paired Before and After photo uploads.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close activity form"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void handleCreate(new FormData(event.currentTarget)); }} className="activity-edit-form">
            <input type="hidden" name="section" value={section} />
            <input type="hidden" name="completed" value={editCompleted} />
            <div className="activity-edit-layout">
              <section className="project-edit-card activity-edit-information">
                <h3>Activity information</h3>
                <label className="field-label">Work area
                  <ComboboxSelect name="category" value={category} options={activityCategoryOptions} onValueChange={(value) => {
                    if (value === "CSR" || value === "GA" || value === "SUPPORT" || value === "GENERAL") setCategory(value);
                  }} />
                </label>
                <label className="field-label">Activity
                  <Input name="content" minLength={2} maxLength={220} required value={content} onChange={(event) => setContent(event.currentTarget.value)} placeholder="Enter an activity name" />
                </label>
                <label className="field-label">Description
                  <Textarea name="description" maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.currentTarget.value)} placeholder="Describe the activity" />
                </label>
                <div className="activity-date-fields">
                  <ActivityDatePicker label="Start" name="startDate" value={startDate} onChange={setStartDate} max={finishDate || undefined} />
                  <ActivityDatePicker label="Finish" name="finishDate" value={finishDate} onChange={setFinishDate} min={startDate || undefined} />
                </div>
                <label className="field-label">Status
                  <ComboboxSelect value={editCompleted} options={completionOptions} onValueChange={(value) => {
                    if (value === "true" || value === "false") {
                      setEditCompleted(value);
                      if (value === "true") setProgress("100");
                    }
                  }} />
                </label>
                <label className="field-label">Progress %
                  <Input name="progress" type="number" min="0" max="100" step="1" required readOnly={editCompleted === "true"} value={progress} onChange={(event) => setProgress(event.currentTarget.value)} />
                </label>
              </section>
              <aside className="activity-edit-side">
                <SupplierFields
                  required={supplierRequired}
                  onRequiredChange={setSupplierRequired}
                  name={supplierName}
                  onNameChange={setSupplierName}
                  phone={supplierPhone}
                  onPhoneChange={setSupplierPhone}
                  supplierNames={supplierNames}
                />
                <MediaFilePicker files={mediaFiles} pending={pending} onFilesChange={setMediaFiles} />
                <ActivityPhotoPairToggle
                  enabled={beforeEnabled || afterEnabled}
                  onEnabledChange={(enabled) => { setBeforeEnabled(enabled); setAfterEnabled(enabled); }}
                />
                <input type="hidden" name="beforeEnabled" value={String(beforeEnabled)} />
                <input type="hidden" name="afterEnabled" value={String(afterEnabled)} />
                {beforeEnabled || afterEnabled ? (
                  <>
                    <ActivityPhotoStageFields
                      phase="BEFORE"
                      reason={beforeReason}
                      onReasonChange={setBeforeReason}
                      files={beforeFiles}
                      onFilesChange={setBeforeFiles}
                      pending={pending}
                    />
                    <ActivityPhotoStageFields
                      phase="AFTER"
                      reason={afterReason}
                      onReasonChange={setAfterReason}
                      files={afterFiles}
                      onFilesChange={setAfterFiles}
                      pending={pending}
                    />
                  </>
                ) : (
                  <>
                    <input type="hidden" name="beforeReason" value={beforeReason} />
                    <input type="hidden" name="afterReason" value={afterReason} />
                  </>
                )}
              </aside>
            </div>
            <div className="project-edit-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add activity"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ActivityCreateContext.Provider>
  );
}

export function AddActivityMenu({ children }: { children: ReactNode }) {
  const openAddForm = useContext(ActivityCreateContext);

  return (
    <button
      type="button"
      className="today-focus-title-trigger"
      aria-haspopup="dialog"
      onClick={() => openAddForm?.()}
    >
      {children}
    </button>
  );
}

export function ActivityEditor({ activity, relatedIssues, children, supplierNames }: { activity: ActivityData; relatedIssues: Array<{ id: number; title: string; severity: "HIGH" | "MEDIUM" | "LOW"; state: "OPEN" | "CLOSED" }>; children: ReactNode; supplierNames: string[] }) {
  const router = useRouter();
  const openAddForm = useContext(ActivityCreateContext);
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editCompleted, setEditCompleted] = useState(String(activity.completed));
  const [startDate, setStartDate] = useState(activity.startDate ?? "");
  const [finishDate, setFinishDate] = useState(activity.finishDate ?? "");
  const [progress, setProgress] = useState(String(activity.progress ?? 0));
  const [category, setCategory] = useState<ActivityCategory>(activity.category);
  const [supplierRequired, setSupplierRequired] = useState(activity.supplierRequired);
  const [supplierName, setSupplierName] = useState(activity.supplierName ?? "");
  const [supplierPhone, setSupplierPhone] = useState(activity.supplierPhone ?? "");
  const [beforeEnabled, setBeforeEnabled] = useState(activity.beforeEnabled || activity.afterEnabled);
  const [beforeReason, setBeforeReason] = useState(activity.beforeReason);
  const [beforeFiles, setBeforeFiles] = useState<File[]>([]);
  const [afterEnabled, setAfterEnabled] = useState(activity.beforeEnabled || activity.afterEnabled);
  const [afterReason, setAfterReason] = useState(activity.afterReason);
  const [afterFiles, setAfterFiles] = useState<File[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);

  async function saveActivity(formData: FormData) {
    setPending(true);
    try {
      const result = await updateActivityAction(formData);
      if (result.ok) {
        const uploadResults = await Promise.all([
          ...(beforeEnabled && beforeFiles.length > 0 ? [uploadMediaFiles("activity", activity.id, beforeFiles, "BEFORE")] : []),
          ...(afterEnabled && afterFiles.length > 0 ? [uploadMediaFiles("activity", activity.id, afterFiles, "AFTER")] : []),
        ]);
        const uploaded = uploadResults.reduce((total, item) => total + item.uploaded, 0);
        const failed = uploadResults.flatMap((item) => item.failed);
        if (failed.length > 0) toast.error(`Activity updated; ${uploaded} photos uploaded, ${failed.length} failed. ${failed[0].message}`);
        else toast.success(result.message);
        router.refresh();
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
    setEditCompleted(String(activity.completed));
    setStartDate(activity.startDate ?? "");
    setFinishDate(activity.finishDate ?? "");
    setProgress(activity.completed ? "100" : String(activity.progress ?? 0));
    setCategory(activity.category);
    setSupplierRequired(activity.supplierRequired);
    setSupplierName(activity.supplierName ?? "");
    setSupplierPhone(activity.supplierPhone ?? "");
    setBeforeEnabled(activity.beforeEnabled || activity.afterEnabled);
    setBeforeReason(activity.beforeReason);
    setBeforeFiles([]);
    setAfterEnabled(activity.beforeEnabled || activity.afterEnabled);
    setAfterReason(activity.afterReason);
    setAfterFiles([]);
    setDetailsOpen(false);
    setConfirmDelete(false);
    setOpen(true);
  }

  return (
    <ContextMenu as="li" className={activity.completed ? "activity-done" : ""} ariaLabel={`Activity ${activity.content}`} onActivate={() => {
      setOpen(false);
      setConfirmDelete(false);
      setDetailsOpen(true);
    }} onCreate={() => openAddForm?.()} createLabel="Add activity" onEdit={openEditor} onDelete={() => {
      setOpen(false);
      setDetailsOpen(false);
      setConfirmDelete(true);
    }}>
      {children}
      <Dialog open={open} disablePointerDismissal onOpenChange={(nextOpen) => {
        if (!nextOpen && confirmDelete) return;
        setOpen(nextOpen);
        if (nextOpen) {
          setEditCompleted(String(activity.completed));
          setStartDate(activity.startDate ?? "");
          setFinishDate(activity.finishDate ?? "");
          setProgress(activity.completed ? "100" : String(activity.progress ?? 0));
          setCategory(activity.category);
          setSupplierRequired(activity.supplierRequired);
          setSupplierName(activity.supplierName ?? "");
          setSupplierPhone(activity.supplierPhone ?? "");
          setBeforeEnabled(activity.beforeEnabled || activity.afterEnabled);
          setBeforeReason(activity.beforeReason);
          setBeforeFiles([]);
          setAfterEnabled(activity.beforeEnabled || activity.afterEnabled);
          setAfterReason(activity.afterReason);
          setAfterFiles([]);
        } else {
          setConfirmDelete(false);
        }
      }}>
        <DialogContent className="detail-dialog-content activity-edit-dialog activity-update-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Edit activity</DialogTitle>
              <DialogDescription>Update the activity, and optionally manage Before and After photos with a reason for each stage.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close activity editor"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void saveActivity(new FormData(event.currentTarget)); }} className="activity-edit-form activity-update-form">
            <input type="hidden" name="id" value={activity.id} />
            <input type="hidden" name="section" value={activity.isCarryover ? "YESTERDAY" : activity.section} />
            <input type="hidden" name="completed" value={editCompleted} />
            <div className="activity-edit-layout activity-update-layout">
              <div className="activity-edit-main activity-update-main">
                <section className="project-edit-card activity-edit-information">
                  <h3>Activity information</h3>
                  <label className="field-label">Work area
                    <ComboboxSelect name="category" value={category} options={activityCategoryOptions} onValueChange={(value) => {
                      if (value === "CSR" || value === "GA" || value === "SUPPORT" || value === "GENERAL") setCategory(value);
                    }} />
                  </label>
                  <label className="field-label">Activity
                    <Input name="content" minLength={2} maxLength={220} required defaultValue={activity.content} />
                  </label>
                  <label className="field-label">Description
                    <Textarea name="description" maxLength={2000} rows={4} defaultValue={activity.description} placeholder="Describe the activity" />
                  </label>
                  <div className="activity-date-fields">
                    <ActivityDatePicker label="Start" name="startDate" value={startDate} onChange={setStartDate} max={finishDate || undefined} />
                    <ActivityDatePicker label="Finish" name="finishDate" value={finishDate} onChange={setFinishDate} min={startDate || undefined} />
                  </div>
                  <label className="field-label">Status
                    <ComboboxSelect
                      value={editCompleted}
                      options={completionOptions}
                      onValueChange={(value) => {
                        if (value === "true" || value === "false") {
                          setEditCompleted(value);
                          if (value === "true") setProgress("100");
                        }
                      }}
                    />
                  </label>
                  <label className="field-label">Progress %
                    <Input name="progress" type="number" min="0" max="100" step="1" required readOnly={editCompleted === "true"} value={progress} onChange={(event) => setProgress(event.currentTarget.value)} />
                  </label>
                </section>
                <SupplierFields
                  required={supplierRequired}
                  onRequiredChange={setSupplierRequired}
                  name={supplierName}
                  onNameChange={setSupplierName}
                  phone={supplierPhone}
                  onPhoneChange={setSupplierPhone}
                  supplierNames={supplierNames}
                />
              </div>
              <aside className="activity-edit-side-scroll activity-update-side-scroll">
                <div className="activity-edit-side">
                  <ImageAttachment entityType="activity" entityId={activity.id} initialMedia={activity.media} alt={`Media attached to ${activity.content}`} editable />
                  <ActivityPhotoPairToggle
                    enabled={beforeEnabled || afterEnabled}
                    onEnabledChange={(enabled) => { setBeforeEnabled(enabled); setAfterEnabled(enabled); }}
                  />
                  <input type="hidden" name="beforeEnabled" value={String(beforeEnabled)} />
                  <input type="hidden" name="afterEnabled" value={String(afterEnabled)} />
                  {beforeEnabled || afterEnabled ? (
                    <>
                      <ActivityPhotoStageFields
                        phase="BEFORE"
                        reason={beforeReason}
                        onReasonChange={setBeforeReason}
                        files={beforeFiles}
                        onFilesChange={setBeforeFiles}
                        pending={pending}
                        entityId={activity.id}
                        media={activity.beforeMedia}
                      />
                      <ActivityPhotoStageFields
                        phase="AFTER"
                        reason={afterReason}
                        onReasonChange={setAfterReason}
                        files={afterFiles}
                        onFilesChange={setAfterFiles}
                        pending={pending}
                        entityId={activity.id}
                        media={activity.afterMedia}
                      />
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="beforeReason" value={beforeReason} />
                      <input type="hidden" name="afterReason" value={afterReason} />
                    </>
                  )}
                </div>
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

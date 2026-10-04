"use client";

import { startTransition, useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getProjectChangeHistoryAction, updateProjectScheduleAction } from "@/app/actions";
import { CalendarDays, History, ImagePlus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { ProjectTaskManager } from "@/components/dashboard/project-subtasks";
import { isSupportedMedia, mediaSizeLimit } from "@/components/dashboard/media-file-picker";

type ImageEntityType = "issue" | "activity";

export type MediaAttachmentData = { id: number; url: string };

export function ImageAttachment({
  entityType,
  entityId,
  initialMedia,
  alt,
  editable = false,
}: {
  entityType: ImageEntityType;
  entityId: number;
  initialMedia: MediaAttachmentData[];
  alt: string;
  editable?: boolean;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [pending, setPending] = useState(false);
  const [previewImage, setPreviewImage] = useState<MediaAttachmentData | null>(null);
  const router = useRouter();

  useEffect(() => setMedia(initialMedia), [initialMedia]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (!files.length) return;
    const invalidType = files.some((file) => !isSupportedMedia(file));
    const invalidSize = files.some((file) => isSupportedMedia(file) && (file.size < 1 || file.size > mediaSizeLimit(file)));
    if (invalidType) toast.error("Use JPG, PNG, WebP, or GIF images, or MP4 or WebM videos.");
    if (invalidSize) toast.error("Images must be under 5 MB and videos under 100 MB.");
    const validFiles = files.filter((file) => isSupportedMedia(file) && file.size > 0 && file.size <= mediaSizeLimit(file));
    if (!validFiles.length) return;
    setPending(true);
    let uploaded = 0;
    const errors: string[] = [];
    try {
      for (const file of validFiles) {
        const formData = new FormData();
        formData.set("entityType", entityType);
        formData.set("entityId", String(entityId));
        formData.set("file", file);
        try {
          const response = await fetch("/api/images", { method: "POST", body: formData });
          const result = await response.json() as { ok?: boolean; message?: string; attachment?: MediaAttachmentData };
          if (!response.ok || !result.ok || !result.attachment) {
            errors.push(`${file.name}: ${result.message ?? "Could not save the media file."}`);
          } else {
            uploaded += 1;
            setMedia((current) => [...current, result.attachment!]);
          }
        } catch {
          errors.push(`${file.name}: Could not save the media file.`);
        }
      }
      if (uploaded > 0) router.refresh();
      if (errors.length === 0) toast.success(`${uploaded} media file${uploaded === 1 ? "" : "s"} uploaded.`);
      else toast.error(`${uploaded} uploaded; ${errors.length} failed. ${errors[0]}`);
    } finally {
      setPending(false);
    }
  }

  async function removeMedia(attachment: MediaAttachmentData) {
    const formData = new FormData();
    formData.set("entityType", entityType);
    formData.set("entityId", String(entityId));
    formData.set("remove", "true");
    formData.set("attachmentId", String(attachment.id));
    setPending(true);
    try {
      const response = await fetch("/api/images", { method: "POST", body: formData });
      const result = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !result.ok) {
        toast.error(result.message ?? "Could not remove the media file.");
        return;
      }
      setMedia((current) => current.filter((item) => item.id !== attachment.id));
      router.refresh();
      toast.success("Media removed.");
    } catch {
      toast.error("Could not remove the media file.");
    } finally {
      setPending(false);
    }
  }

  const singleImage = media.length === 1 && !/\.(mp4|webm)(?:\?.*)?$/i.test(media[0]?.url ?? "");

  return (
    <section className="detail-image-section" aria-label="Media attachment">
      <div className="detail-image-heading">
        <h3>Media</h3>
        {editable && (
          <div className="detail-image-actions">
            <label className="button button-secondary" aria-disabled={pending} onClick={(event) => { if (pending) event.preventDefault(); }}>
              <ImagePlus size={15} aria-hidden="true" />
              {pending ? "Saving…" : "Add media"}
              <input className="detail-image-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple aria-label="Upload images or videos" onChange={(event) => { void handleFiles(event); }} disabled={pending} />
            </label>
          </div>
        )}
      </div>
      {media.length > 0 ? (
        <div className={`media-gallery${singleImage ? " media-gallery-single" : ""}`}>
          {media.map((attachment, index) => {
            const isVideo = /\.(mp4|webm)(?:\?.*)?$/i.test(attachment.url);
            return (
              <article className="media-gallery-item" key={attachment.id}>
                <div className="detail-image-frame">
                  {isVideo
                    ? <video className="activity-media-preview" src={attachment.url} controls playsInline preload="metadata" aria-label={`${alt}, video ${index + 1}`} />
                    : <button type="button" className="media-image-trigger" onClick={() => setPreviewImage(attachment)} aria-label={`Open image ${index + 1} in large view`}>
                      <Image src={attachment.url} alt={`${alt}, image ${index + 1}`} fill sizes="(max-width: 700px) 90vw, 560px" unoptimized />
                    </button>}
                </div>
                {editable && <div className="media-gallery-actions"><span>{isVideo ? "Video" : "Image"} {index + 1}</span><Button type="button" variant="ghost" className="detail-image-remove" aria-label={`Remove media ${index + 1}`} onClick={() => { void removeMedia(attachment); }} disabled={pending}><Trash2 size={14} aria-hidden="true" /> Remove</Button></div>}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="detail-image-empty">No media attached.</p>
      )}
      {editable && <p className="detail-image-help">Images: JPG, PNG, WebP, GIF (5 MB max each) · Videos: MP4, WebM (100 MB max each)</p>}
      <Dialog open={previewImage !== null} onOpenChange={(open) => { if (!open) setPreviewImage(null); }}>
        <DialogContent className="media-preview-dialog" onClick={(event) => event.stopPropagation()}>
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Image preview</DialogTitle>
              <DialogDescription>Close the preview to return to the activity details.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close image preview"><X size={17} /></DialogClose>
          </div>
          {previewImage && (
            <div className="media-preview-frame">
              <Image src={previewImage.url} alt={alt} fill sizes="(max-width: 700px) 94vw, 1200px" unoptimized />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

type IssueDetails = {
  id: number;
  title: string;
  projectName: string | null;
  relatedSection: "YESTERDAY" | "TODAY" | null;
  relatedActivityTitle: string | null;
  severity: "HIGH" | "MEDIUM" | "LOW";
  state: "OPEN" | "CLOSED";
  detail: string;
  nextStep: string;
  prevention: string;
  media: MediaAttachmentData[];
};

export function IssueDetailsDialog({ issue, open, onOpenChange }: { issue: IssueDetails; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="detail-dialog-content issue-details-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="detail-dialog-header">
          <div className="issue-detail-title-group">
            <div className="issue-detail-title-row">
              <DialogTitle>{issue.title}</DialogTitle>
              <Badge variant={issue.state === "CLOSED" ? "success" : issue.severity === "HIGH" ? "danger" : issue.severity === "LOW" ? "neutral" : "warning"}>
                {issue.state === "CLOSED" ? "Done" : issue.severity === "HIGH" ? "High" : issue.severity === "LOW" ? "Low" : "Medium"}
              </Badge>
            </div>
            <DialogDescription>Issue details</DialogDescription>
          </div>
          <DialogClose className="icon-button project-tasks-close" aria-label="Close issue details"><X size={17} /></DialogClose>
        </div>
        {(issue.projectName || issue.relatedSection) && (
          <div className="detail-badges">
            {issue.projectName && <span className="detail-project">{issue.projectName}</span>}
            {issue.relatedSection && (
              <span className="detail-project">
                {issue.relatedSection === "YESTERDAY" ? "Yesterday Activities" : "Activities"}
                {issue.relatedActivityTitle ? ` · ${issue.relatedActivityTitle}` : ""}
              </span>
            )}
          </div>
        )}
        <section className="detail-copy-section">
          <h3>Detail</h3>
          <p>{issue.detail || "No detail provided."}</p>
        </section>
        <section className="detail-copy-section">
          <h3>{issue.state === "CLOSED" ? "Prevention plan" : "Action / Next step"}</h3>
          <p>{issue.state === "CLOSED" ? issue.prevention || "No prevention plan provided." : issue.nextStep || "No next step provided."}</p>
        </section>
        <ImageAttachment entityType="issue" entityId={issue.id} initialMedia={issue.media} alt={`Media attached to ${issue.title}`} />
      </DialogContent>
    </Dialog>
  );
}

type ActivityDetails = {
  id: number;
  content: string;
  severity: "HIGH" | "MEDIUM";
  completed: boolean;
  activityDate: string;
  media: MediaAttachmentData[];
};

type RelatedIssue = { id: number; title: string; severity: "HIGH" | "MEDIUM" | "LOW"; state: "OPEN" | "CLOSED" };

function formatActivityDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function ActivityDetailsDialog({ activity, relatedIssues, open, onOpenChange }: { activity: ActivityDetails; relatedIssues: RelatedIssue[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="detail-dialog-content activity-details-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="detail-dialog-header">
          <div>
            <DialogTitle>{activity.content}</DialogTitle>
          </div>
          <DialogClose className="icon-button project-tasks-close" aria-label="Close activity details"><X size={17} /></DialogClose>
        </div>
        <div className="activity-detail-meta" aria-label="Activity information">
          <section className="activity-detail-meta-item">
            <span className="activity-detail-meta-label">Status</span>
            <div className="activity-detail-meta-value activity-detail-badges">
              <Badge className="activity-detail-status-badge" variant="success">{activity.completed ? "Done" : "On schedule"}</Badge>
            </div>
          </section>
          {!activity.completed && (
            <section className="activity-detail-meta-item">
              <span className="activity-detail-meta-label">Priority</span>
              <div className="activity-detail-meta-value activity-detail-badges">
                <Badge variant={activity.severity === "HIGH" ? "danger" : "warning"}>{activity.severity === "HIGH" ? "High" : "Medium"}</Badge>
              </div>
            </section>
          )}
          <section className="activity-detail-meta-item">
            <span className="activity-detail-meta-label">Date</span>
            <strong className="activity-detail-meta-value">{formatActivityDate(activity.activityDate)}</strong>
          </section>
        </div>
        <section className="detail-copy-section activity-detail-copy">
          <h3>Description</h3>
          <p>{activity.content || "No description provided."}</p>
        </section>
        {relatedIssues.length > 0 && (
          <section className="detail-copy-section related-issue-section">
            <h3>Related issues</h3>
            <ul className="related-issue-list">
              {relatedIssues.map((issue) => (
                <li key={issue.id}>
                  <span>{issue.title}</span>
                  <Badge variant={issue.state === "CLOSED" ? "success" : issue.severity === "HIGH" ? "danger" : issue.severity === "LOW" ? "neutral" : "warning"}>
                    {issue.state === "CLOSED" ? "Done" : issue.severity === "HIGH" ? "High" : issue.severity === "LOW" ? "Low" : "Medium"}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ImageAttachment entityType="activity" entityId={activity.id} initialMedia={activity.media} alt={`Media attached to ${activity.content}`} />
      </DialogContent>
    </Dialog>
  );
}

type ProjectDetails = {
  id: number;
  name: string;
  status: "ON_TRACK" | "ATTENTION" | "DELAY" | "FINISH";
  progress: number;
  yesterday: string;
  today: string;
  startDate: string | null;
  endDate: string | null;
  tasks: Array<{
    id: number;
    projectId: number;
    title: string;
    status: "TODO" | "IN_PROGRESS" | "DONE";
    startDate: string | null;
    endDate: string | null;
  }>;
};

const projectStatusInfo: Record<ProjectDetails["status"], { fill: "success" | "warning" | "danger" | "finish" }> = {
  ON_TRACK: { fill: "success" },
  ATTENTION: { fill: "warning" },
  DELAY: { fill: "danger" },
  FINISH: { fill: "finish" },
};

function formatProjectDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

function projectDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function projectDateKeyFromDate(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function projectDateLabel(project: Pick<ProjectDetails, "startDate" | "endDate">) {
  const parts = [
    project.startDate ? `Start Date: ${formatProjectDate(project.startDate)}` : "",
    project.endDate ? `End Date: ${formatProjectDate(project.endDate)}` : "",
  ].filter(Boolean);
  if (parts.length === 0) return "Start Date: not set · End Date: not set";
  return parts.join(" · ");
}

function ScheduleDatePicker({
  label,
  dateKey,
  otherDateKey,
  disabled,
  onSelect,
}: {
  label: "Start" | "End";
  dateKey: string;
  otherDateKey: string;
  disabled: boolean;
  onSelect: (dateKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = dateKey ? projectDateFromKey(dateKey) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className="button button-secondary project-date-picker-trigger"
        aria-label={`Choose project ${label.toLowerCase()} date`}
        disabled={disabled}
      >
        <CalendarDays size={13} aria-hidden="true" />
        <span className="project-date-picker-label">{label}</span>
        <span>{dateKey ? formatProjectDate(dateKey) : "Select date"}</span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        positionerClassName="project-date-popover-positioner"
        className="date-picker-popover project-date-popover"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onSelect(projectDateKeyFromDate(date));
            setOpen(false);
          }}
          disabled={(date) => {
            const dateKeyValue = projectDateKeyFromDate(date);
            return label === "Start"
              ? Boolean(otherDateKey && dateKeyValue > otherDateKey)
              : Boolean(otherDateKey && dateKeyValue < otherDateKey);
          }}
          timeZone="Asia/Bangkok"
          captionLayout="label"
          className="report-calendar"
        />
        {dateKey && (
          <div className="project-date-popover-footer">
            <Button type="button" variant="ghost" onClick={() => { onSelect(""); setOpen(false); }}>Clear date</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ProjectSchedulePicker({ projectId, startDate, endDate }: { projectId: number; startDate: string | null; endDate: string | null }) {
  const [dates, setDates] = useState({ startDate: startDate ?? "", endDate: endDate ?? "" });
  const [pending, setPending] = useState(false);
  const [pendingChange, setPendingChange] = useState<{ field: "startDate" | "endDate"; value: string } | null>(null);

  useEffect(() => setDates({ startDate: startDate ?? "", endDate: endDate ?? "" }), [projectId, startDate, endDate]);

  async function saveDateChange() {
    if (!pendingChange) return;
    const { field, value } = pendingChange;
    const next = { ...dates, [field]: value };
    setPending(true);

    const formData = new FormData();
    formData.set("id", String(projectId));
    formData.set("startDate", next.startDate);
    formData.set("endDate", next.endDate);

    try {
      const result = await updateProjectScheduleAction(formData);
      if (result.ok) {
        setDates(next);
        setPendingChange(null);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not update the project dates.");
    } finally {
      setPending(false);
    }
  }

  function requestDateChange(field: "startDate" | "endDate", value: string) {
    if (dates[field] === value) return;
    setPendingChange({ field, value });
  }

  const pendingFieldLabel = pendingChange?.field === "startDate" ? "Start date" : "End date";
  const previousDate = pendingChange ? dates[pendingChange.field] : "";

  return (
    <>
      <div className="project-date-range" aria-label={projectDateLabel({ startDate: dates.startDate || null, endDate: dates.endDate || null })}>
        <ScheduleDatePicker
          label="Start"
          dateKey={dates.startDate}
          otherDateKey={dates.endDate}
          disabled={pending}
          onSelect={(value) => requestDateChange("startDate", value)}
        />
        <ScheduleDatePicker
          label="End"
          dateKey={dates.endDate}
          otherDateKey={dates.startDate}
          disabled={pending}
          onSelect={(value) => requestDateChange("endDate", value)}
        />
      </div>
      <Dialog open={Boolean(pendingChange)} onOpenChange={(open) => { if (!open && !pending) setPendingChange(null); }}>
        <DialogContent className="detail-dialog-content project-date-confirm-dialog" onClick={(event) => event.stopPropagation()}>
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Confirm date change</DialogTitle>
              <DialogDescription>Review this project schedule update before saving.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close confirmation" disabled={pending}><X size={17} /></DialogClose>
          </div>
          {pendingChange && (
            <div className="project-date-confirm-change">
              <strong>{pendingFieldLabel}</strong>
              <div className="project-date-confirm-values">
                <div><span>Current date</span><p>{previousDate ? formatProjectDate(previousDate) : "Not set"}</p></div>
                <span className="project-date-confirm-arrow" aria-hidden="true">→</span>
                <div><span>New date</span><p>{pendingChange.value ? formatProjectDate(pendingChange.value) : "Not set"}</p></div>
              </div>
              <p className="project-date-confirm-note">This change will be saved in the project history. You can review it from History.</p>
            </div>
          )}
          <div className="project-date-confirm-actions">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setPendingChange(null)}>Cancel</Button>
            <Button type="button" disabled={pending} onClick={() => { void saveDateChange(); }}>{pending ? "Saving…" : "Confirm date change"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ProjectHistoryEntry = {
  id: number;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
};

const historyFieldLabels: Record<string, string> = {
  name: "Project name",
  status: "Status",
  progress: "Progress",
  yesterday: "Yesterday",
  today: "Today",
  startDate: "Start date",
  endDate: "End date",
};

function formatHistoryValue(field: string, value: string | null) {
  if (value === null || value === "") return field === "startDate" || field === "endDate" ? "Not set" : "Empty";
  if (field === "startDate" || field === "endDate") return formatProjectDate(value);
  if (field === "progress") return `${value}%`;
  if (field === "status") {
    return ({ ON_TRACK: "Ongoing", ATTENTION: "Attention", DELAY: "Delayed", FINISH: "Done" } as Record<string, string>)[value] ?? value;
  }
  return value;
}

function ProjectHistoryDialog({ projectId, open, onOpenChange }: { projectId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [entries, setEntries] = useState<ProjectHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    void getProjectChangeHistoryAction(projectId).then((result) => {
      if (!active) return;
      if (result.ok) setEntries(result.entries);
      else setError(result.message ?? "Could not load project history.");
    }).catch(() => {
      if (active) setError("Could not load project history.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [open, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="detail-dialog-content project-history-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="detail-dialog-header">
          <div>
            <DialogTitle>Change history</DialogTitle>
            <DialogDescription>Project updates and schedule changes</DialogDescription>
          </div>
          <DialogClose className="icon-button project-tasks-close" aria-label="Close project history"><X size={17} /></DialogClose>
        </div>
        {loading ? (
          <p className="project-history-state">Loading history…</p>
        ) : error ? (
          <p className="project-history-state project-history-error" role="alert">{error}</p>
        ) : entries.length === 0 ? (
          <p className="project-history-state">No changes recorded yet.</p>
        ) : (
          <ol className="project-history-list">
            {entries.map((entry) => (
              <li key={entry.id} className="project-history-entry">
                <div className="project-history-entry-heading">
                  <strong>{historyFieldLabels[entry.field] ?? entry.field}</strong>
                  <time dateTime={entry.changedAt}>
                    {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(entry.changedAt))}
                  </time>
                </div>
                <p><span>{formatHistoryValue(entry.field, entry.oldValue)}</span><span aria-hidden="true">→</span><strong>{formatHistoryValue(entry.field, entry.newValue)}</strong></p>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ProjectDetailsDialog({ project, open, onOpenChange }: { project: ProjectDetails; open: boolean; onOpenChange: (open: boolean) => void }) {
  const status = projectStatusInfo[project.status];
  const completedTasks = project.tasks.filter((task) => task.status === "DONE").length;
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="detail-dialog-content project-details-dialog" onClick={(event) => event.stopPropagation()}>
          <div className="detail-dialog-header project-detail-header">
            <div className="project-detail-header-copy">
              <div className="project-detail-title-row">
                <DialogTitle>{project.name}</DialogTitle>
              </div>
            </div>
            <div className="project-detail-meta">
              <ProjectSchedulePicker projectId={project.id} startDate={project.startDate} endDate={project.endDate} />
              <Button type="button" variant="secondary" className="project-history-trigger" onClick={() => setHistoryOpen(true)}>
                <History size={16} aria-hidden="true" /> History
              </Button>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close project details"><X size={17} /></DialogClose>
          </div>
          <section className="detail-copy-section project-detail-progress">
            <div className="project-detail-progress-heading">
              <div className="project-detail-progress-label">
                <h3>Progress</h3>
                <span className="project-task-summary">{project.tasks.length} {project.tasks.length === 1 ? "task" : "tasks"} · {completedTasks} done</span>
              </div>
              <strong>{project.progress}%</strong>
            </div>
            <Progress value={project.progress} tone={status.fill} />
          </section>
          <div className="project-detail-updates">
            <section className="project-daily-update-display" aria-label="Yesterday">
              <span className="project-detail-update-title">Yesterday</span>
              <p>{project.yesterday || "No update recorded."}</p>
            </section>
            <section className="project-daily-update-display" aria-label="Today">
              <span className="project-detail-update-title">Today</span>
              <p>{project.today || "No update recorded."}</p>
            </section>
          </div>
          <ProjectTaskManager projectId={project.id} projectName={project.name} tasks={project.tasks} />
        </DialogContent>
      </Dialog>
      <ProjectHistoryDialog projectId={project.id} open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}

"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getProjectChangeHistoryAction } from "@/app/actions";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, History, ImagePlus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { currentReportDateKey, isSupportedMedia, mediaSizeLimit } from "@/components/dashboard/media-file-picker";

type ImageEntityType = "issue" | "activity";

export type MediaAttachmentData = { id: number; url: string };

function isVideoAttachment(attachment: MediaAttachmentData) {
  return /\.(mp4|webm)(?:\?.*)?$/i.test(attachment.url);
}

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
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(initialMedia[0]?.id ?? null);
  const [previewImageId, setPreviewImageId] = useState<number | null>(null);
  const router = useRouter();

  const selectedMediaIndex = Math.max(0, media.findIndex((item) => item.id === selectedMediaId));
  const selectedMedia = media[selectedMediaIndex] ?? null;
  const images = media.filter((item) => !isVideoAttachment(item));
  const previewImageIndex = images.findIndex((item) => item.id === previewImageId);
  const previewImage = previewImageIndex >= 0 ? images[previewImageIndex] : null;

  // Synchronize optimistic local edits with server data returned by router.refresh().
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMedia(initialMedia);
    setSelectedMediaId((current) => current !== null && initialMedia.some((item) => item.id === current)
      ? current
      : initialMedia[0]?.id ?? null);
    setPreviewImageId((current) => current !== null && initialMedia.some((item) => item.id === current && !isVideoAttachment(item))
      ? current
      : null);
  }, [initialMedia]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function moveSelectedMedia(direction: -1 | 1) {
    const nextMedia = media[selectedMediaIndex + direction];
    if (nextMedia) setSelectedMediaId(nextMedia.id);
  }

  function movePreviewImage(direction: -1 | 1) {
    const nextImage = images[previewImageIndex + direction];
    if (!nextImage) return;
    setPreviewImageId(nextImage.id);
    setSelectedMediaId(nextImage.id);
  }

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
        const reportDate = currentReportDateKey();
        if (reportDate) formData.set("reportDate", reportDate);
        formData.set("file", file);
        try {
          const response = await fetch("/api/images", { method: "POST", body: formData });
          const result = await response.json() as { ok?: boolean; message?: string; attachment?: MediaAttachmentData };
          if (!response.ok || !result.ok || !result.attachment) {
            errors.push(`${file.name}: ${result.message ?? "Could not save the media file."}`);
          } else {
            uploaded += 1;
            setMedia((current) => [...current, result.attachment!]);
            setSelectedMediaId(result.attachment!.id);
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
    const reportDate = currentReportDateKey();
    if (reportDate) formData.set("reportDate", reportDate);
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
      const removedIndex = media.findIndex((item) => item.id === attachment.id);
      const nextMedia = media.filter((item) => item.id !== attachment.id);
      setMedia(nextMedia);
      if (selectedMediaId === attachment.id) {
        setSelectedMediaId(nextMedia[Math.min(removedIndex, nextMedia.length - 1)]?.id ?? null);
      }
      if (previewImageId === attachment.id) setPreviewImageId(null);
      router.refresh();
      toast.success("Media removed.");
    } catch {
      toast.error("Could not remove the media file.");
    } finally {
      setPending(false);
    }
  }

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
        <>
          <div className={`media-carousel${media.length === 1 ? " media-carousel-single" : ""}`} role="group" aria-roledescription="carousel" aria-label="Media carousel">
            {media.length > 1 && <button type="button" className="media-carousel-nav" onClick={() => moveSelectedMedia(-1)} disabled={selectedMediaIndex === 0} aria-label="Previous media"><ChevronLeft size={20} aria-hidden="true" /></button>}
            {selectedMedia && (
              <div className={`media-gallery media-carousel-gallery${media.length === 1 ? " media-gallery-single" : ""}`}>
                <article className="media-gallery-item" key={selectedMedia.id}>
                  <div className="detail-image-frame">
                    {isVideoAttachment(selectedMedia)
                      ? <video className="activity-media-preview" src={selectedMedia.url} controls playsInline preload="metadata" aria-label={`${alt}, video ${selectedMediaIndex + 1}`} />
                      : <button type="button" className="media-image-trigger" onClick={() => setPreviewImageId(selectedMedia.id)} aria-label={`Open image ${images.findIndex((item) => item.id === selectedMedia.id) + 1} in large view`}>
                        <Image src={selectedMedia.url} alt={`${alt}, image ${images.findIndex((item) => item.id === selectedMedia.id) + 1}`} fill sizes="(max-width: 700px) 90vw, 560px" unoptimized />
                      </button>}
                  </div>
                  {editable && <div className="media-gallery-actions"><span>{isVideoAttachment(selectedMedia) ? "Video" : "Image"} {selectedMediaIndex + 1}</span><Button type="button" variant="ghost" className="detail-image-remove" aria-label={`Remove media ${selectedMediaIndex + 1}`} onClick={() => { void removeMedia(selectedMedia); }} disabled={pending}><Trash2 size={14} aria-hidden="true" /> Remove</Button></div>}
                </article>
              </div>
            )}
            {media.length > 1 && <button type="button" className="media-carousel-nav" onClick={() => moveSelectedMedia(1)} disabled={selectedMediaIndex === media.length - 1} aria-label="Next media"><ChevronRight size={20} aria-hidden="true" /></button>}
          </div>
          {media.length > 1 && <p className="media-carousel-count" aria-live="polite">{selectedMediaIndex + 1} / {media.length}</p>}
        </>
      ) : (
        <p className="detail-image-empty">No media attached.</p>
      )}
      {editable && <p className="detail-image-help">Images: JPG, PNG, WebP, GIF (5 MB max each) · Videos: MP4, WebM (100 MB max each)</p>}
      <Dialog open={previewImage !== null} onOpenChange={(open) => { if (!open) setPreviewImageId(null); }}>
        <DialogContent className="media-preview-dialog" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            movePreviewImage(-1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            movePreviewImage(1);
          }
        }}>
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Image preview</DialogTitle>
              <DialogDescription>{images.length > 1 ? "Use the arrows or left and right keys to move between images." : "Close the preview to return to the activity details."}</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close image preview"><X size={17} /></DialogClose>
          </div>
          {previewImage && (
            <div className="media-preview-frame">
              <Image src={previewImage.url} alt={`${alt}, image ${previewImageIndex + 1} of ${images.length}`} fill sizes="(max-width: 700px) 94vw, 1200px" unoptimized />
              {images.length > 1 && <>
                <button type="button" className="media-preview-nav media-preview-nav-previous" onClick={() => movePreviewImage(-1)} disabled={previewImageIndex === 0} aria-label="Previous image"><ChevronLeft size={24} aria-hidden="true" /></button>
                <button type="button" className="media-preview-nav media-preview-nav-next" onClick={() => movePreviewImage(1)} disabled={previewImageIndex === images.length - 1} aria-label="Next image"><ChevronRight size={24} aria-hidden="true" /></button>
              </>}
            </div>
          )}
          {images.length > 1 && <p className="media-preview-count" aria-live="polite">Image {previewImageIndex + 1} of {images.length}</p>}
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
  description: string;
  completed: boolean;
  progress: number;
  startDate: string | null;
  finishDate: string | null;
  supplierRequired: boolean;
  supplierName: string | null;
  supplierPhone: string | null;
  media: MediaAttachmentData[];
};

type RelatedIssue = { id: number; title: string; severity: "HIGH" | "MEDIUM" | "LOW"; state: "OPEN" | "CLOSED" };

function formatActivityDate(dateKey: string | null) {
  if (!dateKey) return "—";
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function ActivityDetailsDialog({ activity, relatedIssues, open, onOpenChange }: { activity: ActivityDetails; relatedIssues: RelatedIssue[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const activityStatusLabel = activity.completed ? "Done" : "In progress";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="detail-dialog-content activity-details-dialog project-details-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="detail-dialog-header project-detail-header activity-project-detail-header">
          <div className="project-detail-header-copy">
            <div className="project-detail-title-row">
              <DialogTitle>{activity.content}</DialogTitle>
              <Badge variant={activity.completed ? "success" : "info"}>{activityStatusLabel}</Badge>
            </div>
            <DialogDescription>Activity overview</DialogDescription>
          </div>
          <DialogClose className="icon-button project-tasks-close" aria-label="Close activity details"><X size={17} /></DialogClose>
        </div>
        <section className="activity-schedule" aria-label="Activity schedule">
          <div className="activity-schedule-card activity-schedule-start">
            <span className="activity-schedule-label"><CalendarDays size={17} aria-hidden="true" /> Start date</span>
            <strong>{activity.startDate ? formatActivityDate(activity.startDate) : "Not set"}</strong>
            <span className="activity-schedule-note">{activity.startDate ? "Activity begins" : "No start date entered"}</span>
          </div>
          <ArrowRight className="activity-schedule-flow" size={22} aria-hidden="true" />
          <div className="activity-schedule-card activity-schedule-finish">
            <span className="activity-schedule-label"><CalendarDays size={17} aria-hidden="true" /> Finish date</span>
            <strong>{activity.finishDate ? formatActivityDate(activity.finishDate) : "Not set"}</strong>
            <span className="activity-schedule-note">{activity.finishDate ? "Target completion" : "No finish date entered"}</span>
          </div>
        </section>
        <section className="detail-copy-section project-detail-progress" aria-label="Activity progress">
          <div className="project-detail-progress-heading">
            <div className="project-detail-progress-label"><h3>Progress</h3></div>
            <strong>{activity.progress}%</strong>
          </div>
          <Progress value={activity.progress} tone={activity.completed ? "finish" : "success"} />
        </section>
        <section className="detail-copy-section project-timeline-section" aria-label={`${activity.content} timeline`}>
          <div className="project-timeline-heading">
            <div><h3>Activity timeline</h3><span>1 step</span></div>
          </div>
          <ol className="project-timeline-list">
            <li className={`project-timeline-step project-timeline-step-${activity.completed ? "done" : "in_progress"}`}>
              <span className="project-timeline-marker" aria-hidden="true">{activity.completed ? "✓" : "1"}</span>
              <div className="project-timeline-step-card">
                <div className="project-timeline-step-heading">
                  <strong>{activity.content}</strong>
                  <span className={`project-task-status-text project-task-status-${activity.completed ? "done" : "in_progress"}`}>{activityStatusLabel}</span>
                </div>
                <p>
                  <span>{activity.startDate ? formatActivityDate(activity.startDate) : "Start date not set"}</span>
                  <span aria-hidden="true">→</span>
                  <span>{activity.finishDate ? formatActivityDate(activity.finishDate) : "Finish date not set"}</span>
                </p>
              </div>
            </li>
          </ol>
        </section>
        <section className="detail-copy-section activity-detail-copy">
          <h3>Description</h3>
          <p>{activity.description || "No description provided."}</p>
        </section>
        {activity.supplierRequired && (
          <section className="detail-copy-section supplier-detail-section">
            <h3>Supplier</h3>
            <dl className="supplier-detail-grid">
              <div><dt>Supplier name</dt><dd>{activity.supplierName || "—"}</dd></div>
              {activity.supplierPhone && <div><dt>Phone</dt><dd>{activity.supplierPhone}</dd></div>}
            </dl>
          </section>
        )}
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

function projectDateLabel(project: Pick<ProjectDetails, "startDate" | "endDate">) {
  const parts = [
    project.startDate ? `Start Date: ${formatProjectDate(project.startDate)}` : "",
    project.endDate ? `End Date: ${formatProjectDate(project.endDate)}` : "",
  ].filter(Boolean);
  if (parts.length === 0) return "Start Date: not set · End Date: not set";
  return parts.join(" · ");
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
  const projectStatusLabel = ({ ON_TRACK: "In progress", ATTENTION: "Needs attention", DELAY: "Delayed", FINISH: "Complete" } as const)[project.status];
  const taskStatusLabel = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" } as const;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="detail-dialog-content project-details-dialog" onClick={(event) => event.stopPropagation()}>
          <div className="detail-dialog-header project-detail-header">
            <div className="project-detail-header-copy">
              <div className="project-detail-title-row">
                <DialogTitle>{project.name}</DialogTitle>
                <Badge variant={project.status === "DELAY" ? "danger" : project.status === "ATTENTION" ? "warning" : project.status === "FINISH" ? "success" : "info"}>{projectStatusLabel}</Badge>
              </div>
            </div>
            <div className="project-detail-meta">
              <Button type="button" variant="secondary" className="project-history-trigger" onClick={() => setHistoryOpen(true)}>
                <History size={16} aria-hidden="true" /> History
              </Button>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close project details"><X size={17} /></DialogClose>
          </div>
          <div className="project-timeline-date-range" aria-label={projectDateLabel(project)}>
            <div><span><CalendarDays size={14} aria-hidden="true" /> Start</span><strong>{project.startDate ? formatProjectDate(project.startDate) : "Not set"}</strong></div>
            <div><span><CalendarDays size={14} aria-hidden="true" /> End</span><strong>{project.endDate ? formatProjectDate(project.endDate) : "Not set"}</strong></div>
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
          <section className="detail-copy-section project-timeline-section" aria-label={`${project.name} timeline`}>
            <div className="project-timeline-heading">
              <div>
                <h3>Project timeline</h3>
                <span>{project.tasks.length} {project.tasks.length === 1 ? "step" : "steps"}</span>
              </div>
            </div>
            {project.tasks.length > 0 ? (
              <ol className="project-timeline-list">
                {project.tasks.map((task, index) => (
                  <li className={`project-timeline-step project-timeline-step-${task.status.toLowerCase()}`} key={task.id}>
                    <span className="project-timeline-marker" aria-hidden="true">{task.status === "DONE" ? "✓" : index + 1}</span>
                    <div className="project-timeline-step-card">
                      <div className="project-timeline-step-heading">
                        <strong>{task.title}</strong>
                        <span className={`project-task-status-text project-task-status-${task.status.toLowerCase()}`}>{taskStatusLabel[task.status]}</span>
                      </div>
                      <p>
                        <span>{task.startDate ? formatProjectDate(task.startDate) : "Start date not set"}</span>
                        <span aria-hidden="true">→</span>
                        <span>{task.endDate ? formatProjectDate(task.endDate) : "End date not set"}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="project-timeline-empty">No timeline steps yet. Add steps from Edit project.</p>
            )}
          </section>
        </DialogContent>
      </Dialog>
      <ProjectHistoryDialog projectId={project.id} open={historyOpen} onOpenChange={setHistoryOpen} />
    </>
  );
}

"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getProjectDateHistoryAction } from "@/app/actions";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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
  allowUpload = true,
  label = "Media",
  activityPhase = "GENERAL",
  comparisonMedia,
  showHeading = true,
  onPreviewOpen,
}: {
  entityType: ImageEntityType;
  entityId: number;
  initialMedia: MediaAttachmentData[];
  alt: string;
  editable?: boolean;
  allowUpload?: boolean;
  label?: string;
  activityPhase?: "GENERAL" | "BEFORE" | "AFTER";
  comparisonMedia?: MediaAttachmentData[];
  showHeading?: boolean;
  onPreviewOpen?: (imageIndex: number) => void;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [pending, setPending] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(initialMedia[0]?.id ?? null);
  const [previewImageId, setPreviewImageId] = useState<number | null>(null);
  const [previewPairIndex, setPreviewPairIndex] = useState(0);
  const router = useRouter();

  const selectedMediaIndex = Math.max(0, media.findIndex((item) => item.id === selectedMediaId));
  const selectedMedia = media[selectedMediaIndex] ?? null;
  const images = media.filter((item) => !isVideoAttachment(item));
  const previewImageIndex = images.findIndex((item) => item.id === previewImageId);
  const previewImage = previewImageIndex >= 0 ? images[previewImageIndex] : null;
  const comparisonImages = (comparisonMedia ?? []).filter((item) => !isVideoAttachment(item));
  const comparisonPairCount = Math.max(images.length, comparisonImages.length);
  const comparisonBeforeImage = activityPhase === "BEFORE"
    ? images[previewPairIndex] ?? null
    : comparisonImages[previewPairIndex] ?? null;
  const comparisonAfterImage = activityPhase === "AFTER"
    ? images[previewPairIndex] ?? null
    : comparisonImages[previewPairIndex] ?? null;

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
    if (comparisonMedia !== undefined) {
      const nextPairIndex = Math.min(Math.max(previewPairIndex + direction, 0), comparisonPairCount - 1);
      setPreviewPairIndex(nextPairIndex);
      const nextOwnImage = images[nextPairIndex];
      if (nextOwnImage) {
        setPreviewImageId(nextOwnImage.id);
        setSelectedMediaId(nextOwnImage.id);
      }
      return;
    }
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
        if (entityType === "activity") formData.set("activityPhase", activityPhase);
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
    <section className="detail-image-section" aria-label={`${label} attachment`}>
      {(showHeading || (editable && allowUpload)) && <div className="detail-image-heading">
        {showHeading && <h3>{label}</h3>}
        {editable && allowUpload && (
          <div className="detail-image-actions">
            <label className="button button-secondary" aria-disabled={pending} onClick={(event) => { if (pending) event.preventDefault(); }}>
              <ImagePlus size={15} aria-hidden="true" />
              {pending ? "Saving…" : "Add media"}
              <input className="detail-image-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple aria-label="Upload images or videos" onChange={(event) => { void handleFiles(event); }} disabled={pending} />
            </label>
          </div>
        )}
      </div>}
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
                      : <button type="button" className="media-image-trigger" onClick={() => {
                        const imageIndex = images.findIndex((item) => item.id === selectedMedia.id);
                        if (onPreviewOpen) {
                          onPreviewOpen(imageIndex);
                          return;
                        }
                        setPreviewImageId(selectedMedia.id);
                        if (comparisonMedia !== undefined) setPreviewPairIndex(Math.max(0, imageIndex));
                      }} aria-label={`Open image ${images.findIndex((item) => item.id === selectedMedia.id) + 1} in large view`}>
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
        editable ? (
          <p className="detail-image-empty">No media attached.</p>
        ) : (
          <Empty className="detail-image-empty-state">
            <EmptyMedia variant="icon"><ImagePlus size={17} aria-hidden="true" /></EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>No media attached</EmptyTitle>
              <EmptyDescription>Images and videos attached to this item will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      )}
      {editable && allowUpload && <p className="detail-image-help">Images: JPG, PNG, WebP, GIF (5 MB max each) · Videos: MP4, WebM (100 MB max each)</p>}
      {!onPreviewOpen && <Dialog open={previewImage !== null} disablePointerDismissal onOpenChange={(open) => { if (!open) setPreviewImageId(null); }}>
        <DialogContent className={`media-preview-dialog${comparisonMedia !== undefined ? " media-comparison-preview-dialog" : ""}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
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
              <DialogTitle>{comparisonMedia !== undefined ? "Before & After comparison" : "Image preview"}</DialogTitle>
              <DialogDescription>{comparisonMedia !== undefined
                ? "Compare both stages side by side. Use the arrows or left and right keys to move through the image pairs."
                : images.length > 1 ? "Use the arrows or left and right keys to move between images." : "Close the preview to return to the activity details."}</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close image preview"><X size={17} /></DialogClose>
          </div>
          {comparisonMedia !== undefined && previewImage ? (
            <>
              <div className="media-comparison-preview-grid">
                <section className="media-comparison-preview-panel">
                  <h3>Before</h3>
                  {comparisonBeforeImage ? (
                    <div className="media-comparison-preview-frame">
                      <Image src={comparisonBeforeImage.url} alt={`${alt}, before image ${previewPairIndex + 1}`} fill sizes="(max-width: 760px) 94vw, 48vw" unoptimized />
                    </div>
                  ) : <p className="media-comparison-preview-empty">No Before image at this position.</p>}
                </section>
                <section className="media-comparison-preview-panel">
                  <h3>After</h3>
                  {comparisonAfterImage ? (
                    <div className="media-comparison-preview-frame">
                      <Image src={comparisonAfterImage.url} alt={`${alt}, after image ${previewPairIndex + 1}`} fill sizes="(max-width: 760px) 94vw, 48vw" unoptimized />
                    </div>
                  ) : <p className="media-comparison-preview-empty">No After image at this position.</p>}
                </section>
              </div>
              {comparisonPairCount > 1 && (
                <div className="media-comparison-preview-controls">
                  <button type="button" className="media-comparison-preview-step" onClick={() => movePreviewImage(-1)} disabled={previewPairIndex === 0} aria-label="Previous image pair"><ChevronLeft size={20} aria-hidden="true" /></button>
                  <p aria-live="polite">Pair {previewPairIndex + 1} of {comparisonPairCount}</p>
                  <button type="button" className="media-comparison-preview-step" onClick={() => movePreviewImage(1)} disabled={previewPairIndex >= comparisonPairCount - 1} aria-label="Next image pair"><ChevronRight size={20} aria-hidden="true" /></button>
                </div>
              )}
            </>
          ) : previewImage && (
            <div className="media-preview-frame">
              <Image src={previewImage.url} alt={`${alt}, image ${previewImageIndex + 1} of ${images.length}`} fill sizes="(max-width: 700px) 94vw, 1200px" unoptimized />
              {images.length > 1 && <>
                <button type="button" className="media-preview-nav media-preview-nav-previous" onClick={() => movePreviewImage(-1)} disabled={previewImageIndex === 0} aria-label="Previous image"><ChevronLeft size={24} aria-hidden="true" /></button>
                <button type="button" className="media-preview-nav media-preview-nav-next" onClick={() => movePreviewImage(1)} disabled={previewImageIndex === images.length - 1} aria-label="Next image"><ChevronRight size={24} aria-hidden="true" /></button>
              </>}
            </div>
          )}
          {comparisonMedia === undefined && images.length > 1 && <p className="media-preview-count" aria-live="polite">Image {previewImageIndex + 1} of {images.length}</p>}
        </DialogContent>
      </Dialog>}
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
  beforeEnabled: boolean;
  beforeReason: string;
  beforeMedia: MediaAttachmentData[];
  afterEnabled: boolean;
  afterReason: string;
  afterMedia: MediaAttachmentData[];
  media: MediaAttachmentData[];
};

type RelatedIssue = { id: number; title: string; severity: "HIGH" | "MEDIUM" | "LOW"; state: "OPEN" | "CLOSED" };
type ActivityPreviewSelection = { phase: "GENERAL" | "BEFORE" | "AFTER"; index: number };

function formatActivityDate(dateKey: string | null) {
  if (!dateKey) return "—";
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function ActivityDetailsDialog({ activity, relatedIssues, open, onOpenChange }: { activity: ActivityDetails; relatedIssues: RelatedIssue[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [previewSelection, setPreviewSelection] = useState<ActivityPreviewSelection | null>(null);
  const activityStatusLabel = activity.completed ? "Done" : "In progress";
  const previewPhase = previewSelection?.phase ?? "GENERAL";
  const previewImages = (previewPhase === "BEFORE" ? activity.beforeMedia : previewPhase === "AFTER" ? activity.afterMedia : activity.media).filter((item) => !isVideoAttachment(item));
  const comparisonImages = (previewPhase === "BEFORE" ? activity.afterMedia : previewPhase === "AFTER" ? activity.beforeMedia : []).filter((item) => !isVideoAttachment(item));
  const previewIsComparison = previewPhase !== "GENERAL" && activity.beforeEnabled && activity.afterEnabled;
  const previewPairCount = previewIsComparison ? Math.max(previewImages.length, comparisonImages.length) : previewImages.length;
  const previewImageIndex = previewSelection?.index ?? 0;
  const previewImage = previewImages[previewImageIndex] ?? null;
  const comparisonBeforeImage = previewPhase === "BEFORE" ? previewImage : comparisonImages[previewImageIndex] ?? null;
  const comparisonAfterImage = previewPhase === "AFTER" ? previewImage : comparisonImages[previewImageIndex] ?? null;

  function openActivityPreview(phase: ActivityPreviewSelection["phase"], imageIndex: number) {
    setPreviewSelection({ phase, index: imageIndex });
    onOpenChange(false);
  }

  function moveActivityPreview(direction: -1 | 1) {
    setPreviewSelection((current) => {
      if (!current) return current;
      const count = previewIsComparison ? previewPairCount : previewImages.length;
      return { ...current, index: Math.min(Math.max(current.index + direction, 0), count - 1) };
    });
  }

  return (
    <>
    <Dialog open={open} disablePointerDismissal onOpenChange={onOpenChange}>
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
        <div className={`activity-details-layout${activity.beforeEnabled && activity.afterEnabled ? " activity-details-layout-comparison" : ""}`}>
          <div className="activity-details-summary">
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
          </div>
          <aside className="activity-details-media-column">
            <section className="detail-copy-section activity-detail-copy">
              <h3>Description</h3>
              <p>{activity.description || "No description provided."}</p>
            </section>
            {(activity.beforeEnabled || activity.afterEnabled) && (
              <section className="activity-photo-comparison" aria-label="Before and after photos">
                <div className="activity-photo-comparison-heading">
                  <h3>{activity.beforeEnabled && activity.afterEnabled ? "Before & After comparison" : "Activity photos"}</h3>
                  <p>{activity.beforeEnabled && activity.afterEnabled ? "Compare the original and completed work." : "Review the photos and their description."}</p>
                </div>
                <div className={`activity-photo-comparison-grid${activity.beforeEnabled && activity.afterEnabled ? " is-paired" : " is-single"}`}>
                  {activity.beforeEnabled && (
                    <article className="activity-photo-comparison-card">
                      <div className="activity-photo-comparison-copy">
                        <h4>Before</h4>
                        <p>{activity.beforeReason}</p>
                      </div>
                      <ImageAttachment entityType="activity" entityId={activity.id} initialMedia={activity.beforeMedia} alt={`Before photos for ${activity.content}`} label="Before photos" activityPhase="BEFORE" comparisonMedia={activity.afterEnabled ? activity.afterMedia : undefined} showHeading={false} onPreviewOpen={(imageIndex) => openActivityPreview("BEFORE", imageIndex)} />
                    </article>
                  )}
                  {activity.afterEnabled && (
                    <article className="activity-photo-comparison-card">
                      <div className="activity-photo-comparison-copy">
                        <h4>After</h4>
                        <p>{activity.afterReason}</p>
                      </div>
                      <ImageAttachment entityType="activity" entityId={activity.id} initialMedia={activity.afterMedia} alt={`After photos for ${activity.content}`} label="After photos" activityPhase="AFTER" comparisonMedia={activity.beforeEnabled ? activity.beforeMedia : undefined} showHeading={false} onPreviewOpen={(imageIndex) => openActivityPreview("AFTER", imageIndex)} />
                    </article>
                  )}
                </div>
              </section>
            )}
            {(activity.media.length > 0 || (!activity.beforeEnabled && !activity.afterEnabled)) && (
              <ImageAttachment entityType="activity" entityId={activity.id} initialMedia={activity.media} alt={`Media attached to ${activity.content}`} onPreviewOpen={(imageIndex) => openActivityPreview("GENERAL", imageIndex)} />
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={previewSelection !== null} disablePointerDismissal onOpenChange={(nextOpen) => {
      if (!nextOpen) {
        setPreviewSelection(null);
        onOpenChange(true);
      }
    }}>
      <DialogContent className={`media-preview-dialog${previewIsComparison ? " media-comparison-preview-dialog" : ""}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveActivityPreview(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          moveActivityPreview(1);
        }
      }}>
        <div className="detail-dialog-header">
          <div>
            <DialogTitle>{previewIsComparison ? "Before & After comparison" : "Image preview"}</DialogTitle>
            <DialogDescription>{previewIsComparison
              ? "Compare both stages side by side. Use the arrows or left and right keys to move through the image pairs."
              : previewImages.length > 1 ? "Use the arrows or left and right keys to move between images." : "Close the preview to return to the activity details."}</DialogDescription>
          </div>
          <DialogClose className="icon-button project-tasks-close" aria-label="Close image preview"><X size={17} /></DialogClose>
        </div>
        {previewIsComparison ? (
          <>
            <div className="media-comparison-preview-grid">
              <section className="media-comparison-preview-panel">
                <h3>Before</h3>
                {comparisonBeforeImage ? (
                  <div className="media-comparison-preview-frame">
                    <Image src={comparisonBeforeImage.url} alt={`Before image pair ${previewImageIndex + 1}`} fill sizes="(max-width: 760px) 94vw, 48vw" unoptimized />
                  </div>
                ) : <p className="media-comparison-preview-empty">No Before image at this position.</p>}
              </section>
              <section className="media-comparison-preview-panel">
                <h3>After</h3>
                {comparisonAfterImage ? (
                  <div className="media-comparison-preview-frame">
                    <Image src={comparisonAfterImage.url} alt={`After image pair ${previewImageIndex + 1}`} fill sizes="(max-width: 760px) 94vw, 48vw" unoptimized />
                  </div>
                ) : <p className="media-comparison-preview-empty">No After image at this position.</p>}
              </section>
            </div>
            {previewPairCount > 1 && (
              <div className="media-comparison-preview-controls">
                <button type="button" className="media-comparison-preview-step" onClick={() => moveActivityPreview(-1)} disabled={previewImageIndex === 0} aria-label="Previous image pair"><ChevronLeft size={20} aria-hidden="true" /></button>
                <p aria-live="polite">Pair {previewImageIndex + 1} of {previewPairCount}</p>
                <button type="button" className="media-comparison-preview-step" onClick={() => moveActivityPreview(1)} disabled={previewImageIndex >= previewPairCount - 1} aria-label="Next image pair"><ChevronRight size={20} aria-hidden="true" /></button>
              </div>
            )}
          </>
        ) : previewImage ? (
          <div className="media-preview-frame">
            <Image src={previewImage.url} alt={`Image ${previewImageIndex + 1} of ${previewImages.length}`} fill sizes="(max-width: 700px) 94vw, 1200px" unoptimized />
            {previewImages.length > 1 && <>
              <button type="button" className="media-preview-nav media-preview-nav-previous" onClick={() => moveActivityPreview(-1)} disabled={previewImageIndex === 0} aria-label="Previous image"><ChevronLeft size={24} aria-hidden="true" /></button>
              <button type="button" className="media-preview-nav media-preview-nav-next" onClick={() => moveActivityPreview(1)} disabled={previewImageIndex === previewImages.length - 1} aria-label="Next image"><ChevronRight size={24} aria-hidden="true" /></button>
            </>}
          </div>
        ) : null}
        {!previewIsComparison && previewImages.length > 1 && <p className="media-preview-count" aria-live="polite">Image {previewImageIndex + 1} of {previewImages.length}</p>}
      </DialogContent>
    </Dialog>
    </>
  );
}

type ProjectDetails = {
  id: number;
  name: string;
  status: "ON_TRACK" | "ATTENTION" | "DELAY" | "FINISH";
  isRescheduled: boolean;
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

type ProjectDateHistoryEntry = {
  id: number;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
};

function ProjectScheduleHistory({ projectId }: { projectId: number }) {
  const [entries, setEntries] = useState<ProjectDateHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getProjectDateHistoryAction(projectId).then((result) => {
      if (!active) return;
      if (result.ok) setEntries(result.entries);
      else setError(result.message ?? "Could not load date changes.");
    }).catch(() => {
      if (active) setError("Could not load date changes.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [projectId]);

  const scheduleEntries = [...entries].reverse();

  if (!loading && !error && scheduleEntries.length === 0) return null;

  return (
    <section className="project-schedule-history" aria-label="Schedule date changes" aria-live="polite">
      <div className="project-schedule-history-heading">
        <h3>Date changes</h3>
      </div>
      {loading ? (
        <p className="project-schedule-history-state">Loading date changes…</p>
      ) : error ? (
        <p className="project-schedule-history-state project-schedule-history-error" role="alert">{error}</p>
      ) : (
        <ol className="project-schedule-history-list">
          {scheduleEntries.map((entry) => (
            <li key={entry.id} className="project-schedule-history-entry">
              <span className="project-schedule-history-field">{entry.field === "startDate" ? "Start date" : "End date"}</span>
              <p className="project-schedule-history-transition">
                {entry.oldValue ? <del>{formatProjectDate(entry.oldValue)}</del> : <span className="project-schedule-history-unset">Not set</span>}
                <ArrowRight size={14} aria-hidden="true" />
                <strong>{entry.newValue ? formatProjectDate(entry.newValue) : "Not set"}</strong>
              </p>
              <time dateTime={entry.changedAt}>
                {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(entry.changedAt))}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function ProjectDetailsDialog({ project, open, onOpenChange }: { project: ProjectDetails; open: boolean; onOpenChange: (open: boolean) => void }) {
  const status = projectStatusInfo[project.status];
  const progressTone = status.fill;
  const completedTasks = project.tasks.filter((task) => task.status === "DONE").length;
  const projectStatusLabel = ({ ON_TRACK: "On schedule", ATTENTION: "Needs attention", DELAY: "Delayed", FINISH: "Complete" } as const)[project.status];
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
                {project.isRescheduled && <Badge variant="info" className="project-rescheduled-status">Rescheduled</Badge>}
              </div>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close project details"><X size={17} /></DialogClose>
          </div>
          <section className="activity-schedule" aria-label={projectDateLabel(project)}>
            <div className="activity-schedule-card activity-schedule-start">
              <span className="activity-schedule-label"><CalendarDays size={17} aria-hidden="true" /> Start date</span>
              <strong>{project.startDate ? formatProjectDate(project.startDate) : "Not set"}</strong>
              <span className="activity-schedule-note">{project.startDate ? "Project begins" : "No start date entered"}</span>
            </div>
            <ArrowRight className="activity-schedule-flow" size={22} aria-hidden="true" />
            <div className="activity-schedule-card activity-schedule-finish">
              <span className="activity-schedule-label"><CalendarDays size={17} aria-hidden="true" /> End date</span>
              <strong>{project.endDate ? formatProjectDate(project.endDate) : "Not set"}</strong>
              <span className="activity-schedule-note">{project.endDate ? "Target completion" : "No end date entered"}</span>
            </div>
          </section>
          {open && <ProjectScheduleHistory projectId={project.id} />}
          <section className="detail-copy-section project-detail-progress">
            <div className="project-detail-progress-heading">
              <div className="project-detail-progress-label">
                <h3>Progress</h3>
                <span className="project-task-summary">{project.tasks.length} {project.tasks.length === 1 ? "task" : "tasks"} · {completedTasks} done</span>
              </div>
              <strong>{project.progress}%</strong>
            </div>
            <Progress value={project.progress} tone={progressTone} />
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
    </>
  );
}

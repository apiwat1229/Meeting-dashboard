"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";

type ImageEntityType = "issue" | "activity";

export function ImageAttachment({
  entityType,
  entityId,
  initialImageUrl,
  alt,
  editable = false,
}: {
  entityType: ImageEntityType;
  entityId: number;
  initialImageUrl: string;
  alt: string;
  editable?: boolean;
}) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [pending, setPending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => setImageUrl(initialImageUrl), [initialImageUrl]);

  async function updateImage(formData: FormData, successMessage: string) {
    setPending(true);
    try {
      const response = await fetch("/api/images", { method: "POST", body: formData });
      const result = await response.json() as { ok?: boolean; message?: string; imageUrl?: string };
      if (!response.ok || !result.ok) {
        toast.error(result.message ?? "Could not save the image.");
        return;
      }
      setImageUrl(result.imageUrl ?? "");
      router.refresh();
      toast.success(successMessage);
    } catch {
      toast.error("Could not save the image.");
    } finally {
      setPending(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Choose an image smaller than 5 MB.");
      return;
    }

    const formData = new FormData();
    formData.set("entityType", entityType);
    formData.set("entityId", String(entityId));
    formData.set("file", file);
    void updateImage(formData, imageUrl ? "Image replaced." : "Image uploaded.");
  }

  function removeImage() {
    const formData = new FormData();
    formData.set("entityType", entityType);
    formData.set("entityId", String(entityId));
    formData.set("remove", "true");
    void updateImage(formData, "Image removed.");
  }

  return (
    <section className="detail-image-section" aria-label="Image attachment">
      <div className="detail-image-heading">
        <h3>Image</h3>
        {editable && (
          <div className="detail-image-actions">
            <input
              ref={fileInput}
              className="detail-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              aria-label="Upload an image"
              onChange={handleFileChange}
              disabled={pending}
            />
            <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()} disabled={pending}>
              <ImagePlus size={15} aria-hidden="true" />
              {pending ? "Saving…" : imageUrl ? "Replace image" : "Upload image"}
            </Button>
            {imageUrl && (
              <Button type="button" variant="ghost" className="detail-image-remove" onClick={removeImage} disabled={pending}>
                <Trash2 size={15} aria-hidden="true" /> Remove
              </Button>
            )}
          </div>
        )}
      </div>
      {imageUrl ? (
        <div className="detail-image-frame">
          <Image src={imageUrl} alt={alt} fill sizes="(max-width: 700px) 90vw, 640px" unoptimized />
        </div>
      ) : (
        <p className="detail-image-empty">No image attached.</p>
      )}
      {editable && <p className="detail-image-help">JPG, PNG, WebP, or GIF · maximum 5 MB</p>}
    </section>
  );
}

type IssueDetails = {
  id: number;
  title: string;
  projectName: string | null;
  severity: "HIGH" | "MEDIUM" | "LOW";
  state: "OPEN" | "CLOSED";
  detail: string;
  nextStep: string;
  prevention: string;
  imageUrl: string;
};

export function IssueDetailsDialog({ issue, open, onOpenChange }: { issue: IssueDetails; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="detail-dialog-content" onClick={(event) => event.stopPropagation()}>
        <div className="detail-dialog-header">
          <div>
            <DialogTitle>{issue.title}</DialogTitle>
            <DialogDescription>Issue details</DialogDescription>
          </div>
          <DialogClose className="icon-button project-tasks-close" aria-label="Close issue details"><X size={17} /></DialogClose>
        </div>
        <div className="detail-badges">
          <Badge variant={issue.state === "CLOSED" ? "success" : issue.severity === "HIGH" ? "danger" : issue.severity === "LOW" ? "neutral" : "warning"}>
            {issue.state === "CLOSED" ? "Done" : issue.severity === "HIGH" ? "High" : issue.severity === "LOW" ? "Low" : "Medium"}
          </Badge>
          {issue.projectName && <span className="detail-project">{issue.projectName}</span>}
        </div>
        <section className="detail-copy-section">
          <h3>Detail</h3>
          <p>{issue.detail || "No detail provided."}</p>
        </section>
        <section className="detail-copy-section">
          <h3>{issue.state === "CLOSED" ? "Prevention plan" : "Action / Next step"}</h3>
          <p>{issue.state === "CLOSED" ? issue.prevention || "No prevention plan provided." : issue.nextStep || "No next step provided."}</p>
        </section>
        <ImageAttachment entityType="issue" entityId={issue.id} initialImageUrl={issue.imageUrl} alt={`Image attached to ${issue.title}`} />
      </DialogContent>
    </Dialog>
  );
}

type ActivityDetails = {
  id: number;
  content: string;
  section: "YESTERDAY" | "TODAY" | "OTHER";
  completed: boolean;
  activityDate: string;
  imageUrl: string;
};

const sectionLabels: Record<ActivityDetails["section"], string> = {
  TODAY: "Today Other Activities",
  YESTERDAY: "Yesterday Other Activities",
  OTHER: "Other Topics",
};

function formatActivityDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function ActivityDetailsDialog({ activity, open, onOpenChange }: { activity: ActivityDetails; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="detail-dialog-content" onClick={(event) => event.stopPropagation()}>
        <div className="detail-dialog-header">
          <div>
            <DialogTitle>{activity.content}</DialogTitle>
            <DialogDescription>Activity details</DialogDescription>
          </div>
          <DialogClose className="icon-button project-tasks-close" aria-label="Close activity details"><X size={17} /></DialogClose>
        </div>
        <div className="detail-badges">
          <Badge variant={activity.completed ? "success" : "neutral"}>{activity.completed ? "Done" : "In progress"}</Badge>
          <span className="detail-project">{sectionLabels[activity.section]}</span>
          <span className="detail-project">{formatActivityDate(activity.activityDate)}</span>
        </div>
        <section className="detail-copy-section">
          <h3>Description</h3>
          <p>{activity.content}</p>
        </section>
        <ImageAttachment entityType="activity" entityId={activity.id} initialImageUrl={activity.imageUrl} alt={`Image attached to ${activity.content}`} />
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
  tasks: Array<{ id: number; title: string; status: "TODO" | "IN_PROGRESS" | "DONE" }>;
};

const projectStatusInfo: Record<ProjectDetails["status"], { label: string; variant: "success" | "warning" | "danger" | "neutral"; fill: "success" | "warning" | "danger" | "finish" }> = {
  ON_TRACK: { label: "Ongoing", variant: "success", fill: "success" },
  ATTENTION: { label: "Needs attention", variant: "warning", fill: "warning" },
  DELAY: { label: "Delayed", variant: "danger", fill: "danger" },
  FINISH: { label: "Early completion", variant: "neutral", fill: "finish" },
};

const taskStatusInfo: Record<ProjectDetails["tasks"][number]["status"], { label: string; variant: "success" | "warning" | "neutral" }> = {
  TODO: { label: "To do", variant: "neutral" },
  IN_PROGRESS: { label: "In progress", variant: "warning" },
  DONE: { label: "Done", variant: "success" },
};

export function ProjectDetailsDialog({ project, open, onOpenChange }: { project: ProjectDetails; open: boolean; onOpenChange: (open: boolean) => void }) {
  const status = projectStatusInfo[project.status];
  const completedTasks = project.tasks.filter((task) => task.status === "DONE").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="detail-dialog-content project-details-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="detail-dialog-header">
          <div>
            <DialogTitle>{project.name}</DialogTitle>
            <DialogDescription>Project overview and work details</DialogDescription>
          </div>
          <DialogClose className="icon-button project-tasks-close" aria-label="Close project details"><X size={17} /></DialogClose>
        </div>
        <div className="detail-badges">
          <Badge variant={status.variant} className={project.status === "FINISH" ? "project-detail-status-finish" : ""}>{status.label}</Badge>
          <span className="detail-project">{project.tasks.length} {project.tasks.length === 1 ? "task" : "tasks"} · {completedTasks} done</span>
        </div>
        <section className="detail-copy-section project-detail-progress">
          <div className="project-detail-progress-heading"><h3>Progress</h3><strong>{project.progress}%</strong></div>
          <Progress value={project.progress} tone={status.fill} />
        </section>
        <div className="project-detail-updates">
          <section className="detail-copy-section">
            <h3>Yesterday</h3>
            <p>{project.yesterday || "No update recorded."}</p>
          </section>
          <section className="detail-copy-section">
            <h3>Today</h3>
            <p>{project.today || "No update recorded."}</p>
          </section>
        </div>
        <section className="detail-copy-section project-detail-task-section">
          <h3>Subtasks</h3>
          {project.tasks.length ? (
            <ul className="project-detail-task-list">
              {project.tasks.map((task) => {
                const taskStatus = taskStatusInfo[task.status];
                return (
                  <li className="project-detail-task" key={task.id}>
                    <span>{task.title}</span>
                    <Badge variant={taskStatus.variant}>{taskStatus.label}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No subtasks have been added.</p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

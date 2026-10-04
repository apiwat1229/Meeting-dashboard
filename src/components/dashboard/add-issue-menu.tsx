"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createIssueAction } from "@/app/actions";
import { IssueActivityLinkFields, type IssueActivityOption } from "@/components/dashboard/issue-activity-link-fields";
import { Button } from "@/components/ui/button";
import { ComboboxSelect } from "@/components/ui/combobox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { MediaFilePicker, uploadMediaFiles } from "@/components/dashboard/media-file-picker";

type ProjectOption = { id: number; name: string };
type RelatedSection = "none" | "YESTERDAY" | "TODAY";

const severityOptions = [
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
];

const sectionLabels: Record<Exclude<RelatedSection, "none">, string> = {
  TODAY: "Activities",
  YESTERDAY: "Yesterday Activities",
};

export function AddIssueMenu({ projects, activities }: { projects: ProjectOption[]; activities: IssueActivityOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [projectId, setProjectId] = useState("none");
  const [severity, setSeverity] = useState("MEDIUM");
  const [relatedSection, setRelatedSection] = useState<RelatedSection>("none");
  const [relatedActivityId, setRelatedActivityId] = useState("none");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const selectedProject = projects.find((project) => String(project.id) === projectId);
  const selectedActivity = activities.find((activity) => String(activity.id) === relatedActivityId);

  function resetForm() {
    setTitle("");
    setDetail("");
    setNextStep("");
    setProjectId("none");
    setSeverity("MEDIUM");
    setRelatedSection("none");
    setRelatedActivityId("none");
    setMediaFiles([]);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  }

  async function handleCreate(formData: FormData) {
    setPending(true);
    try {
      const result = await createIssueAction(formData);
      if (result.ok) {
        if (mediaFiles.length > 0 && result.issueId) {
          const uploadResult = await uploadMediaFiles("issue", result.issueId, mediaFiles);
          if (uploadResult.uploaded > 0) router.refresh();
          if (uploadResult.failed.length > 0) toast.error(`Issue added; ${uploadResult.uploaded} media uploaded, ${uploadResult.failed.length} failed. ${uploadResult.failed[0].message}`);
          else toast.success(`Issue added with ${uploadResult.uploaded} media file${uploadResult.uploaded === 1 ? "" : "s"}.`);
        } else {
          toast.success(result.message);
        }
        handleOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Could not add the issue.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="icon-button" aria-label="Add issue" onClick={() => setOpen(true)}>
            <Plus size={18} />
          </TooltipTrigger>
          <TooltipContent>Add issue</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="detail-dialog-content issue-create-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Add issue</DialogTitle>
              <DialogDescription>Add an issue, link it to a project or activity, and describe the next step.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close issue form"><X size={17} /></DialogClose>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void handleCreate(new FormData(event.currentTarget)); }} className="issue-create-form">
            <div className="issue-create-layout">
              <section className="project-edit-card issue-create-related-fields">
                <h3>Related to</h3>
                <label className="field-label">Related project
                  <ComboboxSelect name="projectId" options={[{ value: "none", label: "No linked project" }, ...projects.map((project) => ({ value: String(project.id), label: project.name }))]} value={projectId} onValueChange={(value) => setProjectId(value ?? "none")} placeholder="No linked project" searchPlaceholder="Search projects..." emptyMessage="No matching projects." />
                </label>
                <IssueActivityLinkFields
                  key={open ? "open" : "closed"}
                  activities={activities}
                  onSelectionChange={(section, activityId) => {
                    setRelatedSection(section);
                    setRelatedActivityId(activityId);
                  }}
                />
              </section>
              <aside className="issue-create-side">
                <section className="project-edit-card issue-create-summary">
                  <h3>New issue</h3>
                  <label className="field-label">Issue title
                    <Input name="title" minLength={3} maxLength={180} required value={title} onChange={(event) => setTitle(event.currentTarget.value)} placeholder="Short issue title" />
                  </label>
                  <label className="field-label">Severity
                    <ComboboxSelect name="severity" options={severityOptions} value={severity} onValueChange={(value) => { if (value === "HIGH" || value === "MEDIUM") setSeverity(value); }} />
                  </label>
                  <span>Issues / Trouble{selectedProject ? ` · ${selectedProject.name}` : ""}</span>
                  {(relatedSection !== "none" || selectedActivity) && (
                    <span className="issue-create-related">{selectedActivity?.content ?? (relatedSection !== "none" ? sectionLabels[relatedSection] : "")}</span>
                  )}
                </section>
                <section className="project-edit-card issue-create-response">
                  <h3>Details and response</h3>
                  <label className="field-label">Detail
                    <Textarea name="detail" maxLength={1000} rows={3} value={detail} onChange={(event) => setDetail(event.currentTarget.value)} placeholder="What is happening?" />
                  </label>
                  <label className="field-label">Next step
                    <Textarea name="nextStep" maxLength={500} rows={2} value={nextStep} onChange={(event) => setNextStep(event.currentTarget.value)} placeholder="Owner / next action / due time" />
                  </label>
                </section>
                <MediaFilePicker files={mediaFiles} pending={pending} onFilesChange={setMediaFiles} className="project-edit-card issue-create-media" frameClassName="issue-create-media-grid" label="Media" />
              </aside>
            </div>
            <div className="project-edit-actions">
              <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)} disabled={pending}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Adding…" : <><Plus size={15} /> Add issue</>}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { clearDashboardFocusAction, saveDashboardFocusAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";

type ActivitySection = "TODAY" | "YESTERDAY" | "OTHER";
type ActivityOption = { id: number; content: string; section: ActivitySection; completed: boolean };

const sectionLabels: Record<ActivitySection, string> = {
  TODAY: "Today Other Activities",
  YESTERDAY: "Yesterday Other Activities",
  OTHER: "Other Topics",
};

export function TodayFocus({
  title,
  detail,
  linkedActivity,
  activities,
}: {
  title: string;
  detail: string;
  linkedActivity: ActivityOption | null;
  activities: ActivityOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [focusTitle, setFocusTitle] = useState(title);
  const [focusDetail, setFocusDetail] = useState(detail);
  const [activityId, setActivityId] = useState(linkedActivity ? String(linkedActivity.id) : "");
  const [pending, setPending] = useState(false);

  const shownTitle = linkedActivity?.content || title || "Set today’s focus";

  function beginEditing() {
    setFocusTitle(linkedActivity?.content || title);
    setFocusDetail(detail);
    setActivityId(linkedActivity ? String(linkedActivity.id) : "");
    setOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await saveDashboardFocusAction(new FormData(event.currentTarget));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not save Today’s Focus.");
    } finally {
      setPending(false);
    }
  }

  async function clear() {
    setPending(true);
    try {
      const result = await clearDashboardFocusAction();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not clear Today’s Focus.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="summary-focus-trigger" onClick={beginEditing} aria-label="Edit Today’s Focus">
        <span className="summary-focus">
          <strong>{shownTitle}</strong>
          <span>{detail || (linkedActivity ? sectionLabels[linkedActivity.section] : "Click to choose or edit today’s focus")}</span>
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="detail-dialog-content focus-edit-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Edit Today’s Focus</DialogTitle>
              <DialogDescription>Write a focus item or link it to an activity below. Linked titles stay in sync with that activity.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close focus editor"><X size={17} /></DialogClose>
          </div>
          <form className="focus-edit-form" onSubmit={save}>
            <label className="field-label" htmlFor="focus-activity">Link to an activity
              <select
                id="focus-activity"
                name="activityId"
                className="ui-input focus-activity-select"
                value={activityId}
                onChange={(event) => {
                  const nextId = event.currentTarget.value;
                  setActivityId(nextId);
                  const activity = activities.find((item) => String(item.id) === nextId);
                  if (activity) setFocusTitle(activity.content);
                }}
              >
                <option value="">Custom focus (not linked)</option>
                {(["TODAY", "YESTERDAY", "OTHER"] as const).map((section) => {
                  const options = activities.filter((activity) => activity.section === section);
                  return options.length > 0 ? (
                    <optgroup label={sectionLabels[section]} key={section}>
                      {options.map((activity) => (
                        <option value={activity.id} key={activity.id}>
                          {activity.content}{activity.completed ? " · Done" : " · In progress"}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
            </label>
            <label className="field-label" htmlFor="focus-title">Focus title
              <Input
                id="focus-title"
                name="focusTitle"
                value={focusTitle}
                required
                maxLength={140}
                placeholder="What needs attention today?"
                onChange={(event) => {
                  setFocusTitle(event.currentTarget.value);
                  if (activityId) setActivityId("");
                }}
              />
            </label>
            <label className="field-label" htmlFor="focus-detail">Details
              <Textarea id="focus-detail" name="focusDetail" value={focusDetail} maxLength={500} rows={3} placeholder="Add context, next step, or deadline" onChange={(event) => setFocusDetail(event.currentTarget.value)} />
            </label>
            <div className="focus-edit-actions">
              <Button type="button" variant="ghost" onClick={() => void clear()} disabled={pending}>Clear focus</Button>
              <div>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
                <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save focus"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

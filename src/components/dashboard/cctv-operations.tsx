"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Clock3, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { saveCctvOperationsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { formatCctvDate, formatCctvDuration, type CctvMeeting } from "@/lib/cctv-operations";

type CctvOperationsProps = {
  recorderItems: string[];
  meetings: CctvMeeting[];
};

export function CctvOperationsPanel({ recorderItems, meetings }: CctvOperationsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [itemDrafts, setItemDrafts] = useState<string[]>(recorderItems);
  const [meetingDrafts, setMeetingDrafts] = useState<CctvMeeting[]>(meetings);

  function openEditor() {
    setItemDrafts([...recorderItems]);
    setMeetingDrafts(meetings.map((meeting) => ({ ...meeting })));
    setOpen(true);
  }

  function updateMeeting(id: string, changes: Partial<CctvMeeting>) {
    setMeetingDrafts((current) => current.map((meeting) => meeting.id === id ? { ...meeting, ...changes } : meeting));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("cctvOperations", JSON.stringify({ recorderItems: itemDrafts, meetings: meetingDrafts }));
      const result = await saveCctvOperationsAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Could not save CCTV recorder information.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="cctv-operations-panel" aria-label="CCTV recorder information">
        <div className="cctv-operations-heading">
          <h3>CCTV Recorders</h3>
          <Button type="button" variant="ghost" className="cctv-operations-manage" onClick={openEditor} aria-label="Manage CCTV recorder items and meetings">
            <Pencil size={14} aria-hidden="true" />
            <span>Manage</span>
          </Button>
        </div>
        {recorderItems.length > 0 ? (
          <ul className="cctv-recorder-list">
            {recorderItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
          </ul>
        ) : (
          <p className="cctv-operations-empty">No recorder items yet.</p>
        )}

        <div className="cctv-meeting-section">
          <h4>CCTV Meeting</h4>
          {meetings.length > 0 ? meetings.map((meeting) => (
            <dl className="cctv-meeting-details" key={meeting.id}>
              <div>
                <dt><CalendarDays size={13} aria-hidden="true" />Date</dt>
                <dd><time dateTime={meeting.date}>{formatCctvDate(meeting.date)}</time></dd>
              </div>
              <div>
                <dt><Clock3 size={13} aria-hidden="true" />Time</dt>
                <dd>{meeting.startTime} - {meeting.endTime} ({formatCctvDuration(meeting.startTime, meeting.endTime)})</dd>
              </div>
              <div>
                <dt><Users size={13} aria-hidden="true" />Member</dt>
                <dd className="cctv-meeting-members">{meeting.members.trim() || "—"}</dd>
              </div>
            </dl>
          )) : (
            <p className="cctv-operations-empty">No meetings scheduled.</p>
          )}
        </div>
      </section>

      <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) setOpen(nextOpen); }}>
        <DialogContent className="detail-dialog-content cctv-operations-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>Manage CCTV Recorders</DialogTitle>
              <DialogDescription>Update recorder items and one-time CCTV meeting dates. Meetings are not recurring.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close CCTV recorder manager"><X size={17} /></DialogClose>
          </div>
          <form className="cctv-operations-form" onSubmit={(event) => { void save(event); }}>
            <section className="project-edit-card cctv-manager-section">
              <div className="cctv-manager-section-heading">
                <div>
                  <h3>CCTV Recorders</h3>
                  <p>Manage the items shown in the CCTV card.</p>
                </div>
                <Button type="button" variant="secondary" onClick={() => setItemDrafts((current) => [...current, ""])} disabled={pending}>
                  <Plus size={15} aria-hidden="true" /> Add item
                </Button>
              </div>
              {itemDrafts.length > 0 ? (
                <div className="cctv-manager-items">
                  {itemDrafts.map((item, index) => (
                    <div className="cctv-manager-item" key={`recorder-item-${index}`}>
                      <Input
                        aria-label={`Recorder item ${index + 1}`}
                        required
                        maxLength={120}
                        value={item}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          setItemDrafts((current) => current.map((itemValue, itemIndex) => itemIndex === index ? value : itemValue));
                        }}
                      />
                      <button
                        type="button"
                        className="cctv-manager-remove"
                        aria-label={`Remove ${item || `recorder item ${index + 1}`}`}
                        onClick={() => setItemDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        disabled={pending}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="cctv-manager-empty">No recorder items. Add an item to show it on the dashboard.</p>
              )}
            </section>

            <section className="project-edit-card cctv-manager-section">
              <div className="cctv-manager-section-heading">
                <div>
                  <h3>CCTV Meeting</h3>
                  <p>Each meeting is a one-time event, not a daily repeat.</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setMeetingDrafts((current) => [...current, {
                    id: crypto.randomUUID(),
                    date: "",
                    startTime: "13:00",
                    endTime: "15:00",
                    members: "",
                  }])}
                  disabled={pending}
                >
                  <Plus size={15} aria-hidden="true" /> Add meeting
                </Button>
              </div>
              {meetingDrafts.length > 0 ? (
                <div className="cctv-manager-meetings">
                  {meetingDrafts.map((meeting, index) => (
                    <fieldset className="cctv-manager-meeting" key={meeting.id}>
                      <legend>Meeting {index + 1}</legend>
                      <button
                        type="button"
                        className="cctv-manager-remove cctv-manager-meeting-remove"
                        aria-label={`Remove meeting ${index + 1}`}
                        onClick={() => setMeetingDrafts((current) => current.filter((item) => item.id !== meeting.id))}
                        disabled={pending}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                      <div className="cctv-manager-time-fields">
                        <label className="field-label">Date
                          <Input type="date" required value={meeting.date} onChange={(event) => updateMeeting(meeting.id, { date: event.currentTarget.value })} />
                        </label>
                        <label className="field-label">Start time
                          <Input type="time" required value={meeting.startTime} onChange={(event) => updateMeeting(meeting.id, { startTime: event.currentTarget.value })} />
                        </label>
                        <label className="field-label">Finish time
                          <Input type="time" required value={meeting.endTime} onChange={(event) => updateMeeting(meeting.id, { endTime: event.currentTarget.value })} />
                        </label>
                      </div>
                      <label className="field-label">Member
                        <Textarea rows={2} maxLength={1000} value={meeting.members} onChange={(event) => updateMeeting(meeting.id, { members: event.currentTarget.value })} placeholder="Enter member names" />
                      </label>
                    </fieldset>
                  ))}
                </div>
              ) : (
                <p className="cctv-manager-empty">No meetings scheduled. Add a one-time meeting when needed.</p>
              )}
            </section>

            <div className="project-edit-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
              <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

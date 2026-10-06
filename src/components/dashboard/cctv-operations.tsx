"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, Clock3, Plus, Users, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { saveCctvOperationsAction } from "@/app/actions";
import { MediaFilePicker } from "@/components/dashboard/media-file-picker";
import { Button } from "@/components/ui/button";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { defaultCctvRecorderItems, formatCctvDate, formatCctvDuration, type CctvMeeting, type CctvMediaAttachment, type CctvRecorderItem } from "@/lib/cctv-operations";

type CctvRecorderDraft = Omit<CctvRecorderItem, "quantity"> & {
  quantity: string;
  pendingFiles: File[];
};

type CctvOperationsProps = {
  reportDateKey: string;
  recorderItems: CctvRecorderItem[];
  cameraStatusCounts: { faulty: number; waiting: number; repairing: number };
  meetings: CctvMeeting[];
  summary: { value: string | number; label: string; tone: "neutral" | "success" | "warning" | "danger"; detail?: string; ariaLabel: string };
  sectionNumber: number;
  statusFields: (spareCctvField: ReactNode) => ReactNode;
  onOpenStatus: () => void;
  saveStatus: (formData: FormData) => Promise<{ ok: boolean; message: string; mediaWarning?: string }>;
};

function fixedRecorderItems(items: CctvRecorderItem[], cameraStatusCounts: CctvOperationsProps["cameraStatusCounts"]): CctvRecorderItem[] {
  const quantitiesById: Record<string, number> = {
    "recorder-defective": cameraStatusCounts.faulty,
    "recorder-waiting": cameraStatusCounts.waiting,
    "recorder-repairing": cameraStatusCounts.repairing,
  };
  return defaultCctvRecorderItems.map((standard) => {
    const existing = items.find((item) => item.id === standard.id)
      ?? items.find((item) => item.name.trim().toLowerCase() === standard.name.toLowerCase());
    return {
      ...standard,
      ...existing,
      id: standard.id,
      name: standard.id === "recorder-defective" ? "Status CCTV" : standard.name,
      quantity: quantitiesById[standard.id] ?? existing?.quantity ?? standard.quantity,
      media: [...(existing?.media ?? [])],
    };
  });
}

function recorderDetailsTitle(item: CctvRecorderDraft) {
  if (item.id === "recorder-waiting") return "Waiting for repair details";
  if (item.id === "recorder-repairing") return "Repair work details";
  return item.name;
}

function toRecorderDraft(item: CctvRecorderItem): CctvRecorderDraft {
  return { ...item, quantity: String(item.quantity), media: [...item.media], pendingFiles: [] };
}

function dateKeyFromDate(date: Date) {
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
  return parts.year + "-" + parts.month + "-" + parts.day;
}

function formatMeetingDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value + "T00:00:00.000Z"));
}

function CctvMeetingDatePicker({ id, value, onChange, disabled }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(value + "T12:00:00.000Z") : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        className="button button-secondary task-date-picker-trigger cctv-meeting-picker-trigger"
        aria-label={"Meeting date, " + (value ? formatMeetingDate(value) : "not set") + ". Choose date"}
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span>{value ? formatMeetingDate(value) : "Select date"}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" positionerClassName="cctv-meeting-popover-positioner" className="date-picker-popover task-date-popover">
        <Calendar
          mode="single"
          selected={selectedDate}
          disabled={disabled ? () => true : undefined}
          onSelect={(date) => {
            if (!date) return;
            onChange(dateKeyFromDate(date));
            setOpen(false);
          }}
          timeZone="Asia/Bangkok"
          captionLayout="label"
          className="report-calendar"
        />
      </PopoverContent>
    </Popover>
  );
}

function CctvMeetingTimePicker({ id, label, value, onChange, disabled }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hourText = "13", minute = "00"] = value.split(":");
  const hour24 = Number(hourText);
  const hour12 = hour24 % 12 || 12;
  const period = hour24 >= 12 ? "PM" : "AM";
  const displayValue = String(hour12).padStart(2, "0") + ":" + minute + " " + period;

  function updateTime(nextHour12: number, nextMinute: string, nextPeriod: string) {
    const nextHour24 = nextPeriod === "PM" ? (nextHour12 % 12) + 12 : nextHour12 % 12;
    onChange(String(nextHour24).padStart(2, "0") + ":" + nextMinute);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        className="button button-secondary task-date-picker-trigger cctv-meeting-picker-trigger"
        aria-label={label + ", currently " + displayValue + ". Choose time"}
      >
        <Clock3 size={15} aria-hidden="true" />
        <span>{displayValue}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" positionerClassName="cctv-meeting-popover-positioner" className="date-picker-popover cctv-time-picker-popover">
        <label className="cctv-time-picker-part">Hour
          <select
            id={id + "-hour"}
            name={id + "-hour"}
            className="ui-input"
            aria-label={label + " hour"}
            value={String(hour12).padStart(2, "0")}
            disabled={disabled}
            onChange={(event) => updateTime(Number(event.currentTarget.value), minute, period)}
          >
            {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((hour) => (
              <option key={hour} value={hour}>{hour}</option>
            ))}
          </select>
        </label>
        <label className="cctv-time-picker-part">Minute
          <select
            id={id + "-minute"}
            name={id + "-minute"}
            className="ui-input"
            aria-label={label + " minute"}
            value={minute}
            disabled={disabled}
            onChange={(event) => updateTime(hour12, event.currentTarget.value, period)}
          >
            {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")).map((minuteOption) => (
              <option key={minuteOption} value={minuteOption}>{minuteOption}</option>
            ))}
          </select>
        </label>
        <label className="cctv-time-picker-part">AM / PM
          <select
            id={id + "-period"}
            name={id + "-period"}
            className="ui-input"
            aria-label={label + " AM or PM"}
            value={period}
            disabled={disabled}
            onChange={(event) => updateTime(hour12, minute, event.currentTarget.value)}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </label>
      </PopoverContent>
    </Popover>
  );
}

async function removeUploadedCctvMedia(reportDateKey: string, attachmentId: number) {
  const formData = new FormData();
  formData.set("entityType", "cctv");
  formData.set("entityId", reportDateKey);
  formData.set("reportDate", reportDateKey);
  formData.set("remove", "true");
  formData.set("attachmentId", String(attachmentId));
  await fetch("/api/images", { method: "POST", body: formData });
}

function RecorderMediaPreview({ attachment, onRemove, disabled = false }: {
  attachment: CctvMediaAttachment;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="cctv-recorder-saved-media-item">
      <a href={attachment.url} target="_blank" rel="noreferrer" aria-label="Open CCTV recorder photo">
        <Image src={attachment.url} alt="CCTV recorder evidence" width={96} height={64} unoptimized />
      </a>
      {onRemove && (
        <button type="button" className="cctv-recorder-media-remove" aria-label="Remove CCTV recorder photo" onClick={onRemove} disabled={disabled}>
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function CctvOperationsPanel({ reportDateKey, recorderItems, cameraStatusCounts, meetings, summary, sectionNumber, statusFields, onOpenStatus, saveStatus }: CctvOperationsProps) {
  const router = useRouter();
  const visibleRecorderItems = fixedRecorderItems(recorderItems, cameraStatusCounts);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [itemDrafts, setItemDrafts] = useState<CctvRecorderDraft[]>(() => visibleRecorderItems.map(toRecorderDraft));
  const [meetingDrafts, setMeetingDrafts] = useState<CctvMeeting[]>(meetings);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  function openEditor(focusId?: string, addMeeting = false) {
    onOpenStatus();
    setItemDrafts(visibleRecorderItems.map(toRecorderDraft));
    setFocusedItemId(focusId ?? null);
    const nextMeetings = meetings.map((meeting) => ({ ...meeting }));
    if (nextMeetings.length === 0 || addMeeting) {
      nextMeetings.push({ id: crypto.randomUUID(), date: "", startTime: "13:00", endTime: "15:00", members: "" });
    }
    setMeetingDrafts(nextMeetings);
    setOpen(true);
  }

  function updateItem(id: string, changes: Partial<CctvRecorderDraft>) {
    setItemDrafts((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  function updateMeeting(id: string, changes: Partial<CctvMeeting>) {
    setMeetingDrafts((current) => current.map((meeting) => meeting.id === id ? { ...meeting, ...changes } : meeting));
  }

  function renderRecorderItem(item: CctvRecorderDraft, primary = false) {
    const title = recorderDetailsTitle(item);
    const fields = (
      <>
        <label className="field-label">Reason
          <Textarea rows={2} maxLength={2000} value={item.reason} onChange={(event) => updateItem(item.id, { reason: event.currentTarget.value })} placeholder="Add a reason or notes" />
        </label>
        {item.media.length > 0 && (
          <div className="cctv-recorder-saved-media" aria-label={"Saved photos for " + item.name}>
            {item.media.map((attachment) => (
              <RecorderMediaPreview
                key={attachment.id}
                attachment={attachment}
                disabled={pending}
                onRemove={() => updateItem(item.id, { media: item.media.filter((media) => media.id !== attachment.id) })}
              />
            ))}
          </div>
        )}
        <MediaFilePicker
          files={item.pendingFiles}
          pending={pending}
          onFilesChange={(files) => updateItem(item.id, { pendingFiles: files })}
          className="cctv-recorder-media-picker"
          frameClassName="cctv-recorder-pending-media-grid"
          label="Photos"
          imagesOnly
        />
      </>
    );

    if (primary) {
      return (
        <div className="cctv-manager-primary-recorder" key={item.id}>
          <h4 className="cctv-manager-primary-recorder-title">{title}</h4>
          <p className="cctv-manager-primary-description">Notes and photos for faulty cameras</p>
          {fields}
        </div>
      );
    }

    return (
      <fieldset className={"cctv-manager-recorder-item" + (focusedItemId === item.id ? " cctv-manager-recorder-item-focused" : "")} key={item.id}>
        <legend>{title}</legend>
        {fields}
      </fieldset>
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const statusFormData = new FormData(event.currentTarget);
    const meetingsToSave = meetingDrafts.filter((meeting) => Boolean(meeting.date));
    const incompleteMeeting = meetingDrafts.some((meeting) =>
      !meeting.date && (meeting.members.trim() || meeting.startTime !== "13:00" || meeting.endTime !== "15:00"),
    );
    if (incompleteMeeting) {
      toast.error("Choose a date for every CCTV meeting.");
      return;
    }
    if (meetingsToSave.some((meeting) => meeting.endTime <= meeting.startTime)) {
      toast.error("Finish time must be later than start time for every CCTV meeting.");
      return;
    }
    if (itemDrafts.some((item) => item.media.length + item.pendingFiles.length > 20)) {
      toast.error("Each recorder status can have up to 20 photos.");
      return;
    }

    setPending(true);
    const uploaded: Array<{ itemId: string; attachment: CctvMediaAttachment }> = [];
    try {
      const statusResult = await saveStatus(statusFormData);
      if (!statusResult.ok) {
        toast.error(statusResult.message);
        return;
      }

      for (const item of itemDrafts) {
        for (const file of item.pendingFiles) {
          const formData = new FormData();
          formData.set("entityType", "cctv");
          formData.set("entityId", reportDateKey);
          formData.set("reportDate", reportDateKey);
          formData.set("file", file);
          const response = await fetch("/api/images", { method: "POST", body: formData });
          const result = await response.json() as { ok?: boolean; message?: string; attachment?: CctvMediaAttachment };
          if (!response.ok || !result.ok || !result.attachment) {
            await Promise.all(uploaded.map(({ attachment }) => removeUploadedCctvMedia(reportDateKey, attachment.id).catch(() => undefined)));
            router.refresh();
            toast.error(`Camera status saved, but recorder and meeting details were not saved. ${file.name}: ${result.message ?? "Could not upload this photo."}`);
            return;
          }
          uploaded.push({ itemId: item.id, attachment: result.attachment });
        }
      }

      const quantitiesByItemId: Record<string, number> = {
        "recorder-defective": Number(statusFormData.get("cameraFaultyCount")),
        "recorder-waiting": Number(statusFormData.get("cameraWaitingRepairCount")),
        "recorder-repairing": Number(statusFormData.get("cameraRepairingCount")),
      };
      const recorderItems = itemDrafts.map(({ pendingFiles: _pendingFiles, quantity, ...item }) => ({
        ...item,
        quantity: quantitiesByItemId[item.id] ?? Number(quantity),
        media: [
          ...item.media,
          ...uploaded.filter((entry) => entry.itemId === item.id).map((entry) => entry.attachment),
        ],
      }));
      const formData = new FormData();
      formData.set("cctvOperations", JSON.stringify({ recorderItems, meetings: meetingsToSave }));
      const result = await saveCctvOperationsAction(formData);
      if (!result.ok) {
        await Promise.all(uploaded.map(({ attachment }) => removeUploadedCctvMedia(reportDateKey, attachment.id).catch(() => undefined)));
        router.refresh();
        toast.error(`Camera status saved, but recorder and meeting details were not saved. ${result.message}`);
        return;
      }
      toast.success("CCTV details saved.");
      if (statusResult.mediaWarning) toast.error(statusResult.mediaWarning);
      setOpen(false);
      router.refresh();
    } catch {
      await Promise.all(uploaded.map(({ attachment }) => removeUploadedCctvMedia(reportDateKey, attachment.id).catch(() => undefined)));
      router.refresh();
      toast.error("Camera status may have been saved, but recorder and meeting details could not be saved.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <ContextMenu
        as="div"
        role="button"
        className={`summary-breakdown-item summary-${summary.tone} summary-systems-trigger`}
        ariaLabel={`${summary.ariaLabel}. Click to configure.`}
        ariaExpanded={open}
        ariaHasPopup="dialog"
        onActivate={() => openEditor()}
        onEdit={() => openEditor()}
      >
        <strong className="summary-breakdown-title">{sectionNumber}. CCTV</strong>
        <span className={`cctv-status-label cctv-status-${summary.tone}`}>{summary.label}</span>
        <strong className="cctv-camera-count">
          <span className="cctv-camera-count-value">{summary.value}</span>
          <span className="cctv-camera-count-unit">cameras</span>
        </strong>
        {summary.detail && <small>{summary.detail}</small>}
      </ContextMenu>
      <section className="cctv-operations-panel" aria-label="CCTV recorder information">
        <ul className="cctv-recorder-list">
          {visibleRecorderItems.map((item) => (
            <ContextMenu
              as="li"
              className="cctv-recorder-context-item"
              role="listitem"
              key={item.id}
              ariaLabel={`${item.name}, ${item.quantity} units. Click to edit.`}
              ariaHasPopup="dialog"
              onActivate={() => openEditor(item.id)}
              onEdit={() => openEditor(item.id)}
            >
              <div className="cctv-recorder-summary-row">
                <span className="cctv-recorder-name">{item.name}</span>
                <span className="cctv-recorder-quantity">{item.quantity}</span>
              </div>
              {item.reason.trim() && <p className="cctv-recorder-reason">{item.reason}</p>}
              {item.media.length > 0 && (
                <div className="cctv-recorder-media-strip" aria-label={`${item.media.length} attached photos`}>
                  {item.media.slice(0, 3).map((attachment) => <RecorderMediaPreview key={attachment.id} attachment={attachment} />)}
                  {item.media.length > 3 && <span className="cctv-recorder-media-more">+{item.media.length - 3}</span>}
                </div>
              )}
            </ContextMenu>
          ))}
        </ul>

        <div className="cctv-meeting-section">
          <ContextMenu
            as="div"
            className="cctv-meeting-context-trigger"
            ariaLabel="CCTV meeting. Click to edit or right-click for actions."
            ariaHasPopup="menu"
            onActivate={() => openEditor()}
            onCreate={() => openEditor(undefined, true)}
            createLabel="Add meeting"
            onEdit={() => openEditor()}
          >
            <h4>CCTV Meeting</h4>
          </ContextMenu>
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
            <dl className="cctv-meeting-details" aria-label="CCTV meeting details">
              <div>
                <dt><CalendarDays size={13} aria-hidden="true" />Date</dt>
                <dd>—</dd>
              </div>
              <div>
                <dt><Clock3 size={13} aria-hidden="true" />Time</dt>
                <dd>—</dd>
              </div>
              <div>
                <dt><Users size={13} aria-hidden="true" />Member</dt>
                <dd>—</dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) setOpen(nextOpen); }}>
        <DialogContent className="detail-dialog-content cctv-operations-dialog">
          <div className="detail-dialog-header">
            <div>
              <DialogTitle>CCTV Details</DialogTitle>
              <DialogDescription>Update camera totals, status details, and one-time CCTV meeting dates.</DialogDescription>
            </div>
            <DialogClose className="icon-button project-tasks-close" aria-label="Close CCTV details"><X size={17} /></DialogClose>
          </div>
          <form className="cctv-operations-form" onSubmit={(event) => { void save(event); }}>
            <div className="cctv-manager-layout">
              <section className="project-edit-card cctv-manager-primary">
                <h3>Camera inventory</h3>
                <div className="cctv-manager-primary-grid">
                  <div className="cctv-manager-camera-column">
                    {statusFields((() => {
                      const spareItem = itemDrafts.find((item) => item.id === "recorder-spare");
                      if (!spareItem) return null;
                      return (
                        <label className="field-label">
                          Spare CCTV
                          <Input
                            id="recorder-spare-quantity"
                            name="recorder-spare-quantity"
                            type="number"
                            min="0"
                            max="100000"
                            step="1"
                            value={spareItem.quantity}
                            onChange={(event) => updateItem(spareItem.id, { quantity: event.currentTarget.value })}
                            disabled={pending}
                          />
                        </label>
                      );
                    })())}
                  </div>
                  {itemDrafts[0] && renderRecorderItem(itemDrafts[0], true)}
                </div>
              </section>
              <section className="project-edit-card cctv-manager-repair-section">
                <h3>Camera repair details</h3>
                <div className="cctv-manager-repair-grid">
                  {itemDrafts.slice(1).filter((item) => item.id !== "recorder-spare").map((item) => (
                    renderRecorderItem(item)
                  ))}
                </div>
              </section>

              <section className="project-edit-card cctv-manager-section cctv-manager-meetings-section">
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
                        <legend className="cctv-manager-meeting-legend">
                          <span>Meeting {index + 1}</span>
                        </legend>
                        <div className="cctv-manager-time-fields">
                          <div className="field-label">
                            <span>Date</span>
                            <CctvMeetingDatePicker id={meeting.id + "-date"} value={meeting.date} onChange={(date) => updateMeeting(meeting.id, { date })} disabled={pending} />
                          </div>
                          <div className="field-label">
                            <span>Start time</span>
                            <CctvMeetingTimePicker id={meeting.id + "-start"} label="Start time" value={meeting.startTime} onChange={(startTime) => updateMeeting(meeting.id, { startTime })} disabled={pending} />
                          </div>
                          <div className="field-label">
                            <span>Finish time</span>
                            <CctvMeetingTimePicker id={meeting.id + "-finish"} label="Finish time" value={meeting.endTime} onChange={(endTime) => updateMeeting(meeting.id, { endTime })} disabled={pending} />
                          </div>
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
            </div>

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

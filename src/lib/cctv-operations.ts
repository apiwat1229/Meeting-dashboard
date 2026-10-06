export type CctvMeeting = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  members: string;
};

export type CctvMediaAttachment = { id: number; url: string };

export type CctvRecorderItem = {
  id: string;
  name: string;
  quantity: number;
  reason: string;
  media: CctvMediaAttachment[];
};

export const defaultCctvRecorderItems: CctvRecorderItem[] = [
  { id: "recorder-defective", name: "Status CCTV", quantity: 0, reason: "", media: [] },
  { id: "recorder-waiting", name: "Waiting for repair", quantity: 0, reason: "", media: [] },
  { id: "recorder-repairing", name: "Repairing CCTV", quantity: 0, reason: "", media: [] },
  { id: "recorder-spare", name: "Spare CCTV", quantity: 0, reason: "", media: [] },
];

export function normalizeCctvRecorderItems(value: unknown): CctvRecorderItem[] {
  if (!Array.isArray(value)) return defaultCctvRecorderItems.map((item) => ({ ...item, media: [] }));

  const usedIds = new Set<string>();
  return value.flatMap((entry, index) => {
    if (typeof entry === "string") {
      const storedName = entry.trim();
      const name = storedName.toLocaleLowerCase() === "defective cctv" ? "Status CCTV" : storedName;
      if (!name) return [];
      const id = `legacy-recorder-${index + 1}`;
      usedIds.add(id);
      return [{ id, name, quantity: 0, reason: "", media: [] }];
    }
    if (!entry || typeof entry !== "object") return [];

    const record = entry as Partial<CctvRecorderItem>;
    const storedName = typeof record.name === "string" ? record.name.trim() : "";
    const name = storedName.toLocaleLowerCase() === "defective cctv" ? "Status CCTV" : storedName;
    if (!name) return [];

    const requestedId = typeof record.id === "string" && record.id.trim() ? record.id.trim().slice(0, 80) : `legacy-recorder-${index + 1}`;
    let id = requestedId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${requestedId.slice(0, 70)}-${suffix++}`;
    usedIds.add(id);

    const quantity = Number.isSafeInteger(record.quantity) && (record.quantity ?? -1) >= 0
      ? Math.min(record.quantity ?? 0, 100_000)
      : 0;
    const media = Array.isArray(record.media)
      ? record.media.flatMap((attachment) => {
          if (!attachment || typeof attachment !== "object") return [];
          const { id: attachmentId, url } = attachment as CctvMediaAttachment;
          return Number.isSafeInteger(attachmentId) && attachmentId > 0 && typeof url === "string" && url.startsWith("/api/images/")
            ? [{ id: attachmentId, url }]
            : [];
        })
      : [];

    return [{
      id,
      name: requestedId === "recorder-defective" ? "Status CCTV" : name,
      quantity,
      reason: typeof record.reason === "string" ? record.reason : "",
      media,
    }];
  });
}

export const defaultCctvMeetings: CctvMeeting[] = [
  {
    id: "cctv-meeting-2026-10-08",
    date: "2026-10-08",
    startTime: "13:00",
    endTime: "15:00",
    members: "",
  },
];

export function formatCctvDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const monthLabel = new Intl.DateTimeFormat("en", { month: "short" }).format(date);
  return `${day}-${monthLabel}-${year}`;
}

export function formatCctvDuration(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts = [
    hours > 0 ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "",
    remainingMinutes > 0 ? `${remainingMinutes} min` : "",
  ].filter(Boolean);
  return parts.join(" ");
}

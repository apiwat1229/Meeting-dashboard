export type CctvMeeting = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  members: string;
};

export const defaultCctvRecorderItems = [
  "Defective CCTV",
  "Waiting for repair",
  "Repairing CCTV",
  "Install New CCTV",
];

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

import { catchUpReportDays } from "@/lib/daily-reports";
import { getBangkokDateKey, shiftDateKey } from "@/lib/date-key";

let started = false;

function nextCutoffDelay(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).map((part) => [part.type, part.value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const targetDate = parts.hour < "22" ? today : shiftDateKey(today, 1);
  const cutoff = new Date(`${targetDate}T15:00:00.000Z`).getTime();
  return Math.max(1000, cutoff - now.getTime());
}

async function runAndScheduleNext() {
  try {
    await catchUpReportDays();
  } catch (error) {
    console.error("Daily report copy failed; retrying shortly.", error);
    setTimeout(runAndScheduleNext, 60_000);
    return;
  }
  setTimeout(runAndScheduleNext, nextCutoffDelay());
}

export function startDailyReportScheduler() {
  if (started) return;
  started = true;
  void catchUpReportDays().catch((error) => console.error("Could not catch up daily reports.", error));
  setTimeout(runAndScheduleNext, nextCutoffDelay());
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDailyReportScheduler } = await import("./lib/daily-reports-scheduler");
    startDailyReportScheduler();
  }
}

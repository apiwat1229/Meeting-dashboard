import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/data";
import { requireAuthenticatedSession } from "@/lib/dashboard-auth";
import { getBangkokDateKey } from "@/lib/date-key";
import { isValidReportDate } from "@/lib/daily-reports";

export default async function Home({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireAuthenticatedSession();
  const { date } = await searchParams;
  const reportDate = isValidReportDate(date) ? date : getBangkokDateKey();
  const data = await getDashboardData(reportDate);
  return <Dashboard data={data} />;
}

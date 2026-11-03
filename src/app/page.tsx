import { redirect } from "next/navigation";
import { requireAuthenticatedSession } from "@/lib/dashboard-auth";
import { isValidReportDate } from "@/lib/daily-reports";
import { getAccessibleDepartment } from "@/lib/dashboard-scope";
import type { DashboardUser } from "@/lib/dashboard-users";

type DashboardSearchParams = { date?: string | string[]; department?: string | string[] };

export default async function Home({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const user = await requireAuthenticatedSession() as DashboardUser | null;
  const { date, department: requestedDepartment } = await searchParams;
  const requestedDate = typeof date === "string" && isValidReportDate(date) ? date : null;
  const requestedDepartmentCode = typeof requestedDepartment === "string" ? requestedDepartment : null;
  const department = await getAccessibleDepartment(user, requestedDepartmentCode);
  const query = requestedDate ? `?date=${encodeURIComponent(requestedDate)}` : "";

  redirect(`/dashboard/${encodeURIComponent(department.code)}${query}`);
}

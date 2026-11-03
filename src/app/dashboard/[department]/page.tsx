import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";
import { CsrGaDashboard } from "@/components/dashboard/csr-ga-dashboard";
import { getDashboardData } from "@/lib/data";
import { requireAuthenticatedSession } from "@/lib/dashboard-auth";
import { getBangkokDateKey } from "@/lib/date-key";
import { isValidReportDate } from "@/lib/daily-reports";
import { getAccessibleDepartment, listActiveDepartments } from "@/lib/dashboard-scope";
import type { DashboardUser } from "@/lib/dashboard-users";

type DashboardPageProps = {
  params: Promise<{ department: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
};

function dashboardPath(departmentCode: string, reportDate?: string) {
  const path = `/dashboard/${encodeURIComponent(departmentCode)}`;
  return reportDate ? `${path}?date=${encodeURIComponent(reportDate)}` : path;
}

export async function generateMetadata({ params }: Pick<DashboardPageProps, "params">): Promise<Metadata> {
  const user = await requireAuthenticatedSession() as DashboardUser | null;
  const { department: requestedDepartmentCode } = await params;
  const department = await getAccessibleDepartment(user, requestedDepartmentCode);

  return {
    title: `${department.name} Daily Status & Operations Summary`,
    description: `Daily status and operations dashboard for ${department.name}.`,
  };
}

export default async function DepartmentDashboard({ params, searchParams }: DashboardPageProps) {
  const user = await requireAuthenticatedSession() as DashboardUser | null;
  const [{ department: requestedDepartmentCode }, { date }] = await Promise.all([params, searchParams]);
  const requestedDate = typeof date === "string" ? date : undefined;
  const reportDate = isValidReportDate(requestedDate) ? requestedDate : getBangkokDateKey();
  const department = await getAccessibleDepartment(user, requestedDepartmentCode);

  // A department route always resolves to one authorized workspace. Regular users
  // are redirected to their assigned route; admins may open any active department.
  if (requestedDepartmentCode !== department.code) {
    redirect(dashboardPath(department.code, isValidReportDate(requestedDate) ? requestedDate : undefined));
  }

  const data = await getDashboardData(reportDate, department.id, department.name);
  const availableDepartments = user?.role === "ADMIN" ? await listActiveDepartments() : [];

  const dashboardProps = {
    data,
    isAdministrator: user?.role === "ADMIN",
    currentDepartmentCode: department.code,
    currentDepartmentName: department.name,
    availableDepartments,
  };

  return department.code === "CSR-GA"
    ? <CsrGaDashboard {...dashboardProps} />
    : <Dashboard {...dashboardProps} />;
}

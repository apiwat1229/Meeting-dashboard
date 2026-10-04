import { Dashboard } from "@/components/dashboard/dashboard";
import { getDashboardData } from "@/lib/data";
import { requireAuthenticatedSession } from "@/lib/dashboard-auth";

export default async function Home() {
  await requireAuthenticatedSession();
  const data = await getDashboardData();
  return <Dashboard data={data} />;
}

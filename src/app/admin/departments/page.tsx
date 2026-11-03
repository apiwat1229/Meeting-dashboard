import { redirect } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { requireAuthenticatedSession } from "@/lib/dashboard-auth";
import type { DashboardUser } from "@/lib/dashboard-users";
import { AdminShell } from "@/app/admin/admin-shell";
import { AddDepartmentDialogButton, DepartmentManagement } from "@/app/admin/departments/department-management";
import { Card } from "@/components/ui/card";

export default async function DepartmentManagementPage() {
  const actor = await requireAuthenticatedSession() as DashboardUser | null;
  if (!actor || actor.role !== "ADMIN") redirect("/");

  const departmentList = await db.select({
    id: departments.id,
    code: departments.code,
    name: departments.name,
    description: departments.description,
    isActive: departments.isActive,
  }).from(departments).orderBy(asc(departments.sortOrder), asc(departments.name));
  const activeDepartments = departmentList.filter((department) => department.isActive).length;
  const disabledDepartments = departmentList.length - activeDepartments;

  return (
    <AdminShell actor={actor} activeSection="departments">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">WORKSPACES</p>
          <h1>Departments</h1>
          <p>Set up a separate report workspace for each team and manage its availability.</p>
        </div>
        <AddDepartmentDialogButton />
      </div>

      <section className="admin-stat-row admin-stat-row-three" aria-label="Department overview">
        <Card className="admin-stat-card"><div className="admin-stat-card-top"><span>Total departments</span><span className="admin-stat-icon"><Building2 size={17} aria-hidden="true" /></span></div><strong>{departmentList.length}</strong><small>Report workspaces</small></Card>
        <Card className="admin-stat-card"><div className="admin-stat-card-top"><span>Active</span><span className="admin-stat-icon is-green"><ShieldCheck size={17} aria-hidden="true" /></span></div><strong>{activeDepartments}</strong><small>Available to assigned users</small></Card>
        <Card className="admin-stat-card"><div className="admin-stat-card-top"><span>Disabled</span><span className="admin-stat-icon is-amber"><Building2 size={17} aria-hidden="true" /></span></div><strong>{disabledDepartments}</strong><small>Sign-in access is paused</small></Card>
      </section>

      <DepartmentManagement departments={departmentList} />
    </AdminShell>
  );
}

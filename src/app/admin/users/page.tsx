import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { dashboardUsers, departments } from "@/db/schema";
import { requireAuthenticatedSession } from "@/lib/dashboard-auth";
import type { DashboardUser } from "@/lib/dashboard-users";
import type { ManagedUser } from "@/app/admin/types";
import { AdminShell } from "@/app/admin/admin-shell";
import { AddUserDialogButton, UserManagement } from "@/app/admin/users/user-management";
import { Card } from "@/components/ui/card";

export default async function UserManagementPage() {
  const actor = await requireAuthenticatedSession() as DashboardUser | null;
  if (!actor || actor.role !== "ADMIN") redirect("/");

  const [users, departmentsList] = await Promise.all([
    db.select({
      id: dashboardUsers.id,
      username: dashboardUsers.username,
      displayName: dashboardUsers.displayName,
      role: dashboardUsers.role,
      departmentId: dashboardUsers.departmentId,
      isActive: dashboardUsers.isActive,
      createdAt: dashboardUsers.createdAt,
      departmentName: departments.name,
      departmentIsActive: departments.isActive,
    }).from(dashboardUsers)
      .innerJoin(departments, eq(dashboardUsers.departmentId, departments.id))
      .orderBy(asc(departments.sortOrder), asc(dashboardUsers.username)),
    db.select({ id: departments.id, code: departments.code, name: departments.name, description: departments.description, isActive: departments.isActive })
      .from(departments).orderBy(asc(departments.sortOrder), asc(departments.name)),
  ]);
  const activeUsersCount = users.filter((user) => user.isActive && user.departmentIsActive).length;
  const administratorsCount = users.filter((user) => user.role === "ADMIN" && user.isActive && user.departmentIsActive).length;

  return (
    <AdminShell actor={actor} activeSection="users">
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">ACCESS CONTROL</p>
          <h1>User accounts</h1>
          <p>Create accounts and manage each person’s role, department, and sign-in access.</p>
        </div>
        <AddUserDialogButton departments={departmentsList} />
      </div>

      <section className="admin-stat-row admin-stat-row-three" aria-label="User account overview">
        <Card className="admin-stat-card"><div className="admin-stat-card-top"><span>Total accounts</span><span className="admin-stat-icon"><Users size={17} aria-hidden="true" /></span></div><strong>{users.length}</strong><small>All registered users</small></Card>
        <Card className="admin-stat-card"><div className="admin-stat-card-top"><span>Active accounts</span><span className="admin-stat-icon is-green"><ShieldCheck size={17} aria-hidden="true" /></span></div><strong>{activeUsersCount}</strong><small>Can access their reports</small></Card>
        <Card className="admin-stat-card"><div className="admin-stat-card-top"><span>Administrators</span><span className="admin-stat-icon is-violet"><ShieldCheck size={17} aria-hidden="true" /></span></div><strong>{administratorsCount}</strong><small>Active admin accounts</small></Card>
      </section>

      <UserManagement
        users={users.map((user) => ({ ...user, role: user.role as ManagedUser["role"] }))}
        departments={departmentsList}
        currentUserId={actor.id}
      />
      <p className="admin-page-crosslink"><ArrowRight size={14} aria-hidden="true" /> Need to create or organize a team? <Link href="/admin/departments">Go to department management</Link></p>
    </AdminShell>
  );
}

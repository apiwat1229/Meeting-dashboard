import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { departments } from "@/db/schema";
import type { DashboardUser } from "@/lib/dashboard-users";

export type DepartmentSummary = { id: number; code: string; name: string };

export async function getAccessibleDepartment(user: DashboardUser | null, requestedCode?: string | null): Promise<DepartmentSummary> {
  if (user?.role !== "ADMIN") {
    if (user) return { id: user.departmentId, code: user.departmentCode, name: user.departmentName };
    const [defaultDepartment] = await db.select({ id: departments.id, code: departments.code, name: departments.name })
      .from(departments).where(eq(departments.code, "IT")).limit(1);
    if (!defaultDepartment) throw new Error("The default department has not been configured.");
    return defaultDepartment;
  }

  if (requestedCode) {
    const [requested] = await db.select({ id: departments.id, code: departments.code, name: departments.name })
      .from(departments)
      .where(and(eq(departments.code, requestedCode), eq(departments.isActive, true)))
      .limit(1);
    if (requested) return requested;
  }
  return { id: user.departmentId, code: user.departmentCode, name: user.departmentName };
}

export async function listActiveDepartments(): Promise<DepartmentSummary[]> {
  return db.select({ id: departments.id, code: departments.code, name: departments.name })
    .from(departments)
    .where(eq(departments.isActive, true))
    .orderBy(asc(departments.sortOrder), asc(departments.name));
}

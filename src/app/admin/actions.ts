"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { dashboardUsers, departments, dashboardReportDays, networkServiceStatuses } from "@/db/schema";
import { requireAuthenticatedSession } from "@/lib/dashboard-auth";
import { hashDashboardPassword, type DashboardUser } from "@/lib/dashboard-users";
import { getBangkokDateKey } from "@/lib/date-key";
import { systemNetworkServiceKeys } from "@/lib/system-status";

export type AdminActionState = { error: string; success: string };
const emptyState: AdminActionState = { error: "", success: "" };

async function requireAdministrator() {
  const user = await requireAuthenticatedSession() as DashboardUser | null;
  if (!user || user.role !== "ADMIN") redirect("/");
  return user;
}

function resultError(message: string): AdminActionState {
  return { error: message, success: "" };
}

function resultSuccess(message: string): AdminActionState {
  revalidatePath("/admin/users");
  revalidatePath("/admin/departments");
  revalidatePath("/");
  return { error: "", success: message };
}

export async function createDashboardUserAction(_previous: AdminActionState = emptyState, formData: FormData): Promise<AdminActionState> {
  await requireAdministrator();
  const parsed = z.object({
    username: z.string().trim().transform((value) => value.toLocaleLowerCase("en-US")).pipe(z.string().regex(/^[a-z0-9._-]{3,60}$/)),
    displayName: z.string().trim().min(2).max(120),
    password: z.string().min(10).max(200),
    role: z.enum(["ADMIN", "USER"]),
    departmentId: z.coerce.number().int().positive(),
  }).safeParse({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId"),
  });
  if (!parsed.success) return resultError("Check the username, password, and required fields. Passwords must have at least 10 characters.");

  const [department] = await db.select({ id: departments.id }).from(departments)
    .where(and(eq(departments.id, parsed.data.departmentId), eq(departments.isActive, true))).limit(1);
  if (!department) return resultError("Choose an active department.");
  try {
    await db.insert(dashboardUsers).values({
      ...parsed.data,
      passwordHash: hashDashboardPassword(parsed.data.password),
    });
  } catch {
    return resultError("Could not add this account. The username may already be in use.");
  }
  return resultSuccess("User account created.");
}

export async function updateDashboardUserAction(_previous: AdminActionState = emptyState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdministrator();
  const parsed = z.object({
    id: z.coerce.number().int().positive(),
    displayName: z.string().trim().min(2).max(120),
    role: z.enum(["ADMIN", "USER"]),
    departmentId: z.coerce.number().int().positive(),
    isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
    password: z.string().max(200),
  }).safeParse({
    id: formData.get("id"),
    displayName: formData.get("displayName"),
    role: formData.get("role"),
    departmentId: formData.get("departmentId"),
    isActive: formData.get("isActive"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success || (parsed.success && parsed.data.password !== "" && parsed.data.password.length < 10)) {
    return resultError("Check the required fields. A new password must have at least 10 characters.");
  }
  const [department] = await db.select({ id: departments.id }).from(departments)
    .where(and(eq(departments.id, parsed.data.departmentId), eq(departments.isActive, true))).limit(1);
  if (!department) return resultError("Choose an active department.");

  try {
    await db.transaction(async (tx) => {
      const [target] = await tx.select({ id: dashboardUsers.id, role: dashboardUsers.role, isActive: dashboardUsers.isActive })
        .from(dashboardUsers).where(eq(dashboardUsers.id, parsed.data.id)).for("update").limit(1);
      if (!target) throw new Error("not-found");
      const removesActiveAdmin = target.role === "ADMIN" && target.isActive && (parsed.data.role !== "ADMIN" || !parsed.data.isActive);
      if (removesActiveAdmin) {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('dashboard-admin-membership'))`);
        const [activeAdminCount] = await tx.select({ count: sql<number>`count(*)::int` }).from(dashboardUsers)
          .innerJoin(departments, eq(dashboardUsers.departmentId, departments.id))
          .where(and(eq(dashboardUsers.role, "ADMIN"), eq(dashboardUsers.isActive, true), eq(departments.isActive, true)));
        if (activeAdminCount.count <= 1) throw new Error("last-admin");
      }
      const nextPasswordHash = parsed.data.password ? hashDashboardPassword(parsed.data.password) : undefined;
      await tx.update(dashboardUsers).set({
        displayName: parsed.data.displayName,
        role: parsed.data.role,
        departmentId: parsed.data.departmentId,
        isActive: parsed.data.isActive,
        ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {}),
        updatedAt: new Date(),
      }).where(eq(dashboardUsers.id, parsed.data.id));
    });
  } catch (error) {
    if (error instanceof Error && error.message === "last-admin") return resultError("At least one active administrator must remain.");
    return resultError("Could not update this user.");
  }
  if (parsed.data.id === actor.id && !parsed.data.isActive) redirect("/login");
  return resultSuccess("User account updated.");
}

export async function createDepartmentAction(_previous: AdminActionState = emptyState, formData: FormData): Promise<AdminActionState> {
  await requireAdministrator();
  const parsed = z.object({
    code: z.string().trim().transform((value) => value.toLocaleUpperCase("en-US")).pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]{1,29}$/)),
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(1000),
  }).safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return resultError("Use a department code with 2–30 letters or numbers and enter a name.");
  try {
    await db.transaction(async (tx) => {
      const [created] = await tx.insert(departments).values({ ...parsed.data, sortOrder: Math.floor(Date.now() / 1000) })
        .returning({ id: departments.id });
      if (!created) throw new Error("create failed");
      const reportDate = getBangkokDateKey();
      await tx.insert(dashboardReportDays).values({ departmentId: created.id, reportDate });
      const labels: Record<(typeof systemNetworkServiceKeys)[number], string> = {
        "file-share": "File Share",
        payroll: "Payroll",
        "backup-system": "BCP BackUp",
        "log-tracking": "Log Tracking",
        "solar-dashboard": "Solar cell Dashboard",
      };
      await tx.insert(networkServiceStatuses).values(systemNetworkServiceKeys.map((serviceKey) => ({
        departmentId: created.id,
        reportDate,
        serviceKey,
        label: labels[serviceKey],
        status: "UNKNOWN",
      })));
    });
  } catch {
    return resultError("Could not add this department. Its code may already exist.");
  }
  return resultSuccess("Department created. Its dashboard starts with a blank report.");
}

export async function updateDepartmentStatusAction(_previous: AdminActionState = emptyState, formData: FormData): Promise<AdminActionState> {
  const actor = await requireAdministrator();
  const parsed = z.object({ id: z.coerce.number().int().positive(), isActive: z.enum(["true", "false"]).transform((value) => value === "true") })
    .safeParse({ id: formData.get("id"), isActive: formData.get("isActive") });
  if (!parsed.success) return resultError("Invalid department status.");
  if (parsed.data.id === actor.departmentId && !parsed.data.isActive) return resultError("Move your administrator account to another department before deactivating this one.");
  if (!parsed.data.isActive) {
    const [otherActiveAdmins] = await db.select({ count: sql<number>`count(*)::int` })
      .from(dashboardUsers)
      .innerJoin(departments, eq(dashboardUsers.departmentId, departments.id))
      .where(and(
        eq(dashboardUsers.role, "ADMIN"),
        eq(dashboardUsers.isActive, true),
        eq(departments.isActive, true),
        ne(departments.id, parsed.data.id),
      ));
    if (otherActiveAdmins.count === 0) return resultError("Keep at least one active administrator in an enabled department.");
  }
  try {
    await db.update(departments).set({ isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(eq(departments.id, parsed.data.id));
  } catch {
    return resultError("Could not update the department.");
  }
  return resultSuccess(parsed.data.isActive ? "Department enabled." : "Department disabled.");
}

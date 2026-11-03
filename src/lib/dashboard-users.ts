import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dashboardUsers, departments } from "@/db/schema";

export type DashboardUser = {
  id: number;
  username: string;
  displayName: string;
  role: "ADMIN" | "USER";
  departmentId: number;
  departmentCode: string;
  departmentName: string;
};

const passwordBytes = 64;

export function hashDashboardPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, passwordBytes).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyDashboardPassword(password: string, encodedHash: string) {
  const [scheme, salt, expectedHash, extra] = encodedHash.split("$");
  if (scheme !== "scrypt" || !salt || !expectedHash || extra !== undefined) return false;
  try {
    const expected = Buffer.from(expectedHash, "base64url");
    const actual = scryptSync(password, salt, passwordBytes);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function authenticateDashboardUser(username: string, password: string): Promise<DashboardUser | null> {
  const normalizedUsername = username.trim().toLocaleLowerCase("en-US");
  const [row] = await db.select({
    id: dashboardUsers.id,
    username: dashboardUsers.username,
    displayName: dashboardUsers.displayName,
    passwordHash: dashboardUsers.passwordHash,
    role: dashboardUsers.role,
    departmentId: dashboardUsers.departmentId,
    departmentCode: departments.code,
    departmentName: departments.name,
    isActive: dashboardUsers.isActive,
    departmentIsActive: departments.isActive,
  })
    .from(dashboardUsers)
    .innerJoin(departments, eq(dashboardUsers.departmentId, departments.id))
    .where(eq(dashboardUsers.username, normalizedUsername))
    .limit(1);
  if (!row || !row.isActive || !row.departmentIsActive || !verifyDashboardPassword(password, row.passwordHash)) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role as DashboardUser["role"],
    departmentId: row.departmentId,
    departmentCode: row.departmentCode,
    departmentName: row.departmentName,
  };
}

export async function findActiveDashboardUser(userId: number): Promise<DashboardUser | null> {
  const [row] = await db.select({
    id: dashboardUsers.id,
    username: dashboardUsers.username,
    displayName: dashboardUsers.displayName,
    role: dashboardUsers.role,
    departmentId: dashboardUsers.departmentId,
    departmentCode: departments.code,
    departmentName: departments.name,
    isActive: dashboardUsers.isActive,
    departmentIsActive: departments.isActive,
  })
    .from(dashboardUsers)
    .innerJoin(departments, eq(dashboardUsers.departmentId, departments.id))
    .where(eq(dashboardUsers.id, userId))
    .limit(1);
  if (!row || !row.isActive || !row.departmentIsActive) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role as DashboardUser["role"],
    departmentId: row.departmentId,
    departmentCode: row.departmentCode,
    departmentName: row.departmentName,
  };
}

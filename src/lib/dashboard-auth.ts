import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const sessionCookieName = "it_dashboard_session";
const sessionLifetimeSeconds = 12 * 60 * 60;

export type SessionPayload = { userId: number; expiresAt: number };

function sessionSecret() {
  const secret = process.env.DASHBOARD_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function isDashboardAuthConfigured() {
  return sessionSecret() !== null;
}

export function dashboardAuthIsRequired() {
  return process.env.NODE_ENV === "production" || isDashboardAuthConfigured();
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyDashboardSession(token?: string | null): SessionPayload | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;

  const [payloadPart, signature, extra] = token.split(".");
  if (!payloadPart || !signature || extra !== undefined) return null;

  const expectedBytes = Buffer.from(sign(payloadPart, secret));
  const actualBytes = Buffer.from(signature);
  if (expectedBytes.length !== actualBytes.length || !timingSafeEqual(expectedBytes, actualBytes)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (!Number.isSafeInteger(payload.userId) || typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) return null;
    return { userId: payload.userId!, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

export async function createDashboardSession(userId: number) {
  const secret = sessionSecret();
  if (!secret) throw new Error("Dashboard session secret is not configured.");

  const expiresAt = Date.now() + sessionLifetimeSeconds * 1000;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt } satisfies SessionPayload)).toString("base64url");
  const token = `${payload}.${sign(payload, secret)}`;
  const secureCookie = process.env.DASHBOARD_COOKIE_SECURE === "false"
    ? false
    : process.env.NODE_ENV === "production";

  (await cookies()).set(sessionCookieName, token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetimeSeconds,
  });
}

export async function destroyDashboardSession() {
  (await cookies()).delete(sessionCookieName);
}

export async function hasDashboardSession() {
  if (!dashboardAuthIsRequired()) return true;
  return (await requireAuthenticatedSession()) !== null;
}

export async function requireAuthenticatedSession() {
  if (!dashboardAuthIsRequired()) return null;
  const token = (await cookies()).get(sessionCookieName)?.value;
  const payload = verifyDashboardSession(token);
  if (!payload) redirect("/login");

  const { findActiveDashboardUser } = await import("@/lib/dashboard-users");
  const user = await findActiveDashboardUser(payload.userId);
  if (!user) {
    await destroyDashboardSession();
    redirect("/login");
  }
  return user;
}

export function getDashboardSessionCookieName() {
  return sessionCookieName;
}

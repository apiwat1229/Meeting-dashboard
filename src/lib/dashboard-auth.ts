import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const sessionCookieName = "it_dashboard_session";
const sessionLifetimeSeconds = 12 * 60 * 60;

type SessionPayload = { username: string; expiresAt: number };

function authSettings() {
  const username = process.env.DASHBOARD_USERNAME;
  const password = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.DASHBOARD_SESSION_SECRET;
  if (!username || !password || !secret || secret.length < 32) return null;
  return { username, password, secret };
}

export function isDashboardAuthConfigured() {
  return authSettings() !== null;
}

export function dashboardAuthIsRequired() {
  return process.env.NODE_ENV === "production" || isDashboardAuthConfigured();
}

function safeStringEqual(left: string, right: string) {
  const leftHash = createHmac("sha256", "dashboard-credential-check").update(left).digest();
  const rightHash = createHmac("sha256", "dashboard-credential-check").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function verifyDashboardCredentials(username: string, password: string) {
  const settings = authSettings();
  if (!settings) return false;
  const usernameMatches = safeStringEqual(username, settings.username);
  const passwordMatches = safeStringEqual(password, settings.password);
  return usernameMatches && passwordMatches;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyDashboardSession(token?: string | null): SessionPayload | null {
  const settings = authSettings();
  if (!settings || !token) return null;

  const [payloadPart, signature, extra] = token.split(".");
  if (!payloadPart || !signature || extra !== undefined) return null;

  const expected = sign(payloadPart, settings.secret);
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(signature);
  if (expectedBytes.length !== actualBytes.length || !timingSafeEqual(expectedBytes, actualBytes)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (payload.username !== settings.username || typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) return null;
    return { username: payload.username, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

export async function createDashboardSession() {
  const settings = authSettings();
  if (!settings) throw new Error("Dashboard authentication is not configured.");

  const expiresAt = Date.now() + sessionLifetimeSeconds * 1000;
  const payload = Buffer.from(JSON.stringify({ username: settings.username, expiresAt } satisfies SessionPayload)).toString("base64url");
  const token = `${payload}.${sign(payload, settings.secret)}`;
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
  const token = (await cookies()).get(sessionCookieName)?.value;
  return Boolean(verifyDashboardSession(token));
}

export async function requireAuthenticatedSession() {
  if (!dashboardAuthIsRequired()) return;
  if (!(await hasDashboardSession())) redirect("/login");
}

export function getDashboardSessionCookieName() {
  return sessionCookieName;
}

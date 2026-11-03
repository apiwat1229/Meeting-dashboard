"use server";

import { redirect } from "next/navigation";
import {
  createDashboardSession,
  destroyDashboardSession,
} from "@/lib/dashboard-auth";
import { authenticateDashboardUser } from "@/lib/dashboard-users";

export type LoginState = { error: string };

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const username = formData.get("username");
  const password = formData.get("password");
  if (typeof username !== "string" || typeof password !== "string") {
    return { error: "Incorrect username or password." };
  }

  let user;
  try {
    user = await authenticateDashboardUser(username, password);
  } catch {
    return { error: "Could not connect to the sign-in service." };
  }
  if (!user) return { error: "Incorrect username or password." };
  const administratorOnly = formData.get("intent") === "admin";
  if (administratorOnly && user.role !== "ADMIN") return { error: "This sign-in is for administrators only." };

  await createDashboardSession(user.id);
  redirect(administratorOnly ? "/admin/users" : `/dashboard/${encodeURIComponent(user.departmentCode)}`);
}

export async function logoutAction() {
  await destroyDashboardSession();
  redirect("/login");
}

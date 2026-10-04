"use server";

import { redirect } from "next/navigation";
import {
  createDashboardSession,
  destroyDashboardSession,
  verifyDashboardCredentials,
} from "@/lib/dashboard-auth";

export type LoginState = { error: string };

export async function loginAction(_previousState: LoginState, formData: FormData): Promise<LoginState> {
  const username = formData.get("username");
  const password = formData.get("password");
  if (typeof username !== "string" || typeof password !== "string" || !verifyDashboardCredentials(username, password)) {
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  await createDashboardSession();
  redirect("/");
}

export async function logoutAction() {
  await destroyDashboardSession();
  redirect("/login");
}

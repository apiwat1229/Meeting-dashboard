import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { defaultTheme, themeCssVariables } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "IT Daily Status & Operations Summary",
  description: "A shared daily dashboard for IT projects, issues, and team activities.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  await connection();

  return (
    <html lang="th" style={themeCssVariables(defaultTheme)}>
      <body><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}

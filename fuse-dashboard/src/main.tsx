import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource-variable/noto-sans-thai";
import { AuthProvider } from "@/auth/AuthContext";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode><QueryClientProvider client={new QueryClient()}><AuthProvider><App /></AuthProvider></QueryClientProvider></StrictMode>,
);

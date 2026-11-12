import { createContext, useContext, useState, type ReactNode } from "react";
import * as store from "@/api/store";
import type { DashboardUser } from "@/types";

interface Auth { user: DashboardUser | null; signIn: (u: string, p: string) => boolean; signOut: () => void }
const Ctx = createContext<Auth>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(store.currentUser());
  const signIn = (u: string, p: string) => { const found = store.login(u, p); setUser(found); return !!found; };
  const signOut = () => { store.logout(); setUser(null); };
  return <Ctx.Provider value={{ user, signIn, signOut }}>{children}</Ctx.Provider>;
}

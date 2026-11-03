import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Building2, LayoutDashboard, LogOut, ShieldCheck, Users } from "lucide-react";
import type { DashboardUser } from "@/lib/dashboard-users";
import { logoutAction } from "@/app/auth-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AdminSection = "users" | "departments";

export function AdminShell({ actor, activeSection, children }: { actor: DashboardUser; activeSection: AdminSection; children: ReactNode }) {
  const currentSection = activeSection === "users" ? "User accounts" : "Departments";

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <Link className="admin-brand" href="/admin/users">
          <span className="admin-brand-mark"><Activity size={19} aria-hidden="true" /></span>
          <span><strong>IT Operations</strong><small>Admin console</small></span>
        </Link>
        <p className="admin-sidebar-label">Workspace</p>
        <nav className="admin-sidebar-nav" aria-label="Workspace">
          <Link className="admin-nav-link" href="/"><LayoutDashboard size={17} aria-hidden="true" /><span>Dashboard</span><ArrowRight className="admin-nav-arrow" size={14} aria-hidden="true" /></Link>
        </nav>
        <p className="admin-sidebar-label admin-sidebar-section-label">Administration</p>
        <nav className="admin-sidebar-nav" aria-label="Administration">
          <Link className={`admin-nav-link${activeSection === "users" ? " is-active" : ""}`} href="/admin/users" aria-current={activeSection === "users" ? "page" : undefined}>
            <Users size={17} aria-hidden="true" /><span>User accounts</span>
          </Link>
          <Link className={`admin-nav-link${activeSection === "departments" ? " is-active" : ""}`} href="/admin/departments" aria-current={activeSection === "departments" ? "page" : undefined}>
            <Building2 size={17} aria-hidden="true" /><span>Departments</span>
          </Link>
        </nav>
        <div className="admin-sidebar-spacer" />
        <div className="admin-sidebar-user">
          <span className="admin-user-avatar admin-sidebar-avatar" aria-hidden="true">{actor.displayName.trim().charAt(0).toLocaleUpperCase("en-US") || "A"}</span>
          <span className="admin-sidebar-user-copy"><strong>{actor.displayName}</strong><small>Administrator</small></span>
          <ShieldCheck size={16} aria-hidden="true" />
        </div>
        <form action={logoutAction} className="admin-logout-form">
          <Button type="submit" variant="ghost" className="admin-logout-button"><LogOut size={16} aria-hidden="true" /><span>Sign out</span></Button>
        </form>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb"><span>Admin</span><span aria-hidden="true">/</span><strong>{currentSection}</strong></div>
          <div className="admin-topbar-actions"><Badge variant="success">Admin session</Badge><span className="admin-topbar-divider" /><span className="admin-topbar-user"><ShieldCheck size={16} aria-hidden="true" />{actor.displayName}</span></div>
        </header>
        <div className="admin-content">
          {children}
          <footer className="admin-security-note"><ShieldCheck size={15} aria-hidden="true" /><span>Users can only view reports for their assigned department. Administrators can switch between active departments.</span></footer>
        </div>
      </div>
    </main>
  );
}

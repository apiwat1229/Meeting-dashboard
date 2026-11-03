import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";

export default function AdminLoginPage() {
  return (
    <main className="login-page" lang="en">
      <section className="login-panel" aria-labelledby="admin-login-title">
        <h1 id="admin-login-title">Administrator sign in</h1>
        <p className="login-description">Sign in to manage dashboard users and departments.</p>
        <LoginForm administratorOnly />
        <Link className="login-admin-link" href="/login">Back to Dashboard sign in</Link>
      </section>
    </main>
  );
}

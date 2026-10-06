import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="login-page" lang="en">
      <section className="login-panel" aria-labelledby="login-title">
        <h1 id="login-title">Sign in to Dashboard</h1>
        <p className="login-description">Sign in to view and manage daily operations.</p>
        <LoginForm />
      </section>
    </main>
  );
}

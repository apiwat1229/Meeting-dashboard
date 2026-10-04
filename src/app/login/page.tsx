import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <p className="login-eyebrow">IT OPERATIONS</p>
        <h1 id="login-title">เข้าสู่ระบบ Dashboard</h1>
        <p className="login-description">ลงชื่อเข้าใช้เพื่อดูและจัดการสถานะงาน</p>
        <LoginForm />
      </section>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/auth-actions";

const initialState: LoginState = { error: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form className="login-form" action={action}>
      <label htmlFor="username">Username</label>
      <input id="username" name="username" type="text" autoComplete="username" required autoFocus />

      <label htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />

      {state.error && <p className="login-error" role="alert">{state.error}</p>}
      <button className="login-submit" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

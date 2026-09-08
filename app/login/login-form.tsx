"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

type DemoAccount = { email: string; name: string; roleLabel: string };

export default function LoginForm({
  crest,
  markLine,
  clubName,
  accounts,
  demoPassword,
  showAccounts,
}: {
  crest: string;
  markLine: string;
  clubName: string;
  accounts: DemoAccount[];
  demoPassword: string;
  showAccounts: boolean;
}) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    { error: null },
  );

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-head">
          <div className="crest">{crest}</div>
          <div className="brand-mark" style={{ color: "var(--brass)" }}>
            {markLine}
          </div>
          <div className="login-club">{clubName}</div>
        </div>

        <div className="ornament">
          <span />
          <i>&#10070;</i>
          <span className="right" />
        </div>

        <form action={formAction} className="login-form">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              defaultValue={accounts[0]?.email ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              defaultValue={showAccounts ? demoPassword : ""}
            />
          </div>

          {state.error ? <div className="login-error">{state.error}</div> : null}

          <button className="btn" type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {showAccounts && accounts.length > 0 ? (
          <div className="login-accounts">
            <div className="login-accounts-title">Pilot sign-ins</div>
            {accounts.map((a) => (
              <div key={a.email} className="login-account-row">
                <span>{a.roleLabel}</span>
                <span className="mono">{a.email}</span>
              </div>
            ))}
            <div className="login-account-note">
              Password for all of the above: <span className="mono">{demoPassword}</span>.
              Each role opens a different set of tabs.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

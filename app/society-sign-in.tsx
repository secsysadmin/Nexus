"use client";
import { useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button, Field, PasswordInput } from "./ui";
type SocietySignInProps = {
  activate?: boolean;
  token?: string;
  checkin?: boolean;
  error: string;
  busy: boolean;
  onSubmit: (b: unknown) => Promise<void>;
};
export default function SocietySignIn({
  activate = false,
  token = "",
  checkin = false,
  error,
  busy,
  onSubmit,
}: SocietySignInProps) {
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [localError, setLocalError] = useState("");
  const Heading = activate || checkin ? "h1" : "h2";
  return (
    <div className="auth-form">
      <Heading>
        {activate
          ? "Set your account password"
          : checkin
            ? "Sign in to check in"
            : "Welcome to SocietyHub"}
      </Heading>
      <p>
        {activate
          ? "Your society can share this password with its authorized officers."
          : "Sign in with your society username and shared password."}
      </p>
      {(error || localError) && (
        <div className="alert error" role="alert">
          {localError || error}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setLocalError("");
          if (activate && password !== confirm) {
            setLocalError("Passwords do not match.");
            return;
          }
          void onSubmit(
            activate ? { token, password } : { username, password },
          );
        }}
      >
        {!activate && (
          <Field label="Society username">
            <input
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your society username"
              maxLength={40}
            />
          </Field>
        )}
        <Field
          label={activate ? "New password" : "Password"}
          hint={activate ? "Use at least 15 characters." : undefined}
        >
          <PasswordInput
            required
            autoComplete={activate ? "new-password" : "current-password"}
            minLength={activate ? 15 : 1}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {activate && (
          <Field label="Confirm password">
            <PasswordInput
              required
              autoComplete="new-password"
              minLength={15}
              maxLength={128}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
        )}
        <Button type="submit" disabled={busy || (activate && !token)}>
          {busy
            ? "Please wait…"
            : activate
              ? "Set password & continue"
              : "Sign in"}
          <ArrowRight size={17} />
        </Button>
      </form>
      <div className="auth-help">
        <span className="auth-help-icon" aria-hidden="true">
          <KeyRound size={17} />
        </span>
        <div>
          <strong>
            {activate
              ? "Link not working?"
              : "New society or forgot your password?"}
          </strong>
          <p>Request a one-time setup or password reset link.</p>
          <a
            className="auth-help-action"
            href="mailto:society@sec.tamu.edu?subject=SocietyHub%20account%20help"
          >
            Contact an SEC chair <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

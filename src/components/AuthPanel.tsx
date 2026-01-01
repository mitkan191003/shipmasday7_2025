"use client";

import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthPanelProps = {
  onAuthed: () => void;
  onDemoStart: () => void;
};

export default function AuthPanel({ onAuthed, onDemoStart }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha | null>(null);
  const hcaptchaSiteKey =
    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "a974a2bc-1402-4a86-bfae-a1cc4746aec0";

  const handleSignIn = async () => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      if (error.message.toLowerCase().includes("captcha")) {
        setMessage("Please complete the captcha and try again.");
      } else {
        setMessage(error.message);
      }
    } else {
      onAuthed();
    }
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) {
      if (error.message.toLowerCase().includes("captcha")) {
        setMessage("Please complete the captcha and try again.");
      } else {
        setMessage(error.message);
      }
    } else {
      setMessage("Check your email to confirm your account.");
    }
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    setLoading(false);
  };

  const handleDemo = async () => {
    setLoading(true);
    setMessage(null);
    if (!captchaToken) {
      setMessage("Please complete the captcha to start the demo.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInAnonymously({
      options: { captchaToken },
    });
    if (error) {
      setMessage(error.message);
    } else {
      onDemoStart();
      onAuthed();
    }
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#f7f1e8,_#e7eef5_45%,_#dde6f1)] px-6">
      <div className="w-full max-w-md rounded-[32px] bg-[var(--surface)] p-8 shadow-[20px_20px_45px_var(--shadow-dark),-20px_-20px_45px_var(--shadow-light)]">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Trailkeeper</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-800">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to track parks, unlock first-visit confetti, and keep your journal flowing.
          </p>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-600">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-transparent bg-[var(--surface-alt)] px-4 py-3 text-sm text-slate-700 shadow-[inset_6px_6px_12px_var(--shadow-dark),inset_-6px_-6px_12px_var(--shadow-light)] focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
          <label className="block text-sm font-medium text-slate-600">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-transparent bg-[var(--surface-alt)] px-4 py-3 text-sm text-slate-700 shadow-[inset_6px_6px_12px_var(--shadow-dark),inset_-6px_-6px_12px_var(--shadow-light)] focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>
        </div>
        {message ? <p className="mt-4 text-sm text-amber-700">{message}</p> : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-[8px_8px_18px_var(--shadow-dark),-8px_-8px_18px_var(--shadow-light)] transition hover:brightness-95 disabled:opacity-60"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={handleSignUp}
            disabled={loading}
            className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm font-semibold text-slate-700 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)] transition hover:text-slate-900 disabled:opacity-60"
          >
            Create account
          </button>
        </div>
        <div className="mt-4 rounded-2xl bg-[var(--surface-alt)] px-4 py-4 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Captcha check</p>
          <p className="mt-2 text-xs text-slate-500">
            Required to start the demo and may be requested for sign-in.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl bg-white/70 p-2">
            <HCaptcha
              ref={captchaRef}
              sitekey={hcaptchaSiteKey}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleDemo}
          disabled={loading}
          className="mt-4 w-full rounded-2xl bg-white/80 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)] transition hover:text-slate-800 disabled:opacity-60"
        >
          I want a demo
        </button>
      </div>
    </div>
  );
}

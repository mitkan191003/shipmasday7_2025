"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthPanelProps = {
  onAuthed: () => void;
};

export default function AuthPanel({ onAuthed }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      onAuthed();
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email to confirm your account.");
    }
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
      </div>
    </div>
  );
}

"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      sessionStorage.setItem("simula-token", result.access_token);
      const next =
        new URLSearchParams(window.location.search).get("next") || "/dashboard";
      window.location.assign(
        /^\/(dashboard|materi|profil|belajar|kuis)(\/[^?]*)?$/.test(next)
          ? next
          : "/dashboard",
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto mt-20 max-w-md rounded-2xl border-2 border-line bg-surface p-8 shadow-pop">
      <h1 className="mb-6 text-3xl font-bold">Masuk SIMULA</h1>
      <form onSubmit={submit} className="grid gap-4">
        <label>
          Username
          <input
            autoComplete="username"
            className="block w-full rounded border border-line p-3"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            className="block w-full rounded border border-line p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-brand">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="rounded-xl bg-brand p-3 font-bold text-white"
        >
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>
    </main>
  );
}

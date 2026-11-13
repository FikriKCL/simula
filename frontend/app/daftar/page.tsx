"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Cross } from "@/components/Icons";
import { PikoMascot } from "@/components/PikoMascot";

const label = "font-heading text-sm font-extrabold text-ink";
const input =
  "w-full rounded-[14px] border-2 border-ink bg-surface px-4 py-3 text-[15px] font-semibold text-ink outline-none transition placeholder:text-muted focus:border-sky-dark focus:ring-4 focus:ring-sky-soft";

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      {off && (
        <path d="M4 4l16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function Sparkle({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`absolute size-5 text-gold ${className}`}
    >
      <path
        d="M12 1c.8 6.2 4.8 10.2 11 11-6.2.8-10.2 4.8-11 11-.8-6.2-4.8-10.2-11-11 6.2-.8 10.2-4.8 11-11Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <div aria-hidden="true" className={`absolute ${className}`}>
      <div className="h-9 w-24 rounded-full bg-white" />
      <div className="absolute -top-4 left-5 h-10 w-12 rounded-full bg-white" />
    </div>
  );
}

function HeroPanel() {
  return (
    <div aria-hidden="true" className="relative overflow-hidden max-[900px]:hidden">
      {/* Latar gelombang biru */}
      <svg
        viewBox="0 0 600 900"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M130 0C40 150 210 270 100 430C0 590 130 760 0 900H600V0Z"
          fill="var(--blue-edge, #1e88e5)"
        />
        <path
          d="M150 0C70 150 235 270 125 430C25 590 155 760 25 900H600V0Z"
          fill="var(--sky-dark, #42a5f5)"
        />
      </svg>

      <Cloud className="right-[22%] top-[9%]" />
      <Cloud className="right-[4%] top-[34%] scale-75" />
      <Sparkle className="right-[10%] top-[16%]" />
      <Sparkle className="right-[2%] top-[24%]" />
      <Sparkle className="left-[22%] top-[46%] size-4" />

      {/* Maskot + balon kata */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="mb-3 max-w-[260px] rounded-2xl border-2 border-line bg-white px-4 py-2.5 text-center text-sm font-bold leading-snug text-ink">
          Halo! Yuk, daftar dan belajar bersama dengan simula.
        </p>
        <PikoMascot className="mx-auto h-auto w-[300px]" />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== rePassword) {
      setError("Password dan Re-Password tidak sama.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ nama, email, password }),
      });
      // Arahkan ke halaman masuk setelah berhasil daftar
      window.location.assign("/login");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-2 bg-page max-[900px]:grid-cols-1">
      {/* Kiri: form */}
      <main className="relative px-6 pb-12 pt-24 max-[900px]:pt-20 min-[901px]:pl-[18%]">
        <Link
          href="/"
          aria-label="Simula, ke beranda"
          className="absolute left-6 top-8 flex items-center gap-2 font-heading text-[30px] font-black leading-none tracking-[-1px] text-brand no-underline min-[901px]:left-[10%]"
        >
          <Cross size={26} />
          simula
        </Link>

        <h1 className="max-w-[520px] font-heading text-[44px] font-black leading-[1.05] text-ink max-[560px]:text-[34px]">
          Selamat datang di simula!
        </h1>

        <section className="mt-6 w-full max-w-[520px] rounded-[26px] border-2 border-line bg-surface p-8 shadow-pop">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-[22px] font-extrabold text-ink">
              Daftar ke Simula
            </h2>
          </div>

          <form onSubmit={submit} className="mt-3 grid gap-3.5">
            <label className="grid gap-1.5">
              <span className={label}>Nama</span>
              <input
                autoComplete="name"
                placeholder="Masukan Nama"
                className={input}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
              />
            </label>

            <label className="grid gap-1.5">
              <span className={label}>Alamat email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="Masukan Alamat Email"
                className={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="grid gap-1.5">
              <span className={label}>Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Masukkan Password"
                  className={`${input} pr-12`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-ink"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </label>

            <label className="grid gap-1.5">
              <span className={label}>Re-Password</span>
              <div className="relative">
                <input
                  type={showRePassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Masukkan Re-Password"
                  className={`${input} pr-12`}
                  value={rePassword}
                  onChange={(e) => setRePassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRePassword((v) => !v)}
                  aria-label={showRePassword ? "Sembunyikan re-password" : "Tampilkan re-password"}
                  aria-pressed={showRePassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-ink"
                >
                  <EyeIcon off={showRePassword} />
                </button>
              </div>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-[14px] bg-brand-soft px-3.5 py-2.5 text-sm font-bold text-brand"
              >
                {error}
              </p>
            )}

            <button
              disabled={busy}
              className="mt-2 cursor-pointer rounded-[14px] bg-brand px-5 py-3 font-heading text-sm font-extrabold text-white shadow-[0_4px_0_#b71c1c] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Memproses…" : "Daftar"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm font-semibold text-muted">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-extrabold text-brand underline">
              Masuk
            </Link>
          </p>
        </section>
      </main>   

      {/* Kanan: ilustrasi */}
      <HeroPanel />
    </div>
  );
}
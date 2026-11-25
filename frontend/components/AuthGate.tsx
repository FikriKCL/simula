"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { LoadingScreen } from "./Loading";
import { PikoMascot } from "./PikoMascot";
export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<
    "loading" | "signed-in" | "guest" | "error"
  >("loading");
  const [role, setRole] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const expire = () => setState("guest");
    window.addEventListener("simula-auth-expired", expire);
    if (!sessionStorage.getItem("simula-token"))
      Promise.resolve().then(() => {
        if (active) setState("guest");
      });
    else
      api<{ role: string }>("/users/me")
        .then((user) => {
          if (active) {
            setRole(user.role);
            setState("signed-in");
          }
        })
        .catch((e) => {
          if (active) setState(e.status === 401 ? "guest" : "error");
        });
    return () => {
      active = false;
      window.removeEventListener("simula-auth-expired", expire);
    };
  }, [pathname, retry]);
  const protectedPage =
    /^\/(dashboard|materi|profil|belajar|kuis|admin)(\/|$)/.test(pathname);
  if (!protectedPage) return children;
  if (state === "loading")
    return (
      <LoadingScreen label="Memeriksa sesi…" />
    );
  if (state === "error")
    return (
      <GateShell>
        <h1 className="font-heading text-2xl font-extrabold">
          Server belum terhubung
        </h1>
        <p role="alert" className="my-3 font-semibold text-muted">
          Tidak dapat memeriksa sesi. Pastikan backend SIMULA berjalan, lalu
          coba lagi.
        </p>
        <button
          onClick={() => setRetry((v) => v + 1)}
          className={primaryBtn}
        >
          Coba lagi
        </button>
      </GateShell>
    );
  if (state === "guest")
    return (
      <main className="mx-auto mt-16 max-w-md rounded-2xl border-2 border-line bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex w-28 justify-center">
          <PikoMascot className="w-full" animated mood="idle" />
        </div>

        <span className="inline-block rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
          SIMULA
        </span>

        <h1 className="mt-3 text-2xl font-bold tracking-tight">Masuk ke SIMULA</h1>
        <p className="mt-2 mb-6 text-sm leading-relaxed text-muted">
          Masuk untuk membuka materi dan menyimpan progres belajar.
        </p>

        <Link
          className="inline-flex w-full items-center justify-center rounded-xl border-2 border-line bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
          href={`/login?next=${encodeURIComponent(pathname)}`}
        >
          Buka halaman masuk
        </Link>
        <p className="mt-4 text-sm font-semibold text-muted">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-extrabold text-brand underline">
            Daftar
          </Link>
        </p>
      </main>
    );
  if (pathname.startsWith("/admin") && role !== "ADMIN")
    return (
      <GateShell>
        <h1 className="font-heading text-2xl font-extrabold">
          Akses admin diperlukan
        </h1>
        <p className="my-3 font-semibold text-muted">
          Akun ini tidak memiliki izin mengelola situs.
        </p>
        <Link href="/dashboard" className={primaryBtn}>
          Kembali ke pembelajaran
        </Link>
      </GateShell>
    );
  return children;
}

const primaryBtn =
  "inline-block cursor-pointer rounded-[14px] bg-brand px-6 py-3 font-heading text-sm font-extrabold text-white no-underline shadow-[0_4px_0_#b71c1c] transition active:translate-y-1 active:shadow-none";

function GateShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-page px-6">
      <div className="w-full max-w-md rounded-[22px] border-2 border-line bg-surface p-8 text-center shadow-pop">
        {children}
      </div>
    </main>
  );
}

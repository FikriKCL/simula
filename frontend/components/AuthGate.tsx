"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { LoadingScreen } from "./Loading"
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
      <LoadingScreen>

      </LoadingScreen>
    );
  if (state === "error")
    return (
      <div className="p-10" role="alert">
        Tidak dapat memeriksa sesi. Pastikan backend berjalan.{" "}
        <button onClick={() => setRetry((v) => v + 1)}>Coba lagi</button>
      </div>
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
      </main>
    );
  if (pathname.startsWith("/admin") && role !== "ADMIN")
    return (
      <main className="p-10">
        <h1 className="text-2xl font-bold">Akses admin diperlukan</h1>
        <p>Akun ini tidak memiliki izin mengelola situs.</p>
        <Link href="/dashboard" className="underline">
          Kembali ke pembelajaran
        </Link>
      </main>
    );
  return children;
}

"use client";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<
    "loading" | "signed-in" | "guest" | "error"
  >("loading");
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
      api("/users/me")
        .then(() => {
          if (active) setState("signed-in");
        })
        .catch((e) => {
          if (active) setState(e.status === 401 ? "guest" : "error");
        });
    return () => {
      active = false;
      window.removeEventListener("simula-auth-expired", expire);
    };
  }, [pathname, retry]);
  const protectedPage = /^\/(dashboard|materi|profil|belajar|kuis)(\/|$)/.test(
    pathname,
  );
  if (!protectedPage) return children;
  if (state === "loading")
    return (
      <p className="p-10" role="status">
        Memeriksa sesi…
      </p>
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
      <main className="mx-auto mt-20 max-w-lg rounded-2xl border-2 border-line bg-surface p-8">
        <h1 className="text-2xl font-bold">Masuk ke SIMULA</h1>
        <p className="my-4">
          Masuk untuk membuka materi dan menyimpan progres belajar.
        </p>
        <Link
          className="text-brand underline"
          href={`/login?next=${encodeURIComponent(pathname)}`}
        >
          Buka halaman masuk
        </Link>
      </main>
    );
  return children;
}

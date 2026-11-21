"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import ChatWindow from "./ChatWindow";
import { PikoAvatar } from "./PikoAvatar";
import { PikoMascot } from "./PikoMascot";
import {
  IndonesiaFlagIcon,
  SunIcon,
  MoonIcon,
} from "./Icons";
import type { Msg } from "../lib/chat";
import { api } from "../lib/api";

type Account = {
  display_name: string;
};

const demoMessages: Msg[] = [
  {
    from: "bot",
    text: "Halo! Buka halaman Dokter Piko untuk mulai bertanya.",
  },
];

function handleLogout() {
  sessionStorage.removeItem("simula-token");
  window.location.replace("/login");
}

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("simula-theme-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("simula-theme-change", callback);
  };
}

function themeSnapshot(): "light" | "dark" {
  return localStorage.getItem("simula-theme") === "dark"
    ? "dark"
    : "light";
}

function serverThemeSnapshot(): "light" | "dark" {
  return "light";
}

function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    themeSnapshot,
    serverThemeSnapshot,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function setTheme(value: "light" | "dark") {
    localStorage.setItem("simula-theme", value);
    window.dispatchEvent(new Event("simula-theme-change"));
  }

  return [theme, setTheme] as const;
}

export default function RightPanel() {
  const [theme, setTheme] = useTheme();
  const darkMode = theme === "dark";

  const [open, setOpen] = useState(true);
  const [mounted, setMounted] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let active = true;

    api<Account>("/users/me")
      .then((user) => {
        if (active) {
          setAccount(user);
        }
      })
      .catch((error) => {
        console.error("Gagal mengambil profil:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const displayName = account?.display_name || "Pengguna";

  const initials =
    account?.display_name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <>
      <aside className="sticky top-0 flex h-screen flex-col gap-3.5 py-6 pl-2 pr-6 max-[1100px]:hidden">
        {/* Logo dan kontrol tema */}
        <header className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3">
                <div
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[11px] font-black text-[#1E293B]"
                >
                  {initials}
                </div>

                <span
                  title={displayName}
                  className="truncate text-xs font-extrabold text-ink"
                >
                  {displayName}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 cursor-pointer rounded-[12px] border border-line px-3 py-2 text-xs font-extrabold text-[#E5252A] transition-colors hover:bg-[#FEECEB]"
              >
                Keluar
              </button>
               <IndonesiaFlagIcon /> 
            <button
              type="button"
              onClick={() => setTheme(darkMode ? "light" : "dark")}
              aria-label={
                darkMode ? "Aktifkan mode terang" : "Aktifkan mode gelap"
              }
              aria-pressed={darkMode}
              className="flex cursor-pointer items-center gap-0.5 rounded-full border border-line bg-line p-0.5"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                  !darkMode
                    ? "bg-surface text-amber-500 shadow-sm"
                    : "text-muted"
                }`}
              >
                <SunIcon />
              </span>

              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                  darkMode
                    ? "bg-surface text-sky-400 shadow-sm"
                    : "text-muted"
                }`}
              >
                <MoonIcon />
              </span>
            </button>
          </div>
        </header>

        {/* Profil dan logout */}
        <div className="flex items-center justify-between gap-2 px-1">
    
        </div>

        {/* Dokter Piko */}
        <section className="flex flex-col items-center rounded-[28px] bg-sky-soft px-[18px] pb-2 pt-5">
          <div
            className="relative w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm font-extrabold leading-[1.4]
              after:absolute after:-bottom-[9px] after:left-1/2 after:size-4 after:-translate-x-1/2 after:rotate-45
              after:rounded-br-[4px] after:border-b after:border-r after:border-line after:bg-surface after:content-['']"
          >
            Halo! Aku Dokter Piko. Yuk, belajar menolong dengan aman!
          </div>

          <PikoMascot className="mt-3.5 h-auto w-[140px]" />
        </section>

        {/* Chat dengan animasi masuk dan keluar */}
        {mounted && (
          <ChatWindow
            initialMessages={demoMessages}
            onClose={() => setOpen(false)}
            className={`motion-reduce:[animation-duration:0.01ms] ${
              open
                ? "animate-pop-in"
                : "pointer-events-none animate-pop-out"
            }`}
            onAnimationEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                !open
              ) {
                setMounted(false);
              }
            }}
          />
        )}
      </aside>

      {/* Tombol menuju halaman chatbot */}
      <Link
        href="/chatbot"
        aria-label="Buka halaman chat Dokter Piko"
        className="fixed bottom-7 right-7 z-20 grid size-[60px] place-items-center rounded-full border-[3px] border-brand bg-white shadow-float"
      >
        <PikoAvatar size={46} />

        {!open && (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-sky-dark text-[11px] font-extrabold text-white">
            1
          </span>
        )}
      </Link>
    </>
  );
}
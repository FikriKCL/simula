"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import ChatWindow from "./ChatWindow";
import { MoonIcon, SunIcon } from "./Icons";
import { PikoAvatar } from "./PikoAvatar";
import { PikoMascot } from "./PikoMascot";

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("simula-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("simula-theme-change", callback);
  };
}
function themeSnapshot(): "light" | "dark" {
  return localStorage.getItem("simula-theme") === "dark" ? "dark" : "light";
}
function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    themeSnapshot,
    () => "light" as const,
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

const toggleBtn = "grid h-7 w-[30px] place-items-center rounded-full";

export default function RightPanel() {
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(true); // menentukan animasi masuk/keluar
  const [mounted, setMounted] = useState(true); // masih ada di DOM?

  return (
    <>
      <aside className="sticky top-0 flex h-screen flex-col gap-3.5 py-6 pl-2 pr-6 max-[1100px]:hidden">
        {/* Bar atas */}
        <div className="flex h-9 items-center justify-between px-1">
          <div
            className="flex h-5 w-7 flex-col overflow-hidden rounded-[3px] border border-line"
            aria-label="Bahasa Indonesia"
          >
            <span className="flex-1 bg-[#e53935]" />
            <span className="flex-1 bg-white" />
          </div>

          <div
            className="flex gap-0.5 rounded-full bg-line p-[3px]"
            role="group"
            aria-label="Tema"
          >
            <button
              onClick={() => setTheme("light")}
              aria-label="Mode terang"
              className={`${toggleBtn} ${
                theme === "light"
                  ? "bg-surface text-ink shadow-[0_1px_4px_rgba(0,0,0,0.18)]"
                  : "text-muted"
              }`}
            >
              <SunIcon />
            </button>
            <button
              onClick={() => setTheme("dark")}
              aria-label="Mode gelap"
              className={`${toggleBtn} ${
                theme === "dark"
                  ? "bg-surface text-ink shadow-[0_1px_4px_rgba(0,0,0,0.18)]"
                  : "text-muted"
              }`}
            >
              <MoonIcon />
            </button>
          </div>
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

        {/* Chat dengan animasi pop in / pop out */}
        {mounted && (
          <ChatWindow
            onClose={() => setOpen(false)}
            className={`motion-reduce:[animation-duration:0.01ms] ${
              open ? "animate-pop-in" : "pointer-events-none animate-pop-out"
            }`}
            onAnimationEnd={(e) => {
              if (e.target === e.currentTarget && !open) setMounted(false);
            }}
          />
        )}
      </aside>

      {/* Tombol Dokter: menuju halaman chatbot penuh */}
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

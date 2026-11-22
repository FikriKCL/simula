"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ChatWindow from "./ChatWindow";
import { PikoAvatar } from "./PikoAvatar";
import { PikoMascot } from "./PikoMascot";
import {
  IndonesiaFlagIcon,
  SunIcon,
  MoonIcon,
} from "./Icons";
import { api } from "../lib/api";

type Account = {
  display_name: string;
};

// Di bawah lebar ini panel kanan disembunyikan (max-[1100px]:hidden), jadi tombol Piko membuka halaman chat
const PANEL_HIDDEN_QUERY = "(max-width: 1100px)";

// Tinggi chat yang bisa diatur pengguna. Lebar tetap mengikuti kolom panel (320px) agar jalur belajar
// di tengah tidak tertutup. Batas bawah menjaga kotak ketik + beberapa pesan tetap terlihat; batas atas
// adalah seluruh tinggi panel (kartu maskot disembunyikan bila chat membutuhkan ruangnya).
const CHAT_MIN_HEIGHT = 260;
const CHAT_HEIGHT_KEY = "simula-chat-height";
const KEY_STEP = 24;
// Ada dua keadaan: maskot tampil (tinggi bebas sampai batas maskot), atau chat penuh (maskot
// disembunyikan). Tinggi di antaranya akan menyisakan ruang kosong di atas chat, jadi tidak dipakai:
// menarik melewati batas maskot sejauh ini langsung membesarkan chat ke penuh.
const SNAP_TO_MAX_PX = 40;

type Bounds = {
  /** Tinggi maksimal: dari atas kartu maskot sampai dasar panel. */
  max: number;
  /** Tinggi maksimal selama kartu maskot masih ditampilkan. */
  withMascot: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function readStoredHeight(): number | null {
  try {
    const value = Number(localStorage.getItem(CHAT_HEIGHT_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function storeHeight(value: number | null) {
  try {
    if (value === null) localStorage.removeItem(CHAT_HEIGHT_KEY);
    else localStorage.setItem(CHAT_HEIGHT_KEY, String(Math.round(value)));
  } catch {
    // Penyimpanan diblokir (mode privat): ukuran hanya berlaku sampai halaman dimuat ulang
  }
}

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

  const router = useRouter();
  // open: chat terlihat; visible: masih di layar (selama animasi keluar). Chat tidak di-unmount saat
  // dikecilkan, jadi percakapan dan jawaban yang sedang ditulis tetap ada ketika dibuka lagi.
  const [open, setOpen] = useState(true);
  const [visible, setVisible] = useState(true);
  const [unread, setUnread] = useState(false);
  // Dibaca saat jawaban selesai (callback async), jadi pakai ref agar tidak memakai nilai lama
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const [account, setAccount] = useState<Account | null>(null);

  // ---- Ukuran chat ----
  const asideRef = useRef<HTMLElement>(null);
  const mascotRef = useRef<HTMLElement>(null);
  const chatRef = useRef<HTMLElement>(null);
  // Posisi kartu maskot diingat saat masih tampil, karena saat disembunyikan ia tidak bisa diukur
  const mascotBox = useRef({ top: 0, height: 0 });
  // null = tinggi otomatis (mengikuti isi, seperti desain awal)
  const [chatHeight, setChatHeight] = useState<number | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const beforeMaximize = useRef<number | null>(null);

  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    let first = true;
    const measure = () => {
      const mascot = mascotRef.current;
      if (mascot && mascot.offsetHeight > 0) {
        mascotBox.current = { top: mascot.offsetTop, height: mascot.offsetHeight };
      }
      const styles = getComputedStyle(aside);
      const bottom = aside.clientHeight - parseFloat(styles.paddingBottom);
      const gap = parseFloat(styles.rowGap) || 0;
      const { top, height } = mascotBox.current;
      setBounds({ max: bottom - top, withMascot: bottom - (top + height + gap) });
      if (first) {
        first = false;
        setChatHeight(readStoredHeight());
      }
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => requestAnimationFrame(measure));
    observer.observe(aside);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const maxHeight = bounds?.max ?? 0;
  const effectiveHeight =
    // Dinormalisasi juga di sini: tinggi tersimpan dari layar lain bisa jatuh di antara dua keadaan
    chatHeight === null || !bounds ? null : normalize(chatHeight, bounds);
  const mascotHidden = effectiveHeight !== null && bounds !== null && effectiveHeight > bounds.withMascot;
  const maximized = effectiveHeight !== null && effectiveHeight >= maxHeight - 1;

  /** Batasi tinggi ke salah satu dari dua keadaan yang rapi (lihat SNAP_TO_MAX_PX). */
  function normalize(value: number, b: Bounds) {
    const v = clamp(value, CHAT_MIN_HEIGHT, b.max);
    // Layar pendek: di bawah maskot tidak cukup ruang untuk tinggi minimal, jadi tinggi yang diatur
    // selalu berarti penuh (pilihan lainnya adalah ukuran awal, lewat restore/klik dua kali)
    if (b.withMascot < CHAT_MIN_HEIGHT) return b.max;
    if (v <= b.withMascot) return v;
    return v >= b.withMascot + SNAP_TO_MAX_PX ? b.max : b.withMascot;
  }

  function applyHeight(value: number | null, persist = true) {
    const next = value === null || !bounds ? value : normalize(value, bounds);
    setChatHeight(next);
    if (persist) storeHeight(next);
  }

  function toggleMaximize() {
    if (maximized) {
      const previous = beforeMaximize.current;
      // Kalau ukuran sebelumnya juga berarti penuh (mis. layar pendek), kembali ke ukuran awal
      const restoresToMax = previous !== null && bounds !== null && normalize(previous, bounds) >= maxHeight - 1;
      applyHeight(restoresToMax ? null : previous);
    } else {
      beforeMaximize.current = effectiveHeight;
      applyHeight(maxHeight);
    }
  }

  function startResize(event: React.PointerEvent<HTMLDivElement>) {
    const aside = asideRef.current;
    if (!bounds || !chatRef.current || !aside) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    // Saat diatur, chat menempel ke dasar panel. Mulai dari tinggi "tepi atas sekarang sampai dasar"
    // agar tepi atas tidak melompat dan langsung mengikuti kursor.
    const panelBottom =
      aside.getBoundingClientRect().top + aside.clientHeight - parseFloat(getComputedStyle(aside).paddingBottom);
    const startHeight = clamp(panelBottom - chatRef.current.getBoundingClientRect().top, CHAT_MIN_HEIGHT, bounds.max);
    let latest = startHeight;
    const onMove = (move: PointerEvent) => {
      // Pegangan ada di tepi atas: menarik ke atas = chat lebih tinggi
      const next = normalize(startHeight + (startY - move.clientY), bounds);
      latest = next;
      setChatHeight(next);
    };
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      beforeMaximize.current = null;
      storeHeight(latest);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  function resizeWithKeyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = effectiveHeight ?? chatRef.current?.getBoundingClientRect().height ?? CHAT_MIN_HEIGHT;
    const atMascotLimit = bounds !== null && current >= bounds.withMascot - 1;
    const keys: Record<string, number> = {
      // Di batas maskot, satu langkah lagi = penuh; dari penuh, satu langkah turun = batas maskot
      ArrowUp: atMascotLimit ? maxHeight : current + KEY_STEP,
      ArrowDown: maximized && bounds ? bounds.withMascot : current - KEY_STEP,
      Home: CHAT_MIN_HEIGHT,
      End: maxHeight,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    applyHeight(keys[event.key]);
  }

  function toggleChat() {
    if (window.matchMedia(PANEL_HIDDEN_QUERY).matches) {
      router.push("/chatbot");
      return;
    }
    if (open) {
      setOpen(false);
    } else {
      setVisible(true);
      setOpen(true);
      setUnread(false);
    }
  }

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
      {/* pb besar: ruang untuk tombol Piko melayang supaya tidak menutupi kotak ketik */}
      <aside ref={asideRef} className="sticky top-0 flex h-screen flex-col gap-3.5 pb-[100px] pl-2 pr-6 pt-6 max-[1100px]:hidden">
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
        <section
          ref={mascotRef}
          className={`flex shrink-0 flex-col items-center rounded-[28px] bg-sky-soft px-[18px] pb-2 pt-5 ${
            mascotHidden ? "hidden" : ""
          }`}
        >
          <div
            className="relative w-full rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm font-extrabold leading-[1.4]
              after:absolute after:-bottom-[9px] after:left-1/2 after:size-4 after:-translate-x-1/2 after:rotate-45
              after:rounded-br-[4px] after:border-b after:border-r after:border-line after:bg-surface after:content-['']"
          >
            Halo! Aku Dokter Piko. Yuk, belajar menolong dengan aman!
          </div>

          <PikoMascot className="mt-3.5 h-auto w-[140px]" />
        </section>

        {/* Chat: tumbuh mengikuti percakapan sampai sisa tinggi panel, lalu isinya digulir */}
        <ChatWindow
          ref={chatRef}
          onToggleMaximize={toggleMaximize}
          maximized={maximized}
          style={effectiveHeight === null ? undefined : { height: effectiveHeight }}
          topSlot={
            // Pegangan untuk mengubah tinggi chat (geser, atau panah atas/bawah saat fokus)
            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Ubah tinggi chat"
              aria-valuemin={CHAT_MIN_HEIGHT}
              aria-valuemax={Math.round(maxHeight)}
              aria-valuenow={effectiveHeight === null ? undefined : Math.round(effectiveHeight)}
              tabIndex={0}
              title="Geser untuk mengubah tinggi · klik dua kali untuk ukuran awal"
              onPointerDown={startResize}
              onKeyDown={resizeWithKeyboard}
              onDoubleClick={() => applyHeight(null)}
              className="group absolute inset-x-0 top-0 z-10 flex h-3 cursor-ns-resize touch-none justify-center outline-none"
            >
              <span className="mt-1 h-1 w-9 rounded-full bg-white/45 transition-colors group-hover:bg-white/85 group-focus-visible:bg-white" />
            </div>
          }
          onClose={() => setOpen(false)}
          onReply={() => {
            if (!openRef.current) setUnread(true);
          }}
          className={`${
            // Layar pendek: ukuran awal boleh lebih kecil dari batas minimal agar tidak menabrak tombol Piko
            bounds && bounds.withMascot < CHAT_MIN_HEIGHT ? "min-h-0" : "min-h-[260px]"
          } ${effectiveHeight === null ? "" : "mt-auto shrink-0"} motion-reduce:[animation-duration:0.01ms] ${
            open ? "animate-pop-in" : "pointer-events-none animate-pop-out"
          } ${visible ? "" : "hidden"}`}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && !open) setVisible(false);
          }}
        />
      </aside>

      {/* Tombol Piko: kecilkan / buka lagi chat di panel kanan */}
      <button
        type="button"
        onClick={toggleChat}
        aria-expanded={open}
        aria-label={open ? "Kecilkan chat Dokter Piko" : "Buka chat Dokter Piko"}
        title={open ? "Kecilkan chat" : "Buka chat"}
        className="fixed bottom-7 right-7 z-20 grid size-[60px] cursor-pointer place-items-center rounded-full border-[3px] border-brand bg-white shadow-float transition-transform hover:scale-105"
      >
        <PikoAvatar size={46} />

        {/* Badge: ada jawaban baru selama chat dikecilkan */}
        {!open && unread && (
          <span
            aria-label="Ada jawaban baru"
            className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-sky-dark text-[11px] font-extrabold text-white"
          >
            1
          </span>
        )}
      </button>
    </>
  );
}
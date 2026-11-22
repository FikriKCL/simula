"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ChatWindow from "./ChatWindow";
import { PikoAvatar } from "./PikoAvatar";
import type { PikoMood } from "./PikoMascot";
import { PikoCard, PIKO_CARD_HIDE_BELOW } from "./PikoCard";
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
// di tengah tidak tertutup. Ruang di atas chat selalu diisi kartu Dokter Piko, yang ikut mengecil
// (tegak -> mendatar -> hilang) saat chat dibesarkan, jadi tidak pernah ada ruang kosong.
const CHAT_MIN_HEIGHT = 260;
const CHAT_HEIGHT_KEY = "simula-chat-height";
const KEY_STEP = 32;
// Perkiraan tinggi alami kartu Piko sebelum sempat diukur
const PIKO_CARD_FALLBACK = 290;

// Ucapan Dokter Piko: bergantian saat diam, dan bereaksi pada chat
// Semua ucapan dibuat muat 2 baris (seperti teks di Figma) agar tinggi balon tidak berubah-ubah
const PIKO_TIPS = [
  "Halo! Aku Dokter Piko. Yuk, belajar menolong dengan aman!",
  "Ada pertanyaan soal P3K? Tanyakan di bawah, ya!",
  "Ingat: jaga keselamatan dirimu dulu sebelum menolong!",
  "Darurat? Panggil orang dewasa, lalu hubungi 112/119.",
  "Selesaikan kuis untuk membuka level berikutnya!",
];
const PIKO_THINKING = "Hmm, sebentar ya… aku cek buku panduan dulu.";
const PIKO_ANSWERED = "Sudah kujawab di bawah! Mau tanya lagi?";
const TIP_INTERVAL_MS = 8000;
const HAPPY_MS = 4000;

type Bounds = {
  /** Tinggi maksimal chat: ruang dari atas kartu Piko sampai dasar panel, dikurangi celah flex. */
  max: number;
  /** Jarak antar elemen panel (gap flex). */
  gap: number;
  /** Tinggi alami kartu Piko (desain awal). */
  pikoNatural: number;
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
  const pikoRef = useRef<HTMLElement>(null);
  const chatRef = useRef<HTMLElement>(null);
  // Tinggi alami kartu Piko (desain awal), diukur selama kartu belum diperkecil
  const pikoNatural = useRef(PIKO_CARD_FALLBACK);
  // null = tinggi otomatis (mengikuti isi, seperti desain awal)
  const [chatHeight, setChatHeight] = useState<number | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [dragging, setDragging] = useState(false);
  const beforeMaximize = useRef<number | null>(null);

  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    let first = true;
    const measure = () => {
      const piko = pikoRef.current;
      if (!piko) return;
      if (!piko.style.height) pikoNatural.current = piko.offsetHeight;
      const styles = getComputedStyle(aside);
      const bottom = aside.clientHeight - parseFloat(styles.paddingBottom);
      // offsetTop tetap benar walau kartu sedang diperkecil: elemen di atasnya tidak berubah
      const gap = parseFloat(styles.rowGap) || 0;
      // Celah flex di antara kartu Piko dan chat tetap ada walau kartu setinggi 0
      setBounds({
        max: bottom - piko.offsetTop - gap,
        gap,
        pikoNatural: pikoNatural.current,
      });
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

  /** Tinggi chat yang dipakai: dalam batas, dan langsung penuh bila sisa ruang Piko terlalu kecil. */
  function normalize(value: number, b: Bounds) {
    const v = clamp(value, CHAT_MIN_HEIGHT, b.max);
    return b.max - v < PIKO_CARD_HIDE_BELOW ? b.max : v;
  }

  const effectiveHeight = chatHeight === null || !bounds ? null : normalize(chatHeight, bounds);
  const maximized = effectiveHeight !== null && effectiveHeight >= maxHeight - 1;
  // Kartu Piko mengisi tepat ruang di atas chat (undefined = ukuran alami)
  const pikoHeight =
    effectiveHeight === null || !bounds ? undefined : Math.max(0, bounds.max - effectiveHeight);
  // Layar pendek: ukuran awal chat boleh di bawah batas minimal agar tidak menabrak tombol Piko
  const shortPanel = bounds !== null && bounds.max - bounds.pikoNatural < CHAT_MIN_HEIGHT;

  function applyHeight(value: number | null, persist = true) {
    const next = value === null || !bounds ? value : normalize(value, bounds);
    setChatHeight(next);
    if (persist) storeHeight(next);
  }

  function toggleMaximize() {
    if (maximized) {
      const previous = beforeMaximize.current;
      // Kalau ukuran sebelumnya juga berarti penuh, kembali ke ukuran awal
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
    setDragging(true);
    const startY = event.clientY;
    // Mulai dari "tepi atas chat sampai dasar panel" agar tepi atas tidak melompat
    const panelBottom =
      aside.getBoundingClientRect().top + aside.clientHeight - parseFloat(getComputedStyle(aside).paddingBottom);
    const startHeight = clamp(panelBottom - chatRef.current.getBoundingClientRect().top, CHAT_MIN_HEIGHT, bounds.max);
    let latest = startHeight;
    const onMove = (move: PointerEvent) => {
      // Pegangan ada di tepi atas: menarik ke atas = chat lebih tinggi, kartu Piko mengecil
      latest = normalize(startHeight + (startY - move.clientY), bounds);
      setChatHeight(latest);
    };
    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      setDragging(false);
      beforeMaximize.current = null;
      storeHeight(latest);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  function resizeWithKeyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    const current = effectiveHeight ?? chatRef.current?.getBoundingClientRect().height ?? CHAT_MIN_HEIGHT;
    const keys: Record<string, number> = {
      ArrowUp: current + KEY_STEP,
      // Dari penuh, turun ke tinggi terbesar yang masih menampilkan kartu Piko
      ArrowDown: maximized && bounds ? bounds.max - PIKO_CARD_HIDE_BELOW : current - KEY_STEP,
      Home: CHAT_MIN_HEIGHT,
      End: maxHeight,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    applyHeight(keys[event.key]);
  }

  // ---- Ucapan & ekspresi Dokter Piko ----
  const [tipIndex, setTipIndex] = useState(0);
  const [chatBusy, setChatBusy] = useState(false);
  const [happy, setHappy] = useState(false);
  useEffect(() => {
    if (chatBusy || happy) return; // jangan ganti tips saat sedang bereaksi pada chat
    const timer = setInterval(() => setTipIndex((i) => (i + 1) % PIKO_TIPS.length), TIP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [chatBusy, happy]);
  useEffect(() => {
    if (!happy) return;
    const timer = setTimeout(() => setHappy(false), HAPPY_MS);
    return () => clearTimeout(timer);
  }, [happy]);
  const pikoMood: PikoMood = chatBusy ? "thinking" : happy ? "happy" : "idle";
  const pikoMessage = chatBusy ? PIKO_THINKING : happy ? PIKO_ANSWERED : PIKO_TIPS[tipIndex];

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

        {/* Dokter Piko: ikut mengecil saat chat dibesarkan */}
        <PikoCard
          ref={pikoRef}
          height={pikoHeight}
          message={pikoMessage}
          mood={pikoMood}
          animateSize={!dragging}
        />

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
          onBusyChange={setChatBusy}
          onReply={() => {
            setHappy(true);
            if (!openRef.current) setUnread(true);
          }}
          className={`${shortPanel ? "min-h-0" : "min-h-[260px]"} ${effectiveHeight === null ? "" : "shrink-0"} ${
            dragging ? "" : "transition-[height] duration-300 ease-out"
          } motion-reduce:[animation-duration:0.01ms] ${
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
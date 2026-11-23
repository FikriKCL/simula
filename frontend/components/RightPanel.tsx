"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ChatWindow from "./ChatWindow";
import LogoutDialog from "./LogoutDialog";
import { IndonesiaFlagIcon, MoonIcon, SunIcon } from "./Icons";
import { PikoAvatar } from "./PikoAvatar";
import { PikoCard, PIKO_CARD_HIDE_BELOW } from "./PikoCard";
import type { PikoMood } from "./PikoMascot";
import { api } from "../lib/api";
import { useTheme } from "../lib/useTheme";

/* ============================================================
   Konstanta
   ============================================================ */

// Di bawah lebar ini panel kanan disembunyikan (max-[1100px]:hidden), jadi chat tampil sebagai sheet mobile
const PANEL_HIDDEN_QUERY = "(max-width: 1100px)";

// Tinggi navbar bawah di mobile (px), supaya tombol Piko berada di atasnya. Sesuaikan dengan navbar Anda.
const MOBILE_BOTTOM_NAV = 72;

// z-index: menu akun < tombol Piko < sheet chat. LogoutDialog sebaiknya di atas Z_SHEET (mis. z-[70]).
const Z_ACCOUNT = 44;
const Z_PIKO_BUTTON = 45;
const Z_SHEET = 60;

const CHAT_MIN_HEIGHT = 260;
const CHAT_HEIGHT_KEY = "simula-chat-height";
const KEY_STEP = 32;
const PIKO_CARD_FALLBACK = 290;

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

/* ============================================================
   Tipe dan fungsi bantu
   ============================================================ */

type Account = {
  display_name: string;
};

type Bounds = {
  max: number;
  gap: number;
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

function getInitials(name: string | undefined) {
  if (!name) return "?";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
}

/** Profil pengguna yang sedang masuk. */
function useAccount() {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let active = true;

    api<Account>("/users/me")
      .then((user) => {
        if (active) setAccount(user);
      })
      .catch((error) => {
        console.error("Gagal mengambil profil:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  return account;
}

/**
 * Apakah layar sempit (panel kanan disembunyikan)?
 * null = belum diketahui (render pertama / SSR), supaya ChatWindow tidak sempat dipasang di tempat yang salah.
 */
function useIsNarrow() {
  const [narrow, setNarrow] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(PANEL_HIDDEN_QUERY);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return narrow;
}

/* ============================================================
   Potongan tampilan kecil
   ============================================================ */

function ProfileChip({ name, initials }: { name: string; initials: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3">
      <div
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[11px] font-black text-ink"
      >
        {initials}
      </div>
      <span title={name} className="truncate text-xs font-extrabold text-ink">
        {name}
      </span>
    </div>
  );
}

function ThemeToggle({ dark, onChange }: { dark: boolean; onChange: (theme: "light" | "dark") => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(dark ? "light" : "dark")}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      aria-pressed={dark}
      className="flex shrink-0 cursor-pointer items-center gap-0.5 rounded-full border border-line bg-line p-0.5"
    >
      <span
        className={`flex size-6 items-center justify-center rounded-full transition-all ${
          dark ? "text-muted" : "bg-surface text-gold shadow-sm"
        }`}
      >
        <SunIcon />
      </span>
      <span
        className={`flex size-6 items-center justify-center rounded-full transition-all ${
          dark ? "bg-surface text-sky shadow-sm" : "text-muted"
        }`}
      >
        <MoonIcon />
      </span>
    </button>
  );
}

function MobileAccountMenu({
  name,
  initials,
  dark,
  onTheme,
  onLogout,
}: {
  name: string;
  initials: string;
  dark: boolean;
  onTheme: (theme: "light" | "dark") => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu akun"
        style={{
          position: "fixed",
          right: 16,
          top: "calc(12px + env(safe-area-inset-top, 0px))",
          zIndex: Z_ACCOUNT,
        }}
        className="grid size-10 cursor-pointer place-items-center rounded-full border border-line bg-surface text-[13px] font-black text-ink shadow-float"
      >
        <span className="grid size-8 place-items-center rounded-full bg-gold-soft">{initials}</span>
      </button>

      {open && (
        <>
          {/* Klik di luar menu untuk menutup */}
          <button
            type="button"
            aria-label="Tutup menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: Z_ACCOUNT }}
            className="cursor-default"
          />
          <div
            role="menu"
            aria-label="Menu akun"
            style={{
              position: "fixed",
              right: 16,
              top: "calc(56px + env(safe-area-inset-top, 0px))",
              zIndex: Z_ACCOUNT,
            }}
            className="flex w-64 max-w-[calc(100vw-2rem)] animate-pop-in flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-float"
          >
            <ProfileChip name={name} initials={initials} />

            <div className="flex items-center justify-between gap-2 px-1">
              <span className="flex items-center gap-2 text-xs font-extrabold text-ink">
                <IndonesiaFlagIcon />
                Bahasa Indonesia
              </span>
              <ThemeToggle dark={dark} onChange={onTheme} />
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="cursor-pointer rounded-xl border border-line px-3 py-2 text-xs font-extrabold text-brand transition-colors hover:bg-brand-soft"
            >
              Keluar
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ============================================================
   Panel kanan
   ============================================================ */

export default function RightPanel() {
  const [theme, setTheme] = useTheme();
  const account = useAccount();
  const narrow = useIsNarrow();

  const displayName = account?.display_name || "Pengguna";
  const initials = getInitials(account?.display_name);

  const [confirmLogout, setConfirmLogout] = useState(false);

  /* ---------- Buka / tutup chat ---------- */

  // Desktop: open = chat terlihat; visible = masih di layar (selama animasi keluar).
  const [open, setOpen] = useState(true);
  const [visible, setVisible] = useState(true);
  // Mobile: sheet chat terpisah dari state desktop
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileFull, setMobileFull] = useState(false);
  const [unread, setUnread] = useState(false);

  const chatShown = narrow ? mobileOpen : open;
  // Dibaca saat jawaban selesai (callback async), jadi pakai ref agar tidak memakai nilai lama
  const shownRef = useRef(chatShown);
  useEffect(() => {
    shownRef.current = chatShown;
  }, [chatShown]);

  // Layar dilebarkan lagi: tutup sheet mobile
  useEffect(() => {
    if (narrow === false) {
      setMobileOpen(false);
      setMobileFull(false);
    }
  }, [narrow]);

  // Sheet mobile: kunci scroll halaman dan tutup dengan Esc
  useEffect(() => {
    if (!narrow || !mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [narrow, mobileOpen]);

  function toggleChat() {
    if (narrow) {
      setMobileOpen((value) => !value);
      setUnread(false);
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

  /* ---------- Ukuran chat (desktop) ---------- */

  const asideRef = useRef<HTMLElement>(null);
  const pikoRef = useRef<HTMLElement>(null);
  const chatRef = useRef<HTMLElement>(null);
  const pikoNatural = useRef(PIKO_CARD_FALLBACK);
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
      // Aside sedang display:none (layar sempit): ukuran terbaca 0, jangan merusak nilai terakhir yang benar
      if (aside.clientHeight === 0) return;
      if (!piko.style.height && piko.offsetHeight > 0) pikoNatural.current = piko.offsetHeight;
      const styles = getComputedStyle(aside);
      const bottom = aside.clientHeight - parseFloat(styles.paddingBottom);
      const gap = parseFloat(styles.rowGap) || 0;
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

  function normalize(value: number, b: Bounds) {
    const v = clamp(value, CHAT_MIN_HEIGHT, b.max);
    return b.max - v < PIKO_CARD_HIDE_BELOW ? b.max : v;
  }

  const effectiveHeight = chatHeight === null || !bounds ? null : normalize(chatHeight, bounds);
  const maximized = effectiveHeight !== null && effectiveHeight >= maxHeight - 1;
  const pikoHeight =
    effectiveHeight === null || !bounds ? undefined : Math.max(0, bounds.max - effectiveHeight);
  const shortPanel = bounds !== null && bounds.max - bounds.pikoNatural < CHAT_MIN_HEIGHT;

  function applyHeight(value: number | null, persist = true) {
    const next = value === null || !bounds ? value : normalize(value, bounds);
    setChatHeight(next);
    if (persist) storeHeight(next);
  }

  function toggleMaximize() {
    if (maximized) {
      const previous = beforeMaximize.current;
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
    const panelBottom =
      aside.getBoundingClientRect().top + aside.clientHeight - parseFloat(getComputedStyle(aside).paddingBottom);
    const startHeight = clamp(panelBottom - chatRef.current.getBoundingClientRect().top, CHAT_MIN_HEIGHT, bounds.max);
    let latest = startHeight;
    const onMove = (move: PointerEvent) => {
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
      ArrowDown: maximized && bounds ? bounds.max - PIKO_CARD_HIDE_BELOW : current - KEY_STEP,
      Home: CHAT_MIN_HEIGHT,
      End: maxHeight,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    applyHeight(keys[event.key]);
  }

  /* ---------- Ucapan dan ekspresi Dokter Piko ---------- */

  const [tipIndex, setTipIndex] = useState(0);
  const [chatBusy, setChatBusy] = useState(false);
  const [happy, setHappy] = useState(false);

  useEffect(() => {
    if (chatBusy || happy) return;
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

  const handleReply = () => {
    setHappy(true);
    if (!shownRef.current) setUnread(true);
  };

  /* ---------- Tampilan ---------- */

  return (
    <>
      {/* pb besar: ruang untuk tombol Piko melayang supaya tidak menutupi kotak ketik */}
      <aside
        ref={asideRef}
        className="sticky top-0 flex h-screen flex-col gap-3.5 pb-[100px] pl-2 pr-6 pt-6 max-[1100px]:hidden"
      >
        {/* Profil, logout, bahasa, dan tema */}
        <header className="flex items-center gap-2 px-1">
          <ProfileChip name={displayName} initials={initials} />

          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="shrink-0 cursor-pointer rounded-xl border border-line px-3 py-2 text-xs font-extrabold text-brand transition-colors hover:bg-brand-soft"
          >
            Keluar
          </button>

          <span className="shrink-0">
            <IndonesiaFlagIcon />
          </span>

          <ThemeToggle dark={theme === "dark"} onChange={setTheme} />
        </header>

        {/* Dokter Piko: ikut mengecil saat chat dibesarkan */}
        <PikoCard
          ref={pikoRef}
          height={pikoHeight}
          message={pikoMessage}
          mood={pikoMood}
          animateSize={!dragging}
        />

        {/* Chat desktop. Hanya dipasang saat layar lebar; di layar sempit chat tampil di sheet mobile */}
        {narrow === false && (
          <ChatWindow
            ref={chatRef}
            onToggleMaximize={toggleMaximize}
            maximized={maximized}
            style={effectiveHeight === null ? undefined : { height: effectiveHeight }}
            topSlot={
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
            onReply={handleReply}
            className={`${shortPanel ? "min-h-0" : "min-h-[260px]"} ${effectiveHeight === null ? "" : "shrink-0"} ${
              dragging ? "" : "transition-[height] duration-300 ease-out"
            } motion-reduce:[animation-duration:0.01ms] ${
              open ? "animate-pop-in" : "pointer-events-none animate-pop-out"
            } ${visible ? "" : "hidden"}`}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && !open) setVisible(false);
            }}
          />
        )}
      </aside>

      {/* Menu akun, tombol Piko, dan sheet mobile dirender lewat portal ke <body>,
          jadi tetap muncul walau elemen induk RightPanel disembunyikan oleh layout */}
      {narrow !== null &&
        createPortal(
          <>
            {narrow && (
              <MobileAccountMenu
                name={displayName}
                initials={initials}
                dark={theme === "dark"}
                onTheme={setTheme}
                onLogout={() => setConfirmLogout(true)}
              />
            )}

            {/* Tombol Piko: disembunyikan saat sheet mobile terbuka.
                Posisi lewat inline style supaya tidak bergantung pada class arbitrary Tailwind. */}
            {!(narrow && mobileOpen) && (
              <button
                type="button"
                onClick={toggleChat}
                aria-expanded={chatShown}
                aria-label={chatShown ? "Kecilkan chat Dokter Piko" : "Buka chat Dokter Piko"}
                title={chatShown ? "Kecilkan chat" : "Buka chat"}
                style={{
                  position: "fixed",
                  right: narrow ? 16 : 28,
                  bottom: narrow
                    ? `calc(${MOBILE_BOTTOM_NAV + 16}px + env(safe-area-inset-bottom, 0px))`
                    : "28px",
                  zIndex: Z_PIKO_BUTTON,
                }}
                className="grid size-[60px] cursor-pointer place-items-center rounded-full border-[3px] border-brand bg-white shadow-float transition-transform hover:scale-105"
              >
                <PikoAvatar size={46} />
                {!chatShown && unread && (
                  <span
                    aria-label="Ada jawaban baru"
                    className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-sky-dark text-[11px] font-extrabold text-white"
                  >
                    1
                  </span>
                )}
              </button>
            )}

            {/* Bottom sheet mobile: tetap terpasang (hanya disembunyikan) supaya riwayat,
                stream jawaban, dan badge "jawaban baru" tetap jalan saat sheet ditutup */}
            {narrow && (
              <div
                aria-hidden={!mobileOpen}
                style={{ position: "fixed", inset: 0, zIndex: Z_SHEET }}
                className={`items-end justify-center ${mobileOpen ? "flex" : "hidden"}`}
              >
                <button
                  type="button"
                  aria-label="Tutup chat"
                  tabIndex={mobileOpen ? 0 : -1}
                  onClick={() => setMobileOpen(false)}
                  className="absolute inset-0 cursor-default bg-black/40"
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Chat Dokter Piko"
                  className={`relative flex w-full animate-pop-in flex-col motion-reduce:[animation-duration:0.01ms] ${
                    mobileFull
                      ? "h-[100dvh] max-w-none px-0 pb-0"
                      : "h-[min(85dvh,720px)] max-w-md px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                  }`}
                >
                  {/* Avatar + ucapan Dokter Piko. Disembunyikan saat layar penuh supaya ruang chat maksimal */}
                  {!mobileFull && (
                    <div className="mb-2 flex shrink-0 items-end gap-2 px-1">
                      <div
                        className={`grid size-12 shrink-0 place-items-center rounded-full border-[3px] border-brand bg-white shadow-float ${
                          chatBusy ? "animate-pulse" : ""
                        }`}
                      >
                        <PikoAvatar size={38} />
                      </div>
                      <p className="rounded-2xl rounded-bl-sm bg-surface px-3 py-2 text-xs font-bold leading-snug text-ink shadow-float">
                        {pikoMessage}
                      </p>
                    </div>
                  )}

                  <ChatWindow
                    onToggleMaximize={() => setMobileFull((v) => !v)}
                    maximized={mobileFull}
                    onClose={() => setMobileOpen(false)}
                    onBusyChange={setChatBusy}
                    onReply={handleReply}
                    className={`min-h-0 w-full flex-1 ${mobileFull ? "!rounded-none" : ""}`}
                  />
                </div>
              </div>
            )}
          </>,
          document.body,
        )}

      {/* Konfirmasi sebelum logout */}
      <LogoutDialog open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={handleLogout} />
    </>
  );
}
"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEventHandler,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { CloseIcon, SendIcon } from "./Icons";
import { PikoAvatar } from "./PikoAvatar";
import Markdown from "./chat/Markdown";
import { ChatRequestError, buildHistory, streamChat } from "../lib/chat/stream";
import { MAX_INPUT_CHARS } from "../lib/chat/constants";
import type { Message } from "../lib/chat/types";

type Props = {
  /** Tampilan halaman penuh (tinggi 100%, pesan lebih besar). */
  full?: boolean;
  /** Tombol tutup/kecilkan (mode panel). */
  onClose?: () => void;
  /** Kalau diisi, tombol di header jadi link kembali (mode halaman). */
  backHref?: string;
  /** Kalau diisi, header punya tombol untuk membuka halaman chat penuh. */
  expandHref?: string;
  /** Kalau diisi, tombol di header membesarkan chat ke ukuran maksimal (menggantikan expandHref). */
  onToggleMaximize?: () => void;
  maximized?: boolean;
  /** Elemen di tepi atas kartu, misalnya pegangan untuk mengubah tinggi. */
  topSlot?: ReactNode;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
  /** Dipanggil setiap Dokter Piko selesai menjawab (dipakai untuk badge saat panel dikecilkan). */
  onReply?: () => void;
  /** Dipanggil saat Dokter Piko mulai / selesai menjawab (dipakai ekspresi maskot). */
  onBusyChange?: (busy: boolean) => void;
  className?: string;
  onAnimationEnd?: AnimationEventHandler<HTMLElement>;
  /** Sapaan pertama Dokter Piko. */
  greeting?: string;
  /** Chip saran awal; setelah menjawab, backend mengirim saran lanjutan. */
  suggestions?: string[];
};

const defaultGreeting = "Halo! Ada yang ingin kamu tanyakan tentang P3K?";
const defaultSuggestions = ["Cara pakai plester", "Perban?"];
const MAX_CHIPS = 2;
// Kegagalan yang berarti server asisten tidak bisa dijangkau (bukan sekadar pertanyaan ditolak)
const OFFLINE_MODES = new Set(["network_error", "connection_error", "backend_offline"]);
// Jarak dari dasar daftar pesan yang masih dianggap "sedang membaca pesan terbaru"
const STICK_TO_BOTTOM_PX = 80;
const INPUT_MAX_HEIGHT_PX = 120; // sekitar 4 baris (font 16px di mobile)

const headerBtn =
  "grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-full bg-white/25 font-black text-white hover:bg-white/35";

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${++idCounter}`;
// Riwayat chat disimpan di luar komponen supaya tidak hilang saat ChatWindow dipasang ulang
// (mis. layar dilebarkan/dikecilkan melewati batas panel kanan). Hilang saat halaman dimuat ulang.
type SavedChat = { messages: Message[]; chips: string[] };
let savedChat: SavedChat | null = null;

function ExpandIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" />
    </svg>
  );
}

export default function ChatWindow({
  full = false,
  onClose,
  backHref,
  expandHref,
  onToggleMaximize,
  maximized = false,
  topSlot,
  style,
  ref,
  onReply,
  onBusyChange,
  className = "",
  onAnimationEnd,
  greeting = defaultGreeting,
  suggestions = defaultSuggestions,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (savedChat) {
      // Stream yang terputus saat unmount jangan tampil sebagai "sedang mengetik" selamanya
      return savedChat.messages.map((m) =>
        m.status === "streaming" ? { ...m, status: "stopped" as const } : m,
      );
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content: greeting,
        createdAt: 0,
        status: "done",
        mode: "system_welcome",
      },
    ];
  });
  const [chips, setChips] = useState<string[]>(() => savedChat?.chips ?? suggestions);

  useEffect(() => {
    savedChat = { messages, chips };
  }, [messages, chips]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Status di header mengikuti hasil permintaan terakhir ke backend
  const [offline, setOffline] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stickToBottom = useRef(true);

  // Ikuti pesan terbaru hanya kalau pengguna memang sedang di bawah; kalau ia menggulir ke atas
  // untuk membaca jawaban sebelumnya, stream jawaban baru tidak menariknya kembali ke bawah.
  useEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTo({ top: list.scrollHeight });
  }, [messages]);

  // Kotak ketik tumbuh mengikuti isi sampai ±4 baris, lalu bisa digulir
  function fitInput() {
    const el = inputRef.current;
    // Sedang disembunyikan (display:none): scrollHeight terbaca 0, jangan diukur
    if (!el || el.clientWidth === 0) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT_PX)}px`;
  }

  // Ukur ulang setiap isi berubah
  useLayoutEffect(fitInput, [input]);

  // Ukur ulang saat lebar berubah: sheet dibuka, layar diputar, jendela di-resize
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return; // abaikan perubahan tinggi dari fitInput sendiri
      lastWidth = el.clientWidth;
      fitInput();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Halaman ditinggal: hentikan stream ke backend (dan Gemini)
  useEffect(() => () => abortRef.current?.abort(), []);

  function handleScroll() {
    const list = listRef.current;
    if (!list) return;
    stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < STICK_TO_BOTTOM_PX;
  }

  async function ask(text: string) {
    const q = text.trim().slice(0, MAX_INPUT_CHARS);
    if (!q || loading) return;

    const history = buildHistory(messages);
    const botId = newId("bot");
    const now = Date.now();
    stickToBottom.current = true; // pertanyaan baru: tampilkan dari bawah
    setMessages((m) => [
      ...m,
      { id: newId("me"), role: "user", content: q, createdAt: now, status: "done" },
      { id: botId, role: "assistant", content: "", createdAt: now, status: "streaming" },
    ]);
    setInput("");
    setLoading(true);
    onBusyChange?.(true);
    inputRef.current?.focus();

    const patchBot = (patch: (prev: Message) => Partial<Message>) =>
      setMessages((m) => m.map((msg) => (msg.id === botId ? { ...msg, ...patch(msg) } : msg)));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        { message: q, history, signal: controller.signal },
        {
          onMeta: (meta) => {
            patchBot(() => ({
              mode: meta.mode,
              sources: meta.sources,
              isEmergency: meta.is_emergency,
            }));
            if (meta.suggestions?.length) setChips(meta.suggestions.slice(0, MAX_CHIPS));
          },
          onDelta: (delta) => patchBot((prev) => ({ content: prev.content + delta })),
        },
      );
      setOffline(false);
      patchBot((prev) => ({
        status: "done",
        content: prev.content || "Hmm, aku belum punya jawabannya. Coba tanya dengan kata lain ya!",
      }));
      onReply?.();
    } catch (error) {
      if (controller.signal.aborted) {
        // Dihentikan lewat tombol stop: simpan yang sudah tertulis
        patchBot((prev) => ({
          status: "stopped",
          content: prev.content ? `${prev.content}\n\n*(dihentikan)*` : "*(dihentikan)*",
        }));
        return;
      }
      const mode = error instanceof ChatRequestError ? error.mode : "network_error";
      setOffline(OFFLINE_MODES.has(mode));
      patchBot(() => ({
        status: "error",
        mode,
        content:
          error instanceof ChatRequestError
            ? error.message
            : "Maaf, Dokter Piko lagi sibuk. Coba lagi ya!",
      }));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
      onBusyChange?.(false);
    }
  }

  const bubble = `rounded-xl px-3 py-[9px] font-semibold leading-[1.45] ${full ? "text-sm" : "text-[13px]"}`;

  return (
    <section
      aria-label="Tanya Dokter Piko"
      ref={ref}
      onAnimationEnd={onAnimationEnd}
      style={style}
      className={`relative flex origin-bottom-right flex-col overflow-hidden rounded-[20px] bg-surface shadow-float ${full ? "h-full w-[min(820px,100%)]" : ""
        } ${className}`}
    >
      {topSlot}
      <header className="flex items-center gap-2.5 bg-brand px-3.5 py-3 text-white">
        <PikoAvatar size={38} />
        <div className="min-w-0 flex-1">
          <strong className="block font-heading text-[15px] font-black">Tanya Dokter Piko</strong>
          <small className="flex items-center gap-[5px] text-[11px] font-bold opacity-95">
            <span
              className={`inline-block size-[7px] rounded-full ${offline ? "bg-white/60" : "bg-[#ffb300]"}`}
            />
            {loading ? "Sedang mengetik…" : offline ? "Sedang offline, coba lagi nanti" : "Online, siap membantu"}
          </small>
        </div>
        {onToggleMaximize ? (
          <button
            type="button"
            className={headerBtn}
            onClick={onToggleMaximize}
            aria-pressed={maximized}
            aria-label={maximized ? "Kembalikan ukuran chat" : "Perbesar chat ke ukuran maksimal"}
            title={maximized ? "Kembalikan ukuran" : "Perbesar"}
          >
            {maximized ? <RestoreIcon /> : <ExpandIcon />}
          </button>
        ) : expandHref && (
          <Link href={expandHref} className={headerBtn} aria-label="Buka halaman chat penuh" title="Buka layar penuh">
            <ExpandIcon />
          </Link>
        )}
        {backHref ? (
          <Link href={backHref} className={headerBtn} aria-label="Kembali ke pembelajaran">
            ←
          </Link>
        ) : (
          <button type="button" className={headerBtn} onClick={onClose} aria-label="Kecilkan chat" title="Kecilkan">
            <CloseIcon />
          </button>
        )}
      </header>

      <div
        ref={listRef}
        onScroll={handleScroll}
        aria-live="polite"
        className={`custom-scrollbar flex min-h-[72px] flex-1 flex-col gap-2 overflow-y-auto ${full ? "p-[18px]" : "p-3"
          }`}
      >
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className={`${bubble} max-w-[85%] self-end whitespace-pre-wrap bg-brand-soft text-brand`}>
              {m.content}
            </div>
          ) : (
            <div
              key={m.id}
              className={`${bubble} max-w-[94%] self-start ${m.status === "error" ? "bg-brand-soft text-brand" : "bg-sky-soft"
                }`}
            >
              {m.isEmergency && (
                <p role="alert" className="mb-1.5 rounded-lg bg-surface px-2 py-1.5 text-brand">
                  🚑 <strong>Darurat?</strong> Minta bantuan orang dewasa dan hubungi{" "}
                  <a href="tel:112" className="underline">112</a> /{" "}
                  <a href="tel:119" className="underline">119</a>.
                </p>
              )}
              {m.content ? (
                <Markdown
                  text={m.content}
                  streaming={m.status === "streaming"}
                  className="space-y-1.5 break-words"
                />
              ) : (
                <span className="animate-pulse">…</span>
              )}
            </div>
          ),
        )}

        {/* Saran ikut digulir bersama percakapan, jadi tidak menutupi jawaban di atasnya */}
        {!loading && chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5" aria-label="Saran pertanyaan">
            {chips.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                // Lebih kecil dari teks gelembung chat supaya saran tidak lebih menonjol dari jawaban
                className={`rounded-full border border-brand/70 px-2.5 py-[3px] text-left font-bold leading-[1.4] text-brand hover:bg-brand-soft ${
                  full ? "text-xs" : "text-[11px]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        className="flex items-end gap-2 border-t border-line px-3 py-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter mengirim; Shift+Enter membuat baris baru (dan jangan kirim saat memilih kata IME)
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              ask(input);
            }
          }}
          placeholder="Tulis pertanyaanmu..."
          aria-label="Pertanyaan"
          maxLength={MAX_INPUT_CHARS}
          className="custom-scrollbar min-w-0 flex-1 resize-none rounded-[19px] bg-line px-3.5 py-2.5 text-base font-semibold leading-[1.4] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-brand/30 min-[1101px]:text-[13px]" />
        {loading ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            aria-label="Hentikan jawaban"
            title="Hentikan"
            className="grid size-[38px] shrink-0 place-items-center rounded-full bg-brand text-white"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Kirim"
            disabled={!input.trim()}
            className="grid size-[38px] shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-60"
          >
            <SendIcon />
          </button>
        )}
      </form>
    </section>
  );
}

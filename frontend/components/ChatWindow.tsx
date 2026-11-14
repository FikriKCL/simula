"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type AnimationEventHandler } from "react";
import { CloseIcon, SendIcon } from "./Icons";
import { PikoAvatar } from "./PikoAvatar";
import Markdown from "./chat/Markdown";
import { ChatRequestError, buildHistory, streamChat } from "../lib/chat/stream";
import { MAX_INPUT_CHARS } from "../lib/chat/constants";
import type { Message } from "../lib/chat/types";

type Props = {
  /** Tampilan halaman penuh (tinggi 100%, pesan lebih besar). */
  full?: boolean;
  /** Tombol tutup (mode panel). */
  onClose?: () => void;
  /** Kalau diisi, tombol di header jadi link kembali (mode halaman). */
  backHref?: string;
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

const headerBtn =
  "grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-full bg-white/25 font-black text-white";

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${++idCounter}`;

export default function ChatWindow({
  full = false,
  onClose,
  backHref,
  className = "",
  onAnimationEnd,
  greeting = defaultGreeting,
  suggestions = defaultSuggestions,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      content: greeting,
      createdAt: 0,
      status: "done",
      mode: "system_welcome",
    },
  ]);
  const [chips, setChips] = useState<string[]>(suggestions);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Status di header mengikuti hasil permintaan terakhir ke backend
  const [offline, setOffline] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // Panel ditutup / halaman ditinggal: hentikan stream ke backend (dan Gemini)
  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(text: string) {
    const q = text.trim().slice(0, MAX_INPUT_CHARS);
    if (!q || loading) return;

    const history = buildHistory(messages);
    const botId = newId("bot");
    const now = Date.now();
    setMessages((m) => [
      ...m,
      { id: newId("me"), role: "user", content: q, createdAt: now, status: "done" },
      { id: botId, role: "assistant", content: "", createdAt: now, status: "streaming" },
    ]);
    setInput("");
    setLoading(true);

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
    } catch (error) {
      if (controller.signal.aborted) return;
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
    }
  }

  const bubble = `max-w-[82%] rounded-xl px-3 py-[9px] font-semibold leading-[1.4] ${
    full ? "text-sm" : "text-[13px]"
  }`;

  return (
    <section
      aria-label="Tanya Dokter Piko"
      onAnimationEnd={onAnimationEnd}
      className={`flex origin-bottom-right flex-col overflow-hidden rounded-[20px] bg-surface shadow-float ${
        full ? "h-full w-[min(820px,100%)]" : ""
      } ${className}`}
    >
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
        {backHref ? (
          <Link href={backHref} className={headerBtn} aria-label="Kembali ke pembelajaran">
            ←
          </Link>
        ) : (
          <button type="button" className={headerBtn} onClick={onClose} aria-label="Tutup chat">
            <CloseIcon />
          </button>
        )}
      </header>

      <div
        ref={listRef}
        aria-live="polite"
        className={`custom-scrollbar flex flex-col gap-2 overflow-y-auto ${
          full ? "min-h-0 flex-1 p-[18px]" : "max-h-[230px] p-3"
        }`}
      >
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className={`${bubble} self-end whitespace-pre-wrap bg-brand-soft text-brand`}>
              {m.content}
            </div>
          ) : (
            <div
              key={m.id}
              className={`${bubble} self-start ${
                m.status === "error" ? "bg-brand-soft text-brand" : "bg-sky-soft"
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
      </div>

      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {chips.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={loading}
            className="rounded-full border-[1.5px] border-brand px-3 py-[3px] text-left text-xs font-extrabold text-brand hover:bg-brand-soft disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2 border-t border-line px-3 py-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pertanyaanmu..."
          aria-label="Pertanyaan"
          maxLength={MAX_INPUT_CHARS}
          disabled={loading}
          className="min-w-0 flex-1 rounded-full bg-line px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Kirim"
          disabled={loading || !input.trim()}
          className="grid size-[38px] shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-60"
        >
          <SendIcon />
        </button>
      </form>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type AnimationEventHandler } from "react";
import { CloseIcon, SendIcon } from "./Icons";
import { PikoAvatar } from "./PikoAvatar";
import { streamChat, type Msg } from "../lib/chat";

type Props = {
  /** Tampilan halaman penuh (tinggi 100%, pesan lebih besar). */
  full?: boolean;
  /** Tombol tutup (mode panel). */
  onClose?: () => void;
  /** Kalau diisi, tombol di header jadi link kembali (mode halaman). */
  backHref?: string;
  className?: string;
  onAnimationEnd?: AnimationEventHandler<HTMLElement>;
  initialMessages?: Msg[];
  suggestions?: string[];
};

const defaultMessages: Msg[] = [
  { from: "bot", text: "Halo! Ada yang ingin kamu tanyakan tentang P3K?" },
];
const defaultSuggestions = ["Cara pakai plester", "Perban?"];

const headerBtn =
  "grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-full bg-white/25 font-black text-white";

export default function ChatWindow({
  full = false,
  onClose,
  backHref,
  className = "",
  onAnimationEnd,
  initialMessages = defaultMessages,
  suggestions = defaultSuggestions,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    const history = messages.slice(-10);
    setMessages((m) => [...m, { from: "me", text: q }, { from: "bot", text: "" }]);
    setInput("");
    setLoading(true);

    const patchBot = (updater: (prev: string) => string) =>
      setMessages((m) => {
        const copy = [...m];
        const last = copy.length - 1;
        copy[last] = { ...copy[last], text: updater(copy[last].text) };
        return copy;
      });

    try {
      await streamChat(q, history, (token) => patchBot((prev) => prev + token));
    } catch {
      patchBot(() => "Maaf, Dokter Piko lagi sibuk. Coba lagi ya!");
    } finally {
      setLoading(false);
    }
  }

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
            <span className="inline-block size-[7px] rounded-full bg-[#ffb300]" />
            Online, siap membantu
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
        className={`custom-scrollbar flex flex-col gap-2 overflow-y-auto ${
          full ? "min-h-0 flex-1 p-[18px]" : "max-h-[230px] p-3"
        }`}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[82%] rounded-xl px-3 py-[9px] font-semibold leading-[1.4] ${
              full ? "text-sm" : "text-[13px]"
            } ${m.from === "bot" ? "self-start bg-sky-soft" : "self-end bg-brand-soft text-brand"}`}
          >
            {m.text || "…"}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={loading}
            className="rounded-full border-[1.5px] border-brand px-3 py-[3px] text-xs font-extrabold text-brand hover:bg-brand-soft disabled:opacity-50"
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
          disabled={loading}
          className="min-w-0 flex-1 rounded-full bg-line px-3.5 py-2.5 text-[13px] font-semibold text-ink outline-none placeholder:text-muted disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Kirim"
          disabled={loading}
          className="grid size-[38px] shrink-0 place-items-center rounded-full bg-brand text-white disabled:opacity-60"
        >
          <SendIcon />
        </button>
      </form>
    </section>
  );
}
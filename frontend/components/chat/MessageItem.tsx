"use client";

import { useState } from "react";
import type { Message, Source } from "@/lib/chat/types";
import { MAX_INPUT_CHARS } from "@/lib/chat/constants";
import Markdown from "./Markdown";
import {
  IconAlert,
  IconBook,
  IconCheck,
  IconChevron,
  IconCopy,
  IconPencil,
  IconRefresh,
  SimulaLogo,
} from "./icons";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API is blocked on insecure origins (e.g. http://<LAN-IP>): fall back
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

// Best match first, one entry per module section
function uniqueSources(sources: Source[]) {
  const seen = new Set<string>();
  return [...sources]
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .filter((s) => {
      const key = `${s.doc_title || s.title}|${s.section_title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const MODE_BADGES: Record<string, { label: string; className: string }> = {
  rag_verified_module: {
    label: "Berdasarkan modul PMI",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  rag_filtered_out_of_scope: {
    label: "Di luar materi PMR",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300",
  },
  rag_no_match: {
    label: "Tidak ditemukan di modul",
    className: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
  },
};

function ActionButton({
  label,
  onClick,
  children,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {children}
    </button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <ActionButton
      label={copied ? "Tersalin" : "Salin"}
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }
      }}
    >
      {copied ? <IconCheck className="text-emerald-600" /> : <IconCopy />}
    </ActionButton>
  );
}

function UserMessage({
  message,
  busy,
  onEdit,
}: {
  message: Message;
  busy: boolean;
  onEdit: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setEditing(false);
    if (text !== message.content) onEdit(text);
  };

  if (editing) {
    return (
      <div className="ml-auto w-full max-w-[85%] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <textarea
          autoFocus
          value={draft}
          maxLength={MAX_INPUT_CHARS}
          rows={Math.min(8, Math.max(2, draft.split("\n").length))}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              setEditing(false);
            }
          }}
          aria-label="Ubah pertanyaan"
          className="w-full resize-none bg-transparent text-[15px] leading-7 focus:outline-none"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            Kirim ulang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-end">
      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-slate-100 px-4 py-2.5 text-[15px] leading-7 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
        {message.content}
      </div>
      <div className="mt-1 flex items-center gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
        <span className="mr-1 text-xs text-slate-400 dark:text-slate-500">{formatTime(message.createdAt)}</span>
        <CopyButton text={message.content} />
        <ActionButton
          label="Ubah pertanyaan"
          disabled={busy}
          onClick={() => {
            setDraft(message.content);
            setEditing(true);
          }}
        >
          <IconPencil />
        </ActionButton>
      </div>
    </div>
  );
}

function Sources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  const list = uniqueSources(sources);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <IconBook className="h-3.5 w-3.5" />
        {list.length} rujukan modul
        <IconChevron className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5">
          {list.map((src, k) => (
            <li
              key={k}
              className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[13px] dark:border-slate-800 dark:bg-slate-900/60"
            >
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-red-100 text-[11px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                {k + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800 dark:text-slate-200">
                  {src.doc_title || src.title || "Modul PMI"}
                </span>
                {src.section_title && (
                  <span className="block text-slate-500 dark:text-slate-400">{src.section_title}</span>
                )}
              </span>
              {src.similarity !== undefined && (
                <span
                  className="shrink-0 font-mono text-[11px] text-slate-400"
                  title="Tingkat kecocokan dengan pertanyaan"
                >
                  {Math.round(src.similarity * 100)}%
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AssistantMessage({
  message,
  isLast,
  busy,
  onRegenerate,
  onSuggestion,
}: {
  message: Message;
  isLast: boolean;
  busy: boolean;
  onRegenerate: () => void;
  onSuggestion: (text: string) => void;
}) {
  const streaming = message.status === "streaming";
  const badge = message.mode ? MODE_BADGES[message.mode] : undefined;

  return (
    <div className="flex gap-3 sm:gap-4">
      <SimulaLogo className="mt-0.5 h-8 w-8 text-sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">SIMULA</span>
          {badge && !streaming && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>

        {message.isEmergency && (
          <div
            role="alert"
            className="mb-3 flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
          >
            <span aria-hidden="true">🚑</span>
            <p>
              <strong>Keadaan darurat?</strong> Utamakan keselamatan dan minta bantuan orang dewasa. Hubungi{" "}
              <a href="tel:112" className="font-bold underline">112</a> (darurat),{" "}
              <a href="tel:119" className="font-bold underline">119</a> (ambulans), atau{" "}
              <a href="tel:113" className="font-bold underline">113</a> (pemadam kebakaran).
            </p>
          </div>
        )}

        {message.status === "error" ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm leading-6 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <IconAlert className="mt-1 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{message.content}</p>
              {isLast && (
              <button
                type="button"
                onClick={onRegenerate}
                disabled={busy}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50 dark:bg-slate-900 dark:text-red-300 dark:ring-red-900"
              >
                <IconRefresh className="h-3.5 w-3.5" /> Coba lagi
              </button>
              )}
            </div>
          </div>
        ) : message.content ? (
          <Markdown text={message.content} streaming={streaming} />
        ) : streaming ? (
          <div className="flex items-center gap-2 py-2 text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-500"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            Mencari di modul PMI…
          </div>
        ) : null}

        {message.status === "stopped" && (
          <p className="mt-2 text-xs italic text-slate-400 dark:text-slate-500">Jawaban dihentikan.</p>
        )}

        {!streaming && message.sources && message.sources.length > 0 && <Sources sources={message.sources} />}

        {!streaming && (
          <div className="mt-2 flex items-center gap-0.5">
            {message.content && message.status !== "error" && <CopyButton text={message.content} />}
            {isLast && message.status !== "error" && (
              <ActionButton label="Buat ulang jawaban" onClick={onRegenerate} disabled={busy}>
                <IconRefresh />
              </ActionButton>
            )}
            <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">{formatTime(message.createdAt)}</span>
          </div>
        )}

        {isLast && !streaming && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-4 flex flex-col items-start gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pertanyaan lanjutan</span>
            {message.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion(s)}
                disabled={busy}
                className="max-w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:hover:text-red-200"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MessageItem(props: {
  message: Message;
  isLast: boolean;
  busy: boolean;
  onEdit: (text: string) => void;
  onRegenerate: () => void;
  onSuggestion: (text: string) => void;
}) {
  const { message } = props;
  return message.role === "user" ? (
    <UserMessage message={message} busy={props.busy} onEdit={props.onEdit} />
  ) : (
    <AssistantMessage
      message={message}
      isLast={props.isLast}
      busy={props.busy}
      onRegenerate={props.onRegenerate}
      onSuggestion={props.onSuggestion}
    />
  );
}

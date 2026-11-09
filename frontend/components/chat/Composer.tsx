"use client";

import { useEffect, type RefObject } from "react";
import { MAX_INPUT_CHARS } from "@/lib/chat/constants";
import { IconArrowUp, IconStop } from "./icons";

export default function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  // Auto-grow the textarea up to ~8 lines
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value, inputRef]);

  const nearLimit = value.length > MAX_INPUT_CHARS * 0.8;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) onStop();
        else onSubmit();
      }}
      className="rounded-3xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-900/5 transition focus-within:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20 dark:focus-within:border-slate-600"
    >
      <textarea
        ref={inputRef}
        rows={1}
        value={value}
        maxLength={MAX_INPUT_CHARS}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!busy) onSubmit();
          } else if (e.key === "Escape" && busy) {
            onStop();
          }
        }}
        aria-label="Tulis pertanyaan"
        placeholder="Tanyakan materi kepalangmerahan…"
        className="block max-h-[220px] w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-6 text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
      />
      <div className="flex items-center justify-between gap-2 pl-3">
        <span
          className={`text-xs ${
            value.length >= MAX_INPUT_CHARS ? "font-semibold text-red-600" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {nearLimit ? `${value.length}/${MAX_INPUT_CHARS}` : busy ? "Tekan Esc untuk berhenti" : ""}
        </span>
        {busy ? (
          <button
            type="submit"
            title="Hentikan jawaban"
            aria-label="Hentikan jawaban"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <IconStop className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            title="Kirim (Enter)"
            aria-label="Kirim pertanyaan"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
          >
            <IconArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}

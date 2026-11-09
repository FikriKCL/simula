"use client";

import { useState } from "react";
import type { Conversation } from "@/lib/chat/types";
import { useTheme, type Theme } from "./useTheme";
import {
  IconClose,
  IconMessage,
  IconMonitor,
  IconMoon,
  IconPanel,
  IconPencil,
  IconPlus,
  IconSun,
  IconTrash,
  SimulaLogo,
} from "./icons";

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof IconSun }[] = [
  { value: "light", label: "Terang", Icon: IconSun },
  { value: "dark", label: "Gelap", Icon: IconMoon },
  { value: "system", label: "Sistem", Icon: IconMonitor },
];

function ConversationItem({
  conversation,
  active,
  streaming,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: Conversation;
  active: boolean;
  streaming: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);

  const commit = () => {
    setEditing(false);
    const title = draft.trim();
    if (title && title !== conversation.title) onRename(title);
  };

  if (editing) {
    return (
      <li className="px-1">
        <input
          autoFocus
          value={draft}
          maxLength={80}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setEditing(false);
          }}
          aria-label="Nama percakapan"
          className="w-full rounded-lg border border-red-300 bg-white px-2.5 py-2 text-sm outline-none ring-2 ring-red-500/15 dark:border-red-800 dark:bg-slate-950"
        />
      </li>
    );
  }

  return (
    <li
      className={`group relative flex items-center rounded-lg transition ${
        active
          ? "bg-slate-200/70 text-slate-900 dark:bg-slate-800 dark:text-white"
          : "text-slate-700 hover:bg-slate-200/50 dark:text-slate-300 dark:hover:bg-slate-800/60"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-left text-sm"
      >
        {streaming ? (
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" aria-label="Sedang menjawab" />
        ) : (
          <IconMessage className="h-3.5 w-3.5 shrink-0 opacity-50" />
        )}
        <span className="truncate">{conversation.title}</span>
      </button>
      <div
        className={`flex shrink-0 items-center pr-1 ${
          active ? "flex" : "flex lg:hidden lg:group-hover:flex lg:group-focus-within:flex"
        }`}
      >
        <button
          type="button"
          title="Ganti nama"
          aria-label={`Ganti nama percakapan ${conversation.title}`}
          onClick={() => {
            setDraft(conversation.title);
            setEditing(true);
          }}
          className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <IconPencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Hapus"
          aria-label={`Hapus percakapan ${conversation.title}`}
          onClick={onDelete}
          className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-red-600 dark:hover:bg-slate-700 dark:hover:text-red-400"
        >
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

export default function Sidebar({
  conversations,
  activeId,
  streamingConvId,
  mobileOpen,
  collapsed,
  onCloseMobile,
  onCollapse,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  streamingConvId: string | null;
  mobileOpen: boolean;
  collapsed: boolean;
  onCloseMobile: () => void;
  onCollapse: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      <div
        onClick={onCloseMobile}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-label="Daftar percakapan"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-slate-50 transition-[transform,visibility] duration-200 lg:static lg:z-auto lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full lg:visible"
        } ${collapsed ? "lg:hidden" : ""}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-3">
          <div className="flex items-center gap-2.5 pl-1">
            <SimulaLogo />
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900 dark:text-white">SIMULA</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Asisten Belajar PMR</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 lg:hidden dark:hover:bg-slate-800"
          >
            <IconClose />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            title="Sembunyikan sidebar"
            aria-label="Sembunyikan sidebar"
            className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 lg:block dark:hover:bg-slate-800"
          >
            <IconPanel />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-xs transition hover:border-red-200 hover:text-red-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-red-900 dark:hover:text-red-300"
          >
            <IconPlus />
            Percakapan baru
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 custom-scrollbar">
          {conversations.length > 0 ? (
            <>
              <p className="px-2.5 pb-1.5 pt-3 text-xs font-medium text-slate-500 dark:text-slate-400">Riwayat</p>
              <ul className="space-y-0.5">
                {conversations.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    active={c.id === activeId}
                    streaming={c.id === streamingConvId}
                    onSelect={() => onSelect(c.id)}
                    onRename={(title) => onRename(c.id, title)}
                    onDelete={() => onDelete(c.id)}
                  />
                ))}
              </ul>
            </>
          ) : (
            <p className="px-3 pt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Belum ada percakapan. Mulai dengan mengetik pertanyaan.
            </p>
          )}
        </nav>

        <div className="shrink-0 space-y-3 border-t border-slate-200 p-3 dark:border-slate-800">
          <div
            role="radiogroup"
            aria-label="Tema tampilan"
            className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800/70"
          >
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                onClick={() => setTheme(value)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
                  theme === value
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          <p className="px-1 text-[11px] leading-4 text-slate-400 dark:text-slate-500">
            Riwayat hanya tersimpan selama halaman ini terbuka.
          </p>
        </div>
      </aside>
    </>
  );
}

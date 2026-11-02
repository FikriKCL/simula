"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ERROR_MODES, MAX_INPUT_CHARS } from "@/lib/chat/constants";
import { ChatRequestError, buildHistory, streamChat } from "@/lib/chat/stream";
import type { Conversation, Message } from "@/lib/chat/types";
import Composer from "./Composer";
import EmptyState from "./EmptyState";
import MessageItem from "./MessageItem";
import Sidebar from "./Sidebar";
import { IconArrowDown, IconMenu, IconPanel, IconPlus } from "./icons";

const EMPTY: Message[] = [];

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

const makeTitle = (text: string) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 48 ? `${flat.slice(0, 48).trimEnd()}…` : flat;
};

const pendingReply = (): Message => ({
  id: newId("a"),
  role: "assistant",
  content: "",
  createdAt: Date.now(),
  status: "streaming",
});

// Only focus the input on devices with a real pointer: on phones it pops the keyboard open
const focusInput = (el: HTMLTextAreaElement | null) => {
  if (el && window.matchMedia("(pointer: fine)").matches) el.focus();
};

export default function ChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<{ convId: string; msgId: string } | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showJump, setShowJump] = useState(false);

  const conversationsRef = useRef(conversations);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Follow new content only while the user is already at the bottom
  const stickRef = useRef(true);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? EMPTY;
  const busy = streaming !== null;

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const patchMessage = useCallback(
    (convId: string, msgId: string, patch: (m: Message) => Partial<Message>) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch(m) } : m)) }
        )
      );
    },
    []
  );

  const followBottom = () => {
    stickRef.current = true;
    setShowJump(false);
  };

  // Streams the reply for `question` into the (already inserted) assistant message `msgId`
  const complete = async (
    convId: string,
    msgId: string,
    question: string,
    history: ReturnType<typeof buildHistory>
  ) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming({ convId, msgId });

    try {
      await streamChat(
        { message: question, history, signal: controller.signal },
        {
          onMeta: (meta) =>
            patchMessage(convId, msgId, (m) => ({
              mode: meta.mode ?? m.mode,
              sources: meta.sources ?? m.sources,
              suggestions: meta.suggestions ?? m.suggestions,
              isEmergency: meta.is_emergency ?? m.isEmergency,
            })),
          onDelta: (text) => patchMessage(convId, msgId, (m) => ({ content: m.content + text })),
        }
      );
      patchMessage(convId, msgId, (m) =>
        !m.content.trim()
          ? {
              status: "error",
              mode: "empty_reply",
              content: "Asisten tidak memberikan jawaban. Coba kirim ulang pertanyaanmu.",
            }
          : { status: ERROR_MODES.has(m.mode ?? "") ? "error" : "done" }
      );
    } catch (error) {
      if (controller.signal.aborted) {
        patchMessage(convId, msgId, () => ({ status: "stopped" }));
      } else {
        const known = error instanceof ChatRequestError;
        patchMessage(convId, msgId, () => ({
          status: "error",
          mode: known ? error.mode : "network_error",
          content: known ? error.message : "Terjadi kesalahan saat memuat jawaban. Coba lagi.",
          sources: [],
          suggestions: [],
        }));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(null);
      focusInput(inputRef.current);
    }
  };

  const send = (raw: string) => {
    const text = raw.trim().slice(0, MAX_INPUT_CHARS);
    if (!text || busy) return;

    const existing = conversationsRef.current.find((c) => c.id === activeId);
    const convId = existing?.id ?? newId("c");
    const now = Date.now();
    const userMsg: Message = { id: newId("u"), role: "user", content: text, createdAt: now, status: "done" };
    const reply = pendingReply();
    const history = buildHistory(existing?.messages ?? []);

    setConversations((prev) =>
      existing
        ? prev.map((c) =>
            c.id === convId ? { ...c, messages: [...c.messages, userMsg, reply], updatedAt: now } : c
          )
        : [{ id: convId, title: makeTitle(text), messages: [userMsg, reply], createdAt: now, updatedAt: now }, ...prev]
    );
    setActiveId(convId);
    setInput("");
    followBottom();
    void complete(convId, reply.id, text, history);
  };

  // Replaces everything from `fromIndex` on with `userText` (if given) and a fresh reply
  const rerun = (fromIndex: number, question: string, editedUser?: Message) => {
    if (!active || busy) return;
    const convId = active.id;
    const kept = active.messages.slice(0, fromIndex);
    const reply = pendingReply();
    const history = buildHistory(editedUser ? kept : kept.slice(0, -1));
    const next = editedUser ? [...kept, editedUser, reply] : [...kept, reply];

    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, messages: next, updatedAt: Date.now() } : c))
    );
    followBottom();
    void complete(convId, reply.id, question, history);
  };

  const regenerate = (msgId: string) => {
    if (!active) return;
    const index = active.messages.findIndex((m) => m.id === msgId);
    const question = active.messages[index - 1];
    if (index < 1 || question.role !== "user") return;
    rerun(index, question.content);
  };

  const editMessage = (msgId: string, text: string) => {
    if (!active) return;
    const index = active.messages.findIndex((m) => m.id === msgId);
    if (index < 0) return;
    const edited: Message = { ...active.messages[index], content: text.slice(0, MAX_INPUT_CHARS), createdAt: Date.now() };
    rerun(index, edited.content, edited);
  };

  const stop = () => abortRef.current?.abort();

  const openConversation = (id: string | null) => {
    setActiveId(id);
    setMobileSidebar(false);
    followBottom();
    requestAnimationFrame(() => focusInput(inputRef.current));
  };

  const newChat = () => {
    setInput("");
    openConversation(null);
  };

  const deleteConversation = (id: string) => {
    const target = conversationsRef.current.find((c) => c.id === id);
    if (!target || !window.confirm(`Hapus percakapan "${target.title}"?`)) return;
    if (streaming?.convId === id) stop();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const renameConversation = (id: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const newChatRef = useRef(newChat);
  const mobileSidebarRef = useRef(mobileSidebar);
  useEffect(() => {
    newChatRef.current = newChat;
    mobileSidebarRef.current = mobileSidebar;
  });

  // Global shortcuts: Ctrl/Cmd+Shift+O new chat, Esc closes the mobile drawer or stops the answer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        newChatRef.current();
      } else if (e.key === "Escape") {
        if (mobileSidebarRef.current) setMobileSidebar(false);
        else abortRef.current?.abort();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
    stickRef.current = atBottom;
    setShowJump(!atBottom);
  };

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    followBottom();
    el.scrollTo({ top: el.scrollHeight });
  };

  const lastIndex = messages.length - 1;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        conversations={sortedConversations}
        activeId={activeId}
        streamingConvId={streaming?.convId ?? null}
        mobileOpen={mobileSidebar}
        collapsed={sidebarCollapsed}
        onCloseMobile={() => setMobileSidebar(false)}
        onCollapse={() => setSidebarCollapsed(true)}
        onNewChat={newChat}
        onSelect={openConversation}
        onRename={renameConversation}
        onDelete={deleteConversation}
      />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 border-b border-slate-100 px-2 sm:px-3 dark:border-slate-800/70">
          <button
            type="button"
            onClick={() => setMobileSidebar(true)}
            aria-label="Buka menu percakapan"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          {sidebarCollapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              title="Tampilkan sidebar"
              aria-label="Tampilkan sidebar"
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:block dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <IconPanel className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {active?.title ?? "Percakapan baru"}
            </p>
          </div>
          <button
            type="button"
            onClick={newChat}
            title="Percakapan baru (Ctrl+Shift+O)"
            aria-label="Percakapan baru"
            className={`rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${
              sidebarCollapsed ? "" : "lg:hidden"
            }`}
          >
            <IconPlus className="h-5 w-5" />
          </button>
        </header>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          aria-label="Percakapan"
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
        >
          {messages.length === 0 ? (
            <EmptyState onPick={send} disabled={busy} />
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-8 px-4 pb-10 pt-6 sm:px-6">
              {messages.map((m, i) => (
                <MessageItem
                  key={m.id}
                  message={m}
                  isLast={i === lastIndex}
                  busy={busy}
                  onEdit={(text) => editMessage(m.id, text)}
                  onRegenerate={() => regenerate(m.id)}
                  onSuggestion={send}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative shrink-0 px-3 pb-3 sm:px-6">
          {showJump && messages.length > 0 && (
            <button
              type="button"
              onClick={jumpToBottom}
              aria-label="Gulir ke pesan terbaru"
              className="absolute -top-12 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <IconArrowDown />
            </button>
          )}
          <div className="mx-auto w-full max-w-3xl">
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => send(input)}
              onStop={stop}
              busy={busy}
              inputRef={inputRef}
            />
            <p className="mt-2 text-center text-[11px] leading-4 text-slate-400 dark:text-slate-500">
              SIMULA bisa keliru. Cek kembali ke modul dan pembina PMR. Darurat? Hubungi 112.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

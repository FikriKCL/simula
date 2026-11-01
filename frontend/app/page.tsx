"use client";

import { useState, useRef, useEffect } from "react";

interface Source {
  doc_title?: string;
  section_title?: string;
  similarity?: number;
  title?: string;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  sources?: Source[];
  suggestions?: string[];
  is_emergency?: boolean;
  mode?: string;
  time: string;
}

const CATEGORIES = [
  {
    icon: "🚨",
    title: "Pertolongan Pertama",
    desc: "Luka, Pendarahan, Patah Tulang, Pingsan",
    prompt: "Bagaimana langkah pertolongan pertama pada luka bakar melepuh?",
    badge: "Buku PP Mula & Wira",
  },
  {
    icon: "🌋",
    title: "Kesiapsiagaan Bencana",
    desc: "Gempa Bumi, Banjir, Tsunami, Evakuasi",
    prompt: "Apa yang harus dilakukan saat terjadi gempa bumi di dalam gedung?",
    badge: "Ayo Siaga Mula",
  },
  {
    icon: "🌐",
    title: "Gerakan Palang Merah",
    desc: "Sejarah, 7 Prinsip Dasar, Lambang PMI",
    prompt: "Sebutkan dan jelaskan 7 Prinsip Dasar Gerakan Palang Merah!",
    badge: "Modul Gerakan",
  },
  {
    icon: "🩸",
    title: "Donor Darah Sukarela",
    desc: "Syarat, Manfaat, dan Golongan Darah",
    prompt: "Apa saja syarat-syarat untuk menjadi pendonor darah sukarela?",
    badge: "Modul DDS",
  },
  {
    icon: "🩺",
    title: "Kesehatan Remaja Sebaya",
    desc: "Tumbuh Kembang, Gizi, Potensi Diri",
    prompt: "Bagaimana peran PMR dalam pendidikan kesehatan remaja sebaya?",
    badge: "Modul PRS",
  },
  {
    icon: "🛡️",
    title: "Uji Guardrail (Luar Topik)",
    desc: "Cek filter penolakan halusinasi AI",
    prompt: "Bagaimana resep membuat kue martabak manis dan cara coding Python?",
    badge: "Uji Keamanan",
  },
];

const MAX_INPUT_CHARS = 2000; // matches ChatInput.message max_length in the backend
const STORAGE_KEY = "simula-chat-history-v1";
const MAX_STORED_MESSAGES = 60;

// Replies that are errors or UI notices, not real answers: never sent back as context
const NON_CONTEXT_MODES = new Set([
  "system_welcome",
  "streaming",
  "stopped",
  "network_error",
  "backend_offline",
  "connection_error",
  "rate_limited",
  "invalid_input",
  "rag_error",
  "rag_unavailable",
]);

const DEFAULT_SUGGESTIONS = [
  "Bagaimana langkah pertolongan pertama pada luka bakar melepuh?",
  "Sebutkan dan jelaskan 7 Prinsip Dasar Gerakan Palang Merah!",
  "Apa saja barang penting di dalam Tas Siaga Bencana?",
];

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Rich inline parser for **bold**, `code`, *italic*, and [links](https://...)
const INLINE_PATTERN =
  /(\*\*[^*]+?\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*[^*\s](?:[^*]*[^*\s])?\*)/g;

function renderInline(text: string) {
  const tokens = text.split(INLINE_PATTERN);
  return tokens.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-red-700 underline underline-offset-2 hover:text-red-800 dark:text-red-300"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("*") && !part.startsWith("**") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={index} className="italic text-slate-600 dark:text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong
          key={index}
          className="font-semibold text-slate-900 dark:text-white"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-red-700 dark:bg-slate-800 dark:text-red-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Rich formatter for bot responses (Markdown formatting including tables, blockquotes, nested lists)
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-1" />);
      i++;
      continue;
    }

    // Markdown Table block detection
    if (
      trimmed.startsWith("|") &&
      trimmed.endsWith("|") &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith("|")
    ) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const rows = tableLines
        .filter((row) => !/^\|[\s\-:|]+\|$/.test(row))
        .map((row) =>
          row
            .slice(1, -1)
            .split("|")
            .map((cell) => cell.trim())
        );

      if (rows.length > 0) {
        const header = rows[0];
        const body = rows.slice(1);
        elements.push(
          <div
            key={`tbl-${i}`}
            className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"
          >
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                <tr>
                  {header.map((col, cIdx) => (
                    <th
                      key={cIdx}
                      className="border-b border-slate-200 px-3 py-2 font-bold dark:border-slate-700"
                    >
                      {renderInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {body.map((r, rIdx) => (
                  <tr
                    key={rIdx}
                    className="bg-white/60 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-800/40"
                  >
                    {r.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 align-top">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Horizontal separator line (e.g. ---)
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push(
        <hr
          key={`hr-${i}`}
          className="my-3 border-t border-slate-200/80 dark:border-slate-800"
        />
      );
      i++;
      continue;
    }

    // Warning / Caution highlight
    if (
      trimmed.toLowerCase().startsWith("jangan sekali-kali") ||
      trimmed.toLowerCase().startsWith("perhatian:") ||
      trimmed.toLowerCase().startsWith("peringatan:") ||
      trimmed.toLowerCase().startsWith("penting:")
    ) {
      elements.push(
        <div
          key={`warn-${i}`}
          className="my-2 rounded-xl border-l-4 border-amber-500 bg-amber-50/90 p-3 text-xs leading-relaxed text-amber-950 shadow-xs dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-sm">⚠️</span>
            <span>{renderInline(trimmed)}</span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="my-2 space-y-1 border-l-3 border-red-400 bg-slate-50/80 py-1.5 pl-3 pr-2 italic text-slate-700 rounded-r-lg dark:border-red-500 dark:bg-slate-800/40 dark:text-slate-300"
        >
          {quoteLines.filter(Boolean).map((ql, qIdx) => (
            <p key={qIdx}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="mt-3 text-sm font-bold tracking-tight text-red-700 dark:text-red-400"
        >
          {renderInline(trimmed.replace("### ", ""))}
        </h4>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="mt-4 text-base font-bold tracking-tight text-slate-900 dark:text-white"
        >
          {renderInline(trimmed.replace("## ", ""))}
        </h3>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="mt-4 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white"
        >
          {renderInline(trimmed.replace("# ", ""))}
        </h2>
      );
      i++;
      continue;
    }

    // Bullet points (* or -), supporting nested indentation
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const indentSpaces = rawLine.search(/\S|$/);
      const isNested = indentSpaces >= 2;
      const content = trimmed.substring(2);
      elements.push(
        <div
          key={`ul-${i}`}
          className={`flex items-start gap-2.5 ${isNested ? "pl-6" : "pl-1"}`}
        >
          <span
            className={`mt-2 shrink-0 rounded-full ${
              isNested
                ? "h-1.5 w-1.5 border border-red-500 bg-transparent"
                : "h-1.5 w-1.5 bg-red-500 ring-2 ring-red-500/20"
            }`}
          />
          <span className="flex-1 leading-relaxed">{renderInline(content)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`ol-${i}`} className="flex items-start gap-2.5 pl-1">
          <span className="shrink-0 font-bold font-mono text-red-600 dark:text-red-400">
            {numMatch[1]}.
          </span>
          <span className="flex-1 leading-relaxed">
            {renderInline(numMatch[2])}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-slate-800 break-words dark:text-slate-200">
      {elements}
    </div>
  );
}

export default function ChatbotPage() {
  const counterRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [restored, setRestored] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-welcome",
      sender: "bot",
      text: "Halo! Saya **Asisten Virtual Resmi SIMULA (Palang Merah Remaja & PMI)**.\n\nSaya didukung sistem **Hybrid RAG Berpagar Ketat** yang membaca langsung **18 modul kurikulum resmi PMI**:\n- **Pertolongan Pertama (Tingkat Mula & Wira)**\n- **Kesiapsiagaan Bencana (Ayo Siaga Bencana Mula, Madya & Wira)**\n- **Gerakan Palang Merah & 7 Prinsip Dasar PMI**\n- **Donor Darah Sukarela (DDS)**\n- **Kepemimpinan & Dinamika Kelompok PMR**\n- **Pendidikan Remaja Sebaya & Kesehatan Lingkungan (WASH)**\n\nSilakan klik salah satu contoh pertanyaan di sidebar atau ketik pertanyaan Anda sendiri di bawah!",
      sources: [],
      suggestions: DEFAULT_SUGGESTIONS,
      mode: "system_welcome",
      time: "08:00",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasNewUnseen, setHasNewUnseen] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);

  // Restore the conversation saved in this browser (survives page refresh)
  useEffect(() => {
    // Ids must stay unique across reloads because restored messages keep their old ids
    counterRef.current = Date.now();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved) && saved.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage after hydration
        setMessages(saved.filter((m: Message) => m.mode !== "streaming"));
      }
    } catch {
      // Storage unavailable or corrupted: start with the welcome message
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored || loading) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
    } catch {
      // Ignore quota / private-mode errors
    }
  }, [messages, restored, loading]);

  // Auto-grow the textarea up to ~6 lines
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const generateId = (prefix: string) => {
    counterRef.current += 1;
    return `${prefix}-${counterRef.current.toString(36)}`;
  };

  const stopGenerating = () => {
    abortRef.current?.abort();
  };

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceToBottom < 100) {
      setHasNewUnseen(false);
    }
  };

  const scrollToTop = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const scrollByPage = (delta: number) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollBy({
        top: delta,
        behavior: "smooth",
      });
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
      setHasNewUnseen(false);
    }
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el && chatContainerRef.current) {
      const containerRect = chatContainerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const targetScroll =
        elRect.top - containerRect.top + chatContainerRef.current.scrollTop - 20;

      chatContainerRef.current.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "auto",
      });
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API is blocked on insecure origins (e.g. http://<LAN-IP>)
    }
  };

  const updateBotMsg = (botMsgId: string, patch: (m: Message) => Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === botMsgId ? { ...m, ...patch(m) } : m))
    );
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim().slice(0, MAX_INPUT_CHARS);
    if (!textToSend || loading) return;

    const userMsgId = generateId("user");
    const botMsgId = generateId("bot");
    setStreamingMsgId(botMsgId);

    const userMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      time: nowTime(),
    };

    const initialBotMsg: Message = {
      id: botMsgId,
      sender: "bot",
      text: "",
      sources: [],
      suggestions: [],
      is_emergency: false,
      mode: "streaming",
      time: nowTime(),
    };

    // Only real Q&A turns are useful context; drop errors, notices and their questions' failed replies
    const recentHistory = messages
      .filter((m) => !NON_CONTEXT_MODES.has(m.mode ?? "") && m.text)
      .slice(-6)
      .map((m) => ({
        sender: m.sender,
        text: m.text.slice(0, 4000),
      }));

    setMessages((prev) => [...prev, userMsg, initialBotMsg]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    setTimeout(() => {
      scrollToBottom(true);
    }, 50);

    const handleEvent = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) return;

      let payload;
      try {
        payload = JSON.parse(jsonStr);
      } catch {
        return; // Ignore malformed events
      }

      if (payload.type === "meta") {
        updateBotMsg(botMsgId, () => ({
          mode: payload.mode || "rag_verified_module",
          sources: payload.sources || [],
          suggestions: payload.suggestions || [],
          is_emergency: Boolean(payload.is_emergency),
        }));
      } else if (payload.type === "delta" && payload.text) {
        updateBotMsg(botMsgId, (m) => ({ text: m.text + payload.text }));

        if (chatContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
          if (scrollHeight - scrollTop - clientHeight < 280) {
            chatContainerRef.current.scrollTo({ top: scrollHeight, behavior: "auto" });
          }
        }
      }
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: recentHistory,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        updateBotMsg(botMsgId, () => ({
          text:
            errData.reply ||
            `Gagal menghubungi server backend (Status ${res.status}). Pastikan backend FastAPI sedang berjalan.`,
          mode: errData.mode || "network_error",
        }));
        return;
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";
          lines.forEach(handleEvent);
        }
        // Flush whatever is left if the stream did not end with a newline
        buffer += decoder.decode();
        if (buffer) handleEvent(buffer);
      } else {
        const data = await res.json();
        updateBotMsg(botMsgId, () => ({
          text: data.reply || "Tidak ada respons dari sistem.",
          sources: data.sources || [],
          suggestions: data.suggestions || [],
          is_emergency: Boolean(data.is_emergency),
          mode: data.mode || "unknown",
        }));
      }

      setTimeout(() => {
        scrollToMessage(userMsgId);
        setHasNewUnseen(true);
      }, 50);
    } catch {
      if (controller.signal.aborted) {
        updateBotMsg(botMsgId, (m) => ({
          text: m.text
            ? `${m.text}\n\n*(Jawaban dihentikan oleh pengguna)*`
            : "Jawaban dihentikan sebelum selesai.",
          mode: "stopped",
        }));
      } else {
        updateBotMsg(botMsgId, () => ({
          text: "Gagal tersambung ke backend API di port 8000. Pastikan terminal backend FastAPI (`uvicorn app.main:app --port 8000`) sudah berjalan.",
          sources: [],
          mode: "network_error",
        }));
        setTimeout(() => {
          scrollToMessage(userMsgId);
        }, 50);
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
      setStreamingMsgId(null);
      inputRef.current?.focus();
    }
  };

  const resetChat = () => {
    abortRef.current?.abort();
    setMessages([
      {
        id: generateId("reset"),
        sender: "bot",
        text: "Percakapan telah direset. Silakan tanyakan apa saja seputar materi kepalangmerahan PMR/PMI!",
        sources: [],
        suggestions: DEFAULT_SUGGESTIONS,
        mode: "system_welcome",
        time: nowTime(),
      },
    ]);
    setTimeout(() => {
      scrollToBottom(false);
    }, 50);
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* SIDEBAR PANEL */}
      <aside className="hidden w-96 min-h-0 shrink-0 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-md lg:flex dark:border-slate-800/80 dark:bg-slate-900/90">
        {/* Brand Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-lg shadow-red-500/25">
              <span className="text-xl font-black">✚</span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  SIMULA AI
                </h1>
                <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                  PMR PMI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Asisten Pembelajaran Kepalangmerahan
              </p>
            </div>
          </div>
        </div>

        {/* System Intelligence Badge */}
        <div className="shrink-0 p-4">
          <div className="rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50/80 via-white to-rose-50/50 p-4 shadow-sm dark:border-red-900/40 dark:from-red-950/20 dark:via-slate-900/50 dark:to-slate-900">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                <span className="inline-block h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                Hybrid RAG Engine
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                18 Modul PMI
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Menjawab <strong>hanya dari 18 modul resmi</strong> PMI dengan BM25 + Vector Search, memori percakapan hemat token, & guardrail anti-halusinasi.
            </p>
          </div>
        </div>

        {/* Quick Question Cards */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overflow-x-hidden px-4 pb-4">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Uji Coba Cepat
            </span>
            <span className="text-[10px] text-slate-400">Klik untuk kirim</span>
          </div>
          <div className="space-y-2.5">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(cat.prompt)}
                disabled={loading}
                className="group relative flex w-full flex-col items-start rounded-xl border border-slate-200/70 bg-white p-3 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md hover:shadow-red-500/5 active:translate-y-0 disabled:pointer-events-none dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-red-900"
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {cat.title}
                    </span>
                  </div>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {cat.badge}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 group-hover:text-red-700 dark:text-slate-400 dark:group-hover:text-red-300">
                  &ldquo;{cat.prompt}&rdquo;
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Reset / Footer */}
        <div className="shrink-0 border-t border-slate-200/80 p-4 dark:border-slate-800/80">
          <button
            onClick={resetChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          >
            <span>🔄</span> Bersihkan Percakapan
          </button>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden bg-slate-100/50 dark:bg-slate-950 relative">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white font-bold lg:hidden">
              ✚
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Playground Edukasi Kepalangmerahan
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Model: Gemini 3.5 Flash-Lite</span>
                <span>•</span>
                <span>Hybrid Search (BM25 + 768d Vector)</span>
              </div>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Reset
          </button>
        </header>

        {/* Messages Stream Container */}
        <div
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          tabIndex={0}
          style={{ touchAction: "pan-y" }}
          aria-label="Riwayat Percakapan SIMULA"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 pt-6 pb-28 sm:px-6 lg:px-12 space-y-6 focus:outline-none"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`flex gap-3.5 scroll-mt-6 ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-bold shadow-xs ${
                  msg.sender === "user"
                    ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
                    : "bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-500/20"
                }`}
              >
                {msg.sender === "user" ? "👤" : "✚"}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`flex max-w-[88%] sm:max-w-[80%] flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`relative w-full max-w-full overflow-hidden rounded-2xl px-5 py-4 shadow-sm transition-all ${
                    msg.sender === "user"
                      ? "bg-gradient-to-br from-red-600 via-red-600 to-rose-600 text-white rounded-tr-xs shadow-red-600/10"
                      : "border border-slate-200/90 bg-white text-slate-800 rounded-tl-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  {/* Status Tag for Assistant */}
                  {msg.sender === "bot" && (
                    <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">
                          SIMULA AI
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Asisten PMR
                        </span>
                      </div>
                      {msg.mode && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            msg.mode === "rag_verified_module"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : msg.mode === "rag_filtered_out_of_scope"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-950/60 dark:text-amber-300"
                              : msg.mode === "conversational_assistant"
                              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-500/20 dark:bg-blue-950/60 dark:text-blue-300"
                              : msg.mode === "streaming"
                              ? "bg-red-50 text-red-700 ring-1 ring-red-500/20 dark:bg-red-950/60 dark:text-red-300 animate-pulse"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {msg.mode === "rag_verified_module"
                            ? "✓ Terverifikasi Modul"
                            : msg.mode === "rag_filtered_out_of_scope"
                            ? "🛡️ Filter: Di Luar Konteks"
                            : msg.mode === "conversational_assistant"
                            ? "💬 Asisten Interaktif"
                            : msg.mode === "streaming"
                            ? "⚡ Menyiapkan Jawaban..."
                            : msg.mode === "stopped"
                            ? "⏹ Dihentikan"
                            : msg.mode === "rate_limited"
                            ? "⏳ Tunggu Sebentar"
                            : "Informasi Sistem"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Emergency Safety Banner */}
                  {msg.sender === "bot" && msg.is_emergency && (
                    <div className="mb-3.5 flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50/90 p-3 text-xs text-red-900 dark:border-red-800/80 dark:bg-red-950/50 dark:text-red-200">
                      <span className="shrink-0 text-base">🚑</span>
                      <div className="leading-relaxed">
                        <strong className="font-bold">Panduan Keselamatan Darurat:</strong>{" "}
                        Utamakan keselamatan penolong (gunakan APD). Jika menghadapi kondisi darurat medis nyata, segera hubungi{" "}
                        <strong className="underline">119</strong>, Posko PMI, atau bawa ke Puskesmas/Rumah Sakit terdekat.
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
                  {msg.sender === "user" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                      {msg.text}
                    </p>
                  ) : msg.text ? (
                    <div className="relative">
                      <FormattedMessage text={msg.text} />
                      {loading && msg.id === streamingMsgId && (
                        <span className="inline-block h-3.5 w-1.5 ml-1 bg-red-600 animate-pulse rounded-full align-middle shadow-xs" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 py-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                      </span>
                      <span className="animate-pulse">
                        Menghubungkan ke modul pembelajaran PMI & merangkum...
                      </span>
                    </div>
                  )}

                  {/* Sources / Citations Card */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div
                      id={`sources-${msg.id}`}
                      className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50/90 p-3.5 dark:border-slate-800 dark:bg-slate-950/60"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        <span>📚</span> Rujukan Modul Terverifikasi:
                      </div>
                      <div className="mt-2.5 space-y-2">
                        {msg.sources.map((src, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2.5 rounded-lg bg-white px-3 py-2 text-xs border border-slate-200/60 shadow-2xs min-w-0 dark:bg-slate-900/80 dark:border-slate-800"
                          >
                            <span className="min-w-0 flex-1 truncate pr-2 font-medium text-slate-800 dark:text-slate-200">
                              {src.doc_title || src.title}
                              {src.section_title && (
                                <>
                                  {" "}
                                  •{" "}
                                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                                    {src.section_title}
                                  </span>
                                </>
                              )}
                            </span>
                            {src.similarity !== undefined && (
                              <span className="shrink-0 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold font-mono text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300">
                                {(src.similarity * 100).toFixed(1)}% match
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Suggestions Chips (Zero Extra Tokens) */}
                  {msg.sender === "bot" &&
                    msg.id !== streamingMsgId &&
                    msg.suggestions &&
                    msg.suggestions.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800/70">
                        <div className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          💡 Topik Lanjutan yang Disarankan:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestions.map((sug, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => handleSend(sug)}
                              disabled={loading}
                              className="rounded-lg border border-red-200/80 bg-red-50/50 px-2.5 py-1.5 text-left text-xs font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100/70 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40"
                            >
                              {sug} ➔
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Action Bar (Copy, Jump to Start, Timestamp) */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100/70 pt-2 text-[10px] dark:border-slate-800/60">
                    <span
                      className={
                        msg.sender === "user"
                          ? "text-red-200"
                          : "text-slate-400 dark:text-slate-500"
                      }
                    >
                      {msg.time}
                    </span>
                    <div className="flex items-center gap-2">
                      {msg.sender === "bot" && (
                        <>
                          <button
                            onClick={() => scrollToMessage(msg.id)}
                            title="Gulir ke awal pesan ini"
                            className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition font-medium"
                          >
                            ⬆ Awal Jawaban
                          </button>
                          {msg.sources && msg.sources.length > 0 && (
                            <button
                              onClick={() => {
                                const el = document.getElementById(`sources-${msg.id}`);
                                if (el && chatContainerRef.current) {
                                  const containerRect =
                                    chatContainerRef.current.getBoundingClientRect();
                                  const elRect = el.getBoundingClientRect();
                                  const targetScroll =
                                    elRect.top -
                                    containerRect.top +
                                    chatContainerRef.current.scrollTop -
                                    20;
                                  chatContainerRef.current.scrollTo({
                                    top: Math.max(0, targetScroll),
                                    behavior: "smooth",
                                  });
                                }
                              }}
                              title="Gulir ke bagian referensi dan sumber"
                              className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition font-medium"
                            >
                              ⬇ Referensi
                            </button>
                          )}
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition font-medium"
                          >
                            {copiedId === msg.id ? "✓ Tersalin" : "📋 Salin"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Scroll Navigation Controls */}
        <div className="absolute bottom-24 right-6 lg:right-10 z-20 flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/95 p-1 shadow-lg shadow-slate-900/10 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95">
          <button
            onClick={() => scrollToTop()}
            title="Gulir ke paling atas percakapan"
            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>⬆</span>
            <span className="text-[11px]">Atas</span>
          </button>
          <button
            onClick={() => scrollByPage(260)}
            title="Gulir layar ke bawah"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ▼
          </button>
          <button
            onClick={() => scrollToBottom(true)}
            title="Gulir ke pesan terbawah"
            className="flex h-8 items-center gap-1.5 rounded-full bg-red-600 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 active:scale-95"
          >
            <span>⬇</span>
            <span className="text-[11px]">Bawah</span>
            {hasNewUnseen && (
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            )}
          </button>
        </div>

        {/* Input Dock Bar */}
        <div className="shrink-0 border-t border-slate-200/80 bg-white/90 p-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
          <div className="mx-auto max-w-4xl">
            {/* Topic shortcuts for small screens, where the sidebar is hidden */}
            {messages.length <= 1 && (
              <div className="custom-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
                {CATEGORIES.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(cat.prompt)}
                    disabled={loading}
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <span>{cat.icon}</span>
                    {cat.title}
                  </button>
                ))}
              </div>
            )}
            <div className="relative flex items-end rounded-2xl border border-slate-200 bg-slate-50/90 shadow-sm transition-all focus-within:border-red-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950/60 dark:focus-within:border-red-500 dark:focus-within:bg-slate-900">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                maxLength={MAX_INPUT_CHARS}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                aria-label="Tulis pertanyaan"
                placeholder="Tanyakan materi kepalangmerahan (contoh: Bagaimana cara menolong korban luka bakar?)..."
                className="max-h-40 w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
              />
              <div className="pb-2 pr-2.5">
                {loading ? (
                  <button
                    onClick={stopGenerating}
                    title="Hentikan jawaban"
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-white px-4 text-xs font-bold text-red-700 transition hover:bg-red-50 active:scale-95 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-600" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim()}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 text-xs font-bold text-white shadow-md shadow-red-500/25 transition-all hover:from-red-700 hover:to-rose-700 hover:shadow-lg hover:shadow-red-500/30 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <span>Kirim</span>
                    <span className="text-sm">➔</span>
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-slate-400 dark:text-slate-500">
              <span>
                <kbd className="rounded border border-slate-200 px-1 py-0.5 font-mono text-[10px] dark:border-slate-800">
                  Enter
                </kbd>{" "}
                kirim •{" "}
                <kbd className="rounded border border-slate-200 px-1 py-0.5 font-mono text-[10px] dark:border-slate-800">
                  Shift+Enter
                </kbd>{" "}
                baris baru
              </span>
              {input.length > MAX_INPUT_CHARS * 0.8 ? (
                <span className={input.length >= MAX_INPUT_CHARS ? "font-semibold text-red-600" : ""}>
                  {input.length}/{MAX_INPUT_CHARS}
                </span>
              ) : (
                <span className="hidden sm:inline">
                  Jawaban AI bisa keliru — cek kembali ke modul & pembina PMR
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

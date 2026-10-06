"use client";

import { useState, useRef, useEffect, useId } from "react";

interface Source {
  doc_title: string;
  section_title: string;
  similarity?: number;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  sources?: Source[];
  mode?: string;
  time: string;
}

const CATEGORIES = [
  {
    icon: "🚨",
    title: "Pertolongan Pertama",
    desc: "Luka, Pendarahan, Patah Tulang, Pingsan",
    prompt: "Bagaimana langkah pertolongan pertama pada luka bakar melepuh?",
    badge: "Buku PP Mula",
  },
  {
    icon: "🌋",
    title: "Kesiapsiagaan Bencana",
    desc: "Gempa Bumi, Banjir, Tsunami, Evakuasi",
    prompt: "Apa yang harus dilakukan saat terjadi gempa bumi di dalam gedung?",
    badge: "Ayo Siaga Mula",
  },
  {
    icon: "🩺",
    title: "Pendidikan Remaja Sebaya",
    desc: "Tumbuh Kembang, Kesehatan, Potensi Diri",
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

// Rich formatter for bot responses (Markdown formatting)
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }

        // Warning / Caution highlight
        if (
          trimmed.toLowerCase().startsWith("jangan sekali-kali") ||
          trimmed.toLowerCase().startsWith("perhatian:") ||
          trimmed.toLowerCase().startsWith("peringatan:")
        ) {
          return (
            <div
              key={i}
              className="my-2 rounded-lg border-l-4 border-amber-500 bg-amber-50/80 p-2.5 text-xs text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-200"
            >
              ⚠️ {trimmed}
            </div>
          );
        }

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={i}
              className="mt-3 text-sm font-bold text-red-700 dark:text-red-400"
            >
              {trimmed.replace("### ", "")}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={i}
              className="mt-4 text-base font-bold text-slate-900 dark:text-white"
            >
              {trimmed.replace("## ", "")}
            </h3>
          );
        }

        // Bullet point
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          const content = trimmed.substring(2);
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span>{renderBold(content)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2">
              <span className="shrink-0 font-semibold text-red-600 dark:text-red-400">
                {numMatch[1]}.
              </span>
              <span>{renderBold(numMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph
        return <p key={i}>{renderBold(trimmed)}</p>;
      })}
    </div>
  );
}

// Simple bold parser
function renderBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong
          key={index}
          className="font-semibold text-slate-900 dark:text-white"
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function ChatbotPage() {
  const baseId = useId();
  const counterRef = useRef(1);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-welcome",
      sender: "bot",
      text: "Halo! Saya **Asisten Virtual Resmi SIMULA (Palang Merah Remaja & PMI)**.\n\nSaya didukung sistem **RAG Berpagar Ketat** yang membaca langsung 3 modul resmi PMI:\n- **Buku Panduan Pertolongan Pertama (PMR Mula)**\n- **Buku Panduan Ayo Siaga Bencana (PMR Mula)**\n- **Modul Pelatihan Remaja Sebaya (Kesehatan & Kesejahteraan Remaja)**\n\nSilakan klik salah satu contoh pertanyaan di sidebar atau ketik pertanyaan Anda sendiri di bawah!",
      sources: [],
      mode: "system_welcome",
      time: "08:00",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const generateId = (prefix: string) => {
    counterRef.current += 1;
    return `${prefix}-${baseId}-${counterRef.current}`;
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: generateId("user"),
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();

      const botMsg: Message = {
        id: generateId("bot"),
        sender: "bot",
        text: data.reply || "Tidak ada respons dari sistem.",
        sources: data.sources || [],
        mode: data.mode || "unknown",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId("error"),
          sender: "bot",
          text: "Gagal tersambung ke backend API di port 8000. Pastikan terminal backend FastAPI (`uvicorn app.main:app --port 8000`) sudah berjalan.",
          sources: [],
          mode: "network_error",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        id: generateId("reset"),
        sender: "bot",
        text: "Percakapan telah direset. Silakan tanyakan apa saja seputar materi kepalangmerahan PMR/PMI!",
        sources: [],
        mode: "system_welcome",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100">
      {/* SIDEBAR PANEL */}
      <aside className="hidden w-96 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-md lg:flex dark:border-slate-800/80 dark:bg-slate-900/90">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800/60">
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
                  PMR Mula
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Asisten Pembelajaran PMI
              </p>
            </div>
          </div>
        </div>

        {/* System Intelligence Badge */}
        <div className="p-4">
          <div className="rounded-2xl border border-red-200/60 bg-gradient-to-br from-red-50/80 via-white to-rose-50/50 p-4 shadow-sm dark:border-red-900/40 dark:from-red-950/20 dark:via-slate-900/50 dark:to-slate-900">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                <span className="inline-block h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                RAG Engine Aktif
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                236 Chunks
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Menjawab <strong>100% dari dokumen modul resmi</strong> PMI. Dilengkapi 2 lapis guardrail untuk mencegah jawaban di luar topik.
            </p>
          </div>
        </div>

        {/* Quick Question Cards */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
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
        <div className="border-t border-slate-200/80 p-4 dark:border-slate-800/80">
          <button
            onClick={resetChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300"
          >
            <span>🔄</span> Bersihkan Percakapan
          </button>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-100/50 dark:bg-slate-950">
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
                <span>Embedding: 768 Dimensi</span>
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

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-12 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${
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
                className={`flex max-w-[85%] sm:max-w-[78%] flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`relative rounded-2xl px-5 py-4 shadow-sm transition-all ${
                    msg.sender === "user"
                      ? "bg-gradient-to-br from-red-600 via-red-600 to-rose-600 text-white rounded-tr-xs shadow-red-600/10"
                      : "border border-slate-200/90 bg-white text-slate-800 rounded-tl-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  {/* Status Tag for Assistant */}
                  {msg.sender === "bot" && (
                    <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">
                        SIMULA AI
                      </span>
                      {msg.mode && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            msg.mode === "rag_verified_module"
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : msg.mode === "rag_filtered_out_of_scope"
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {msg.mode === "rag_verified_module"
                            ? "✓ Terverifikasi Modul"
                            : msg.mode === "rag_filtered_out_of_scope"
                            ? "🛡️ Filter: Di Luar Konteks"
                            : "Informasi Sistem"}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Body Content */}
                  {msg.sender === "user" ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.text}
                    </p>
                  ) : (
                    <FormattedMessage text={msg.text} />
                  )}

                  {/* Sources / Citations Card */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/50">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <span>📚</span> Rujukan Modul Terverifikasi:
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {msg.sources.map((src, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs border border-slate-200/50 dark:bg-slate-900/60 dark:border-slate-800"
                          >
                            <span className="truncate pr-3 font-medium text-slate-700 dark:text-slate-300">
                              {src.doc_title} • <span className="text-slate-500">{src.section_title}</span>
                            </span>
                            {src.similarity !== undefined && (
                              <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold font-mono text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300">
                                {(src.similarity * 100).toFixed(1)}% match
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Bar (Copy & Timestamp) */}
                  <div className="mt-2.5 flex items-center justify-between pt-1 text-[10px]">
                    <span
                      className={
                        msg.sender === "user"
                          ? "text-red-200"
                          : "text-slate-400 dark:text-slate-500"
                      }
                    >
                      {msg.time}
                    </span>
                    {msg.sender === "bot" && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                      >
                        {copiedId === msg.id ? "✓ Tersalin" : "📋 Salin"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Animation Indicator */}
          {loading && (
            <div className="flex items-center gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-500/20 animate-pulse">
                ✚
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-slate-200/80 bg-white px-5 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Mencari & memvalidasi materi dari modul PMI...
                </span>
                <span className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-bounce"></span>
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="h-2 w-2 rounded-full bg-red-600 animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock Bar */}
        <div className="border-t border-slate-200/80 bg-white/90 p-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90">
          <div className="mx-auto max-w-4xl">
            <div className="relative flex items-center rounded-2xl border border-slate-200 bg-slate-50/90 shadow-sm transition-all focus-within:border-red-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-red-500/10 dark:border-slate-800 dark:bg-slate-950/60 dark:focus-within:border-red-500 dark:focus-within:bg-slate-900">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Tanyakan materi kepalangmerahan (contoh: Bagaimana cara menolong korban luka bakar?)..."
                disabled={loading}
                className="w-full bg-transparent px-5 py-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white dark:placeholder-slate-500"
              />
              <div className="pr-2.5">
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 text-xs font-bold text-white shadow-md shadow-red-500/25 transition-all hover:from-red-700 hover:to-rose-700 hover:shadow-lg hover:shadow-red-500/30 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                >
                  <span>Kirim</span>
                  <span className="text-sm">➔</span>
                </button>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-slate-400 dark:text-slate-500">
              <span>Tekan <kbd className="rounded border border-slate-200 px-1 py-0.5 font-mono text-[10px] dark:border-slate-800">Enter</kbd> untuk mengirim</span>
              <span>SIMULA PMI Intelligence System</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

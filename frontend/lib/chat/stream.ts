import { HISTORY_TEXT_LIMIT, HISTORY_WINDOW, NON_CONTEXT_MODES } from "./constants";
import type { Message, Source } from "./types";

export interface ChatMeta {
  mode?: string;
  sources?: Source[];
  suggestions?: string[];
  is_emergency?: boolean;
}

interface HistoryItem {
  sender: "user" | "bot";
  text: string;
}

export class ChatRequestError extends Error {
  constructor(message: string, public mode: string) {
    super(message);
  }
}

// Only complete question/answer pairs are useful context: a question whose reply
// failed or was stopped is dropped together with that reply.
export function buildHistory(messages: Message[]): HistoryItem[] {
  const items: HistoryItem[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const question = messages[i];
    const answer = messages[i + 1];
    if (
      question.role === "user" &&
      answer.role === "assistant" &&
      answer.status === "done" &&
      answer.content &&
      !NON_CONTEXT_MODES.has(answer.mode ?? "")
    ) {
      items.push(
        { sender: "user", text: question.content.slice(0, HISTORY_TEXT_LIMIT) },
        { sender: "bot", text: answer.content.slice(0, HISTORY_TEXT_LIMIT) }
      );
      i++;
    }
  }
  return items.slice(-HISTORY_WINDOW);
}

export async function streamChat(
  request: { message: string; history: HistoryItem[]; signal: AbortSignal },
  handlers: { onMeta: (meta: ChatMeta) => void; onDelta: (text: string) => void }
) {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: request.message,
        history: request.history,
        stream: true,
      }),
      signal: request.signal,
    });
  } catch (error) {
    if (request.signal.aborted) throw error;
    throw new ChatRequestError(
      "Tidak dapat terhubung ke server. Periksa koneksi internetmu lalu coba lagi.",
      "network_error"
    );
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ChatRequestError(
      data.reply || `Server sedang bermasalah (status ${res.status}). Coba lagi sebentar lagi.`,
      data.mode || "backend_offline"
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream") || !res.body) {
    const data = await res.json();
    handlers.onMeta(data);
    if (data.reply) handlers.onDelta(data.reply);
    return;
  }

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    let payload;
    try {
      payload = JSON.parse(trimmed.slice(5).trim());
    } catch {
      return; // Ignore malformed events
    }
    if (payload.type === "meta") handlers.onMeta(payload);
    else if (payload.type === "delta" && payload.text) handlers.onDelta(payload.text);
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    lines.forEach(handleLine);
  }
  // Flush whatever is left if the stream did not end with a newline
  buffer += decoder.decode();
  if (buffer) handleLine(buffer);
}

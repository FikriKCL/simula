export type Msg = { from: "bot" | "me"; text: string };

type TokenPayload = {
  token?: string;
  delta?: string;
  content?: string;
  text?: string;
  reply?: string;
};

/** Ambil potongan teks dari satu event SSE (JSON atau teks mentah). */
function extractToken(data: string): string {
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object") {
      const p = parsed as TokenPayload;
      return p.token ?? p.delta ?? p.content ?? p.text ?? p.reply ?? "";
    }
    return "";
  } catch {
    return data;
  }
}

/** Kirim pesan ke /api/chat dan panggil onToken untuk tiap potongan jawaban. */
export async function streamChat(
  message: string,
  history: Msg[],
  onToken: (token: string) => void
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Sesuaikan nama field dengan schema FastAPI Anda
    body: JSON.stringify({ message, history, stream: true }),
  });

  const type = res.headers.get("content-type") ?? "";

  // Error atau mode non-stream: balasan JSON { reply, sources, mode }
  if (!type.includes("text/event-stream")) {
    const data: { reply?: string } = await res.json();
    onToken(data.reply ?? "Hmm, aku belum punya jawabannya.");
    return;
  }

  if (!res.body) throw new Error("Tidak ada body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  let result = await reader.read();
  while (!result.done) {
    buffer += decoder.decode(result.value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const evt of events) {
      const data = evt
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (!data || data === "[DONE]") continue;
      onToken(extractToken(data));
    }

    result = await reader.read();
  }
}
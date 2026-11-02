import { NextResponse } from "next/server";

const MAX_MESSAGE_CHARS = 2000;

function errorReply(reply: string, mode: string, status: number, error?: string) {
  return NextResponse.json({ reply, sources: [], mode, error }, { status });
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return errorReply("Permintaan tidak valid.", "invalid_input", 400);
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    return errorReply(
      `Pertanyaan tidak boleh kosong dan maksimal ${MAX_MESSAGE_CHARS} karakter.`,
      "invalid_input",
      422
    );
  }

  const isStream = body.stream !== false;
  const backendHost = process.env.BACKEND_URL || "http://127.0.0.1:8000";
  const endpoint = isStream ? "/api/v1/chat/test/stream" : "/api/v1/chat/test";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Lets the backend rate-limit per browser instead of per proxy
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;

  try {
    const res = await fetch(`${backendHost}${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ message, history: Array.isArray(body.history) ? body.history : [] }),
      // Stops the backend (and Gemini) stream when the user presses "Stop" or leaves
      signal: req.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) {
        const wait = Number(res.headers.get("retry-after")) || 0;
        return errorReply(
          wait
            ? `Terlalu banyak pertanyaan dalam waktu singkat. Coba lagi dalam ${wait} detik.`
            : "Terlalu banyak pertanyaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.",
          "rate_limited",
          429,
          errText
        );
      }
      if (res.status === 422) {
        return errorReply(
          "Pertanyaan tidak valid atau terlalu panjang (maksimal 2000 karakter).",
          "invalid_input",
          422,
          errText
        );
      }
      return errorReply(
        `Server asisten sedang bermasalah (status ${res.status}). Coba lagi beberapa saat lagi.`,
        "backend_offline",
        502,
        errText
      );
    }

    if (isStream && res.body) {
      return new Response(res.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    return NextResponse.json(await res.json());
  } catch (error: unknown) {
    // The browser cancelled the request (Stop button / tab closed): nobody reads this
    if (req.signal.aborted) return new Response(null, { status: 499 });
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan koneksi";
    return errorReply(
      "Server asisten belum bisa dihubungi. Pastikan backend sudah berjalan, lalu coba lagi.",
      "connection_error",
      503,
      errorMessage
    );
  }
}

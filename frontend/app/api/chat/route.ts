import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const isStream = body.stream !== false;
    const backendHost = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    const endpoint = isStream ? "/api/v1/chat/test/stream" : "/api/v1/chat/test";
    const backendUrl = `${backendHost}${endpoint}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Lets the backend rate-limit per browser instead of per proxy
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;

    const res = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ message: body.message, history: body.history ?? [] }),
      // Stops the backend (and Gemini) stream when the user presses "Stop" or leaves
      signal: req.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      const reply =
        res.status === 429
          ? "Terlalu banyak pertanyaan dalam waktu singkat. Tunggu sebentar lalu coba lagi ya."
          : res.status === 422
          ? "Pertanyaan tidak valid atau terlalu panjang (maksimal 2000 karakter)."
          : `Gagal menghubungi server backend (Status ${res.status}). Pastikan backend FastAPI sedang berjalan.`;
      return NextResponse.json(
        {
          reply,
          sources: [],
          mode: res.status === 429 ? "rate_limited" : res.status === 422 ? "invalid_input" : "backend_offline",
          error: errText,
        },
        { status: res.status }
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

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan koneksi";
    return NextResponse.json(
      {
        reply: "Backend FastAPI belum berjalan di http://127.0.0.1:8000. Silakan jalankan backend terlebih dahulu.",
        sources: [],
        mode: "connection_error",
        error: errorMessage,
      },
      { status: 503 }
    );
  }
}


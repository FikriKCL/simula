import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:8000/api/v1/chat/test";

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        {
          reply: `Gagal menghubungi server backend (Status ${res.status}). Pastikan backend FastAPI sedang berjalan.`,
          sources: [],
          mode: "backend_offline",
          error: errText,
        },
        { status: res.status }
      );
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

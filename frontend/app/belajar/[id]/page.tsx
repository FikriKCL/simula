"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type ModuleDetail, type MaterialCard } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
import Markdown from "@/components/chat/Markdown";
export default function ModulePage() {
  const { id } = useParams<{ id: string }>();
  const source = useApiData<ModuleDetail>(`/modules/${id}`);
  const catalogue = useApiData<{ items: MaterialCard[] }>(
    `/materials?module_id=${id}&limit=100`,
  );
  const progress =
    useApiData<{ id: number; total: number; completed: number }[]>(
      "/learning/progress",
    );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  async function complete(lid: number) {
    setBusy(lid);
    setMessage("");
    try {
      const r = await api<{ xp_awarded: number }>(`/lessons/${lid}/complete`, {
        method: "POST",
      });
      setMessage(`Pelajaran selesai. +${r.xp_awarded} XP`);
      progress.reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const allDone = progress.data?.find((p) => p.id === Number(id));
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/dashboard" className="text-brand underline">
        ← Pembelajaran
      </Link>
      <ApiState
        loading={source.loading}
        error={source.error}
        retry={source.reload}
      />
      {source.data && (
        <>
          <h1 className="text-3xl font-bold">{source.data.title}</h1>
          <p>{source.data.description}</p>
          <ApiState
            loading={catalogue.loading || progress.loading}
            error={catalogue.error || progress.error}
            retry={() => {
              catalogue.reload();
              progress.reload();
            }}
          />
          {source.data.lessons.map((l) => (
            <section
              className="space-y-4 rounded-2xl border-2 border-line bg-surface p-6"
              key={l.id}
            >
              <h2 className="text-xl font-bold">{l.title}</h2>
              <Markdown text={l.body} />
              <ul className="space-y-3">
                {catalogue.data?.items
                  .filter((m) => m.lesson_id === l.id)
                  .map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/materi/${m.id}`}
                        className="text-brand underline"
                      >
                        {m.title}
                      </Link>{" "}
                      · {m.kind} {m.completed ? "✓ selesai" : ""}
                    </li>
                  ))}
              </ul>
              <button
                disabled={busy !== null}
                onClick={() => complete(l.id)}
                className="rounded-xl bg-brand px-4 py-2 text-white"
              >
                {busy === l.id ? "Menyimpan…" : "Selesaikan pelajaran"}
              </button>
            </section>
          ))}
          <section>
            <h2 className="mb-4 text-xl font-bold">Latihan dan tes</h2>
            {source.data.quizzes.map((q) => (
              <div key={q.id} className="mb-3">
                {q.kind === "POST" &&
                (!allDone || allDone.completed < allDone.total) ? (
                  <p className="text-muted">
                    {q.title} — selesaikan semua pelajaran dahulu
                  </p>
                ) : (
                  <Link className="text-brand underline" href={`/kuis/${q.id}`}>
                    {q.title}
                  </Link>
                )}
              </div>
            ))}
            {source.data.quizzes.length === 0 && <p>Belum ada kuis.</p>}
          </section>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </main>
  );
}

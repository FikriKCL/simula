"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type ModuleDetail, type MaterialCard } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
import Markdown from "@/components/chat/Markdown";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";

const panel = "rounded-[22px] border-2 border-line bg-surface shadow-pop";
const btnPrimary =
  "cursor-pointer rounded-[14px] bg-brand px-5 py-2.5 font-heading text-sm font-extrabold text-white shadow-[0_4px_0_#b71c1c] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";
const btnGhost =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-brand px-4 py-1.5 font-heading text-sm font-extrabold text-brand no-underline transition-colors hover:bg-brand-soft";
const kindLabel: Record<string, string> = {
  VIDEO: "Video",
  COMIC: "Komik",
  PDF: "Dokumen",
  ARTICLE: "Artikel",
};

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
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="pembelajaran" />

      <main className="relative overflow-hidden pb-30 pt-6">
        <div className="mx-auto flex w-[min(800px,calc(100%-48px))] flex-col gap-4">
          <Link href="/dashboard" className={`${btnGhost} self-start`}>
            ← Pembelajaran
          </Link>

          <ApiState
            loading={source.loading}
            error={source.error}
            retry={source.reload}
          />

          {source.data && (
            <>
              {/* Banner judul */}
              <div className="rounded-[20px] bg-sky px-[26px] py-[18px] text-[#1c2b3d] shadow-[0_5px_0_var(--blue-edge)] dark:text-white">
                <h1 className="font-heading text-[26px] font-extrabold leading-tight">
                  {source.data.title}
                </h1>
                {source.data.description && (
                  <p className="mt-1 text-[14px] font-bold">
                    {source.data.description}
                  </p>
                )}
              </div>

              <ApiState
                loading={catalogue.loading || progress.loading}
                error={catalogue.error || progress.error}
                retry={() => {
                  catalogue.reload();
                  progress.reload();
                }}
              />

              {/* Daftar pelajaran */}
              {source.data.lessons.map((l, i) => {
                const materials =
                  catalogue.data?.items.filter((m) => m.lesson_id === l.id) ??
                  [];
                return (
                  <section className={`${panel} space-y-4 p-6`} key={l.id}>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft font-heading text-base font-extrabold text-brand">
                        {i + 1}
                      </span>
                      <h2 className="font-heading text-xl font-extrabold">
                        {l.title}
                      </h2>
                    </div>

                    <Markdown text={l.body} />

                    {materials.length > 0 && (
                      <div>
                        <h3 className="mb-2 font-heading text-sm font-extrabold text-muted">
                          Materi pendukung
                        </h3>
                        <ul className="flex flex-col gap-2">
                          {materials.map((m) => (
                            <li key={m.id}>
                              <Link
                                href={`/materi/${m.id}`}
                                className="flex items-center justify-between gap-3 rounded-[14px] border-2 border-line bg-page px-4 py-2.5 text-[15px] font-bold no-underline transition-colors hover:bg-sky-soft"
                              >
                                <span className="text-ink">{m.title}</span>
                                <span className="flex shrink-0 items-center gap-2 text-xs font-extrabold">
                                  <span className="rounded-full bg-sky-soft px-2.5 py-0.5 text-ink">
                                    {kindLabel[m.kind] ?? m.kind}
                                  </span>
                                  {m.completed && (
                                    <span className="text-brand">✓ selesai</span>
                                  )}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      disabled={busy !== null}
                      onClick={() => complete(l.id)}
                      className={btnPrimary}
                    >
                      {busy === l.id ? "Menyimpan…" : "Selesaikan pelajaran"}
                    </button>
                  </section>
                );
              })}

              {/* Latihan dan tes */}
              <section className={`${panel} p-6`}>
                <h2 className="mb-4 font-heading text-xl font-extrabold">
                  Latihan dan tes
                </h2>

                <div className="flex flex-col gap-2.5">
                  {source.data.quizzes.map((q) => {
                    const locked =
                      q.kind === "POST" &&
                      (!allDone || allDone.completed < allDone.total);
                    return locked ? (
                      <div
                        key={q.id}
                        className="flex items-center justify-between gap-3 rounded-[14px] border-2 border-line bg-lock px-4 py-3 text-muted"
                      >
                        <span className="font-heading text-[15px] font-extrabold">
                          {q.title}
                        </span>
                        <span className="text-xs font-bold">
                          Selesaikan semua pelajaran dahulu
                        </span>
                      </div>
                    ) : (
                      <Link
                        key={q.id}
                        href={`/kuis/${q.id}`}
                        className="flex items-center justify-between gap-3 rounded-[14px] border-2 border-brand bg-brand-soft px-4 py-3 font-heading text-[15px] font-extrabold text-brand no-underline transition-colors hover:bg-sky-soft"
                      >
                        {q.title}
                        <span aria-hidden="true">→</span>
                      </Link>
                    );
                  })}
                </div>

                {source.data.quizzes.length === 0 && (
                  <p className="text-sm font-semibold text-muted">
                    Belum ada kuis.
                  </p>
                )}
              </section>
            </>
          )}

          {message && (
            <p
              role="status"
              className="rounded-[14px] bg-sky-soft px-3.5 py-2.5 text-sm font-bold text-ink"
            >
              {message}
            </p>
          )}
        </div>
      </main>

      <RightPanel />
    </div>
  );
}
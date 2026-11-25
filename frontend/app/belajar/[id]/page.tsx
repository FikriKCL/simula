"use client";
import { useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type ModuleDetail, type MaterialCard } from "@/lib/api";
import { useApiData } from "@/components/ApiState";
import Sidebar from "@/components/Sidebar";
import Markdown from "@/components/chat/Markdown";
import { CheckIcon, LockIcon } from "@/components/Icons";
import { ComicIcon, PdfIcon, VideoIcon } from "@/components/MateriIcons";
import { banner, btnOutline, column } from "@/components/ui";

type Quiz = ModuleDetail["quizzes"][number];

/* Ikon + warna per jenis materi. */
const kindStyle: Record<string, { label: string; icon: ReactNode; cls: string }> = {
  ARTICLE: { label: "Artikel", icon: <PdfIcon size={20} />, cls: "bg-sky-soft text-sky-dark" },
  PDF: { label: "PDF", icon: <PdfIcon size={20} />, cls: "bg-brand-soft text-brand" },
  VIDEO: { label: "Video", icon: <VideoIcon size={20} />, cls: "bg-gold-soft text-[#9a6b00]" },
  COMIC: { label: "Komik", icon: <ComicIcon size={20} />, cls: "bg-cloud-pink text-brand" },
};

const btnBase =
  "inline-flex cursor-pointer items-center justify-center rounded-[14px] px-6 py-3 font-heading text-sm font-extrabold uppercase tracking-[0.4px] transition active:translate-y-[4px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60";
const btnRed = `${btnBase} bg-brand text-white shadow-[0_4px_0_#b71c1c]`;
const btnBlue = `${btnBase} bg-sky-dark text-white shadow-[0_4px_0_#1565c0]`;
const card =
  "rounded-[20px] border-2 border-line bg-surface p-6 shadow-pop max-[560px]:p-4";

/* Satu langkah di jalur belajar: bulatan nomor + garis penghubung + isi. */
function Step({
  mark,
  tone,
  last,
  children,
}: {
  mark: ReactNode;
  tone: "red" | "blue" | "gold" | "lock" | "done";
  last?: boolean;
  children: ReactNode;
}) {
  const dot = {
    red: "bg-brand text-white shadow-[0_3px_0_#b71c1c]",
    blue: "bg-sky-dark text-white shadow-[0_3px_0_#1565c0]",
    gold: "bg-gold text-white shadow-[0_3px_0_#c68a00]",
    lock: "bg-lock text-muted shadow-[0_3px_0_var(--lock-edge)]",
    done: "bg-sky-dark text-white shadow-[0_3px_0_#1565c0]",
  }[tone];
  return (
    <li className="relative flex gap-4 pb-6 max-[560px]:gap-3">
      {!last && (
        <span
          aria-hidden
          className="absolute bottom-0 left-[21px] top-12 w-1 rounded-full bg-line"
        />
      )}
      <span
        className={`relative z-[1] grid size-11 shrink-0 place-items-center rounded-full font-heading text-base font-extrabold ${dot}`}
      >
        {mark}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

function QuizCard({
  quiz,
  locked,
  hint,
}: {
  quiz: Quiz;
  locked: boolean;
  hint: string;
}) {
  const post = quiz.kind === "POST";
  return (
    <div
      className={`${card} flex items-center justify-between gap-4 max-[560px]:flex-col max-[560px]:items-stretch`}
    >
      <div className="min-w-0">
        <span
          className={`inline-block rounded-full px-3 py-1 font-heading text-[11px] font-extrabold uppercase tracking-[0.6px] ${
            post ? "bg-gold-soft text-[#9a6b00]" : "bg-sky-soft text-sky-dark"
          }`}
        >
          {post ? "Tes akhir" : "Tes awal"}
        </span>
        <h3 className="mt-2 font-heading text-base font-extrabold leading-snug">
          {quiz.title}
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-muted">
          {locked && <LockIcon size={13} />}
          {hint}
        </p>
      </div>
      {locked ? (
        <span className={`${btnBase} cursor-not-allowed bg-lock text-muted shadow-[0_4px_0_var(--lock-edge)]`}>
          Terkunci
        </span>
      ) : (
        <Link
          href={`/kuis/${quiz.id}`}
          className={`${post ? btnRed : btnBlue} shrink-0`}
        >
          Mulai kuis
        </Link>
      )}
    </div>
  );
}

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
  // Status level dari jalur belajar: selesai = semua pelajaran + tes akhir lulus
  const path = useApiData<
    { id: number; levels: { id: number; level: number; title: string; status: string; posttests_passed: boolean }[] }[]
  >("/learning/path");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [doneLessons, setDoneLessons] = useState<number[]>([]);

  async function complete(lid: number) {
    setBusy(lid);
    setMessage("");
    try {
      const r = await api<{ xp_awarded: number }>(`/lessons/${lid}/complete`, {
        method: "POST",
      });
      setDoneLessons((v) => [...v, lid]);
      setMessage(
        r.xp_awarded > 0
          ? `Pelajaran selesai. +${r.xp_awarded} XP`
          : "Pelajaran selesai.",
      );
      progress.reload();
      path.reload();
      catalogue.reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const mod = source.data;
  const materials = catalogue.data?.items || [];
  const stat = progress.data?.find((p) => p.id === Number(id));
  const total = stat?.total ?? mod?.lessons.length ?? 0;
  const completed = stat?.completed ?? 0;
  const lessonsDone = total > 0 && completed >= total;
  const pre = mod?.quizzes.filter((q) => q.kind !== "POST") || [];
  const post = mod?.quizzes.filter((q) => q.kind === "POST") || [];
  const pct = total ? Math.min((completed / total) * 100, 100) : 0;
  const topicLevels = path.data?.find((t) => t.levels.some((l) => l.id === Number(id)))?.levels || [];
  const here = topicLevels.findIndex((l) => l.id === Number(id));
  const levelDone = here >= 0 && topicLevels[here].status === "COMPLETED";
  const nextLevel = here >= 0 ? topicLevels[here + 1] : undefined;

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="pembelajaran" />

      <main className="pb-[120px] pt-6">
        {/* Banner */}
        <div
          className={`${column} ${banner} gap-4 px-[26px] py-[18px] max-[560px]:flex-col max-[560px]:items-start`}
        >
          <div className="min-w-0">
            <p className="text-[13px] font-bold">Modul pembelajaran</p>
            <h1 className="font-heading text-[22px] font-extrabold leading-tight">
              {mod?.title || (source.error ? "Modul belum terbuka" : "Memuat modul…")}
            </h1>
          </div>
          <Link href="/dashboard" className={`${btnOutline} shrink-0`}>
            ← Kembali
          </Link>
        </div>

        <div className={`${column} mt-6`}>
          {source.loading && (
            <div className="space-y-4" aria-busy>
              {[0, 1, 2].map((i) => (
                <div key={i} className={`${card} h-28 animate-pulse`} />
              ))}
            </div>
          )}

          {/* Level terkunci / gagal muat */}
          {source.error && (
            <div className={`${card} flex flex-col items-center py-12 text-center`}>
              <span className="grid size-20 place-items-center rounded-full bg-lock text-muted shadow-[0_5px_0_var(--lock-edge)]">
                <LockIcon size={34} />
              </span>
              <h2 className="mt-6 font-heading text-xl font-extrabold">
                Level ini masih terkunci
              </h2>
              <p className="mt-2 max-w-sm font-semibold text-muted">
                {source.error}
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/dashboard" className={btnRed}>
                  Ke jalur belajar
                </Link>
                <button onClick={source.reload} className={`${btnBase} border-2 border-line bg-surface text-muted shadow-[0_4px_0_var(--border)]`}>
                  Coba lagi
                </button>
              </div>
            </div>
          )}

          {mod && (
            <>
              {/* Ringkasan */}
              <section className={card}>
                {mod.description && (
                  <p className="font-semibold leading-relaxed text-muted">
                    {mod.description}
                  </p>
                )}
                <div className="mt-5 grid grid-cols-3 gap-3 max-[560px]:gap-2">
                  {[
                    { n: mod.lessons.length, label: "Pelajaran" },
                    { n: materials.length, label: "Materi" },
                    { n: mod.quizzes.length, label: "Kuis" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-[14px] bg-sky-soft/60 px-2 py-3 text-center"
                    >
                      <p className="font-heading text-2xl font-extrabold text-sky-dark">
                        {s.n}
                      </p>
                      <p className="text-xs font-extrabold uppercase tracking-[0.6px] text-muted max-[560px]:text-[10px] max-[560px]:tracking-normal">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between font-heading text-sm font-extrabold">
                  <span>Progres pelajaran</span>
                  <span className="text-sky-dark">
                    {completed}/{total} selesai
                  </span>
                </div>
                <div className="mt-2 h-4 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full min-w-4 rounded-full bg-sky-dark transition-[width] duration-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </section>

              {levelDone && (
                <section className="mt-5 flex items-center justify-between gap-4 rounded-[20px] border-2 border-gold bg-gold-soft px-6 py-4 max-[560px]:flex-col max-[560px]:items-stretch">
                  <div>
                    <p className="font-heading text-lg font-extrabold">Level ini sudah selesai 🎉</p>
                    <p className="text-sm font-semibold text-muted">
                      {nextLevel ? `Level berikutnya terbuka: ${nextLevel.title}` : "Semua level di topik ini sudah kamu selesaikan."}
                    </p>
                  </div>
                  <Link href={nextLevel ? `/belajar/${nextLevel.id}` : "/dashboard"} className={`${btnRed} shrink-0`}>
                    {nextLevel ? "Lanjut level berikutnya" : "Ke jalur belajar"}
                  </Link>
                </section>
              )}

              {/* Jalur belajar */}
              <h2 className="mb-4 mt-8 font-heading text-lg font-extrabold">
                Langkah belajar
              </h2>
              <ol>
                {pre.map((q) => (
                  <Step key={q.id} mark="★" tone="blue">
                    <QuizCard
                      quiz={q}
                      locked={false}
                      hint="Cek pengetahuan awalmu dulu."
                    />
                  </Step>
                ))}

                {mod.lessons.length === 0 && (
                  <Step mark="1" tone="lock">
                    <p className={`${card} text-muted`}>Belum ada pelajaran.</p>
                  </Step>
                )}

                {mod.lessons.map((l, i) => {
                  const items = materials.filter((m) => m.lesson_id === l.id);
                  const done = lessonsDone || doneLessons.includes(l.id);
                  const remaining = items.filter((m) => !m.completed).length;
                  return (
                    <Step
                      key={l.id}
                      mark={done ? <CheckIcon size={20} /> : i + 1}
                      tone={done ? "done" : "red"}
                    >
                      <article className={card}>
                        <p className="font-heading text-[11px] font-extrabold uppercase tracking-[0.6px] text-brand">
                          Pelajaran {i + 1}
                        </p>
                        <h3 className="mt-1 font-heading text-lg font-extrabold">
                          {l.title}
                        </h3>
                        <div className="mt-3 text-[15px] leading-relaxed">
                          <Markdown text={l.body} />
                        </div>

                        {items.length > 0 && (
                          <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-2.5">
                            {items.map((m) => {
                              const k = kindStyle[m.kind] || kindStyle.ARTICLE;
                              return (
                                <li key={m.id}>
                                  <Link
                                    href={`/materi/${m.id}`}
                                    className="group flex items-center gap-3 rounded-[14px] border-2 border-line bg-surface px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-sky hover:shadow-pop"
                                  >
                                    <span
                                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${k.cls}`}
                                    >
                                      {k.icon}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="line-clamp-2 font-bold leading-snug">
                                        {m.title}
                                      </span>
                                      <span className="text-xs font-extrabold uppercase tracking-[0.4px] text-muted">
                                        {k.label}
                                      </span>
                                    </span>
                                    {m.completed ? (
                                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sky-dark text-white">
                                        <CheckIcon size={13} />
                                      </span>
                                    ) : (
                                      <span
                                        aria-hidden
                                        className="shrink-0 font-heading text-xl font-extrabold text-muted transition group-hover:translate-x-0.5 group-hover:text-sky-dark"
                                      >
                                        ›
                                      </span>
                                    )}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                          {!done && remaining > 0 && (
                            <span className="mr-auto text-sm font-bold text-muted">
                              Buka dan tandai selesai {remaining} materi dulu.
                            </span>
                          )}
                          {done ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-sky-soft px-4 py-2 font-heading text-sm font-extrabold text-sky-dark">
                              <CheckIcon size={14} /> Pelajaran selesai
                            </span>
                          ) : (
                            <button
                              disabled={busy !== null}
                              onClick={() => complete(l.id)}
                              className={btnRed}
                            >
                              {busy === l.id ? "Menyimpan…" : "Selesaikan pelajaran"}
                            </button>
                          )}
                        </div>
                      </article>
                    </Step>
                  );
                })}

                {post.map((q, i) => (
                  <Step
                    key={q.id}
                    mark={lessonsDone ? "★" : <LockIcon size={16} />}
                    tone={lessonsDone ? "gold" : "lock"}
                    last={i === post.length - 1}
                  >
                    <QuizCard
                      quiz={q}
                      locked={!lessonsDone}
                      hint={
                        lessonsDone
                          ? "Lulus tes ini untuk membuka level berikutnya."
                          : "Selesaikan semua pelajaran dahulu."
                      }
                    />
                  </Step>
                ))}
              </ol>

              {(catalogue.error || progress.error) && (
                <p role="alert" className="mt-2 font-bold text-brand">
                  {catalogue.error || progress.error}{" "}
                  <button
                    className="underline"
                    onClick={() => {
                      catalogue.reload();
                      progress.reload();
                    }}
                  >
                    Coba lagi
                  </button>
                </p>
              )}
            </>
          )}

          {message && (
            <p
              role="status"
              className="sticky bottom-4 z-10 mt-4 rounded-[14px] bg-sky-soft px-4 py-3 text-center font-bold text-sky-dark shadow-pop"
            >
              {message}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

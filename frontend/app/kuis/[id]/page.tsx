"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, type QuizRun, type QuizResult } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";

const panel = "rounded-[22px] border-2 border-line bg-surface shadow-pop";
const btnPrimary =
  "cursor-pointer rounded-[14px] bg-brand px-6 py-3 font-heading text-sm font-extrabold text-white shadow-[0_4px_0_#b71c1c] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";
const btnGhost =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-brand px-4 py-1.5 font-heading text-sm font-extrabold text-brand no-underline transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60";

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  function backToModule() {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  const [run, setRun] = useState<QuizRun | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError("");
    try {
      setRun(await api<QuizRun>(`/quizzes/${id}/runs`, { method: "POST" }));
      setAnswers({});
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!run) return;
    setBusy(true);
    setError("");
    try {
      setResult(
        await api<QuizResult>(`/quizzes/${id}/runs/${run.id}/submit`, {
          method: "POST",
          body: JSON.stringify({ answers }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const answered = run ? Object.keys(answers).length : 0;
  const total = run?.questions.length ?? 0;

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="pembelajaran" />

      <main className="relative overflow-hidden pb-30 pt-6">
        <div className="mx-auto flex w-[min(800px,calc(100%-48px))] flex-col gap-4">
          <div className="flex flex-wrap gap-2.5 self-start">
            <button type="button" onClick={backToModule} className={btnGhost}>
              ← Kembali ke modul
            </button>
          </div>

          {/* Banner judul */}
          <div className="flex items-center justify-between gap-4 rounded-[20px] bg-sky px-[26px] py-[18px] text-[#1c2b3d] shadow-[0_5px_0_var(--blue-edge)] dark:text-white">
            <div>
              <h1 className="font-heading text-[22px] font-extrabold">
                Latihan SIMULA
              </h1>
              <p className="mt-0.5 text-[13px] font-bold">
                Jawab semua pertanyaan lalu kirim jawabanmu
              </p>
            </div>
            {run && !result && (
              <span className="shrink-0 rounded-full bg-white/70 px-3.5 py-1 font-heading text-sm font-extrabold text-[#1c2b3d]">
                {answered} / {total}
              </span>
            )}
          </div>

          {/* Mulai kuis */}
          {!run && (
            <section className={`${panel} grid justify-items-start gap-3 p-6`}>
              <p className="text-[15px] font-semibold text-muted">
                Siap mencoba? Tekan tombol di bawah untuk memulai sesi kuis.
              </p>
              <button disabled={busy} onClick={start} className={btnPrimary}>
                {busy ? "Memuat…" : "Mulai kuis"}
              </button>
            </section>
          )}

          {run && (
            <>
              <p className="rounded-[14px] bg-sky-soft px-3.5 py-2.5 text-sm font-bold text-ink">
                Nilai lulus: {run.pass_score}. Sesi berakhir{" "}
                {new Date(run.expires_at).toLocaleString("id-ID")}.
              </p>

              {run.questions.map((q, i) => {
                const fb = result?.feedback.find(
                  (f) => f.question_id === q.id,
                );
                return (
                  <fieldset
                    disabled={!!result || busy}
                    key={q.id}
                    className={`${panel} min-w-0 p-6`}
                  >
                    <legend className="flex items-center gap-3 px-2 font-heading text-[17px] font-extrabold">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-sm text-brand">
                        {i + 1}
                      </span>
                      {q.prompt}
                    </legend>

                    <div className="mt-3 flex flex-col gap-2.5">
                      {q.options.map((option, index) => {
                        const selected = answers[q.id] === index;
                        return (
                          <label
                            key={index}
                            className={`flex cursor-pointer items-center gap-3 rounded-[14px] border-2 px-4 py-3 text-[15px] font-semibold transition-colors ${selected
                              ? "border-sky-dark bg-sky-soft"
                              : "border-line bg-page hover:bg-sky-soft"
                              }`}
                          >
                            <input
                              type="radio"
                              name={`q${q.id}`}
                              className="size-4 shrink-0 accent-brand"
                              checked={selected}
                              onChange={() =>
                                setAnswers((v) => ({ ...v, [q.id]: index }))
                              }
                            />
                            {option}
                          </label>
                        );
                      })}
                    </div>

                    {fb && (
                      <p
                        className={`mt-4 rounded-[14px] px-3.5 py-2.5 text-sm font-bold ${fb.correct
                          ? "bg-sky-soft text-ink"
                          : "bg-brand-soft text-brand"
                          }`}
                      >
                        {fb.correct ? "Benar" : "Belum tepat"}: {fb.explanation}
                      </p>
                    )}
                  </fieldset>
                );
              })}

              {!result && (
                <button
                  disabled={busy || answered !== total}
                  onClick={submit}
                  className={`${btnPrimary} self-start`}
                >
                  {busy ? "Mengirim…" : "Kirim jawaban"}
                </button>
              )}
            </>
          )}

          {/* Hasil */}
          {result && (
            <section role="status" className={`${panel} p-6 text-center`}>
              <span
                className={`inline-block rounded-full px-4 py-1 font-heading text-sm font-extrabold ${result.passed
                  ? "bg-gold-soft text-ink"
                  : "bg-brand-soft text-brand"
                  }`}
              >
                {result.passed ? "Lulus" : "Coba lagi"}
              </span>
              <h2 className="mt-3 font-heading text-[44px] font-extrabold leading-none">
                {result.score}
              </h2>
              <p className="mt-2 text-[15px] font-semibold text-muted">
                +{result.xp_awarded} XP
                {result.certificate_id
                  ? " · Sertifikat tersedia di profil"
                  : ""}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                <button disabled={busy} onClick={start} className={btnGhost}>
                  Ulangi kuis
                </button>
                <button type="button" onClick={backToModule} className={btnPrimary}>
                  Kembali ke modul
                </button>
              </div>
            </section>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-[14px] bg-brand-soft px-3.5 py-2.5 text-sm font-bold text-brand"
            >
              {error}
            </p>
          )}
        </div>
      </main>

      <RightPanel />
    </div>
  );
}
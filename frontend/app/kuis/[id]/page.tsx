"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type QuizRun, type QuizResult } from "@/lib/api";
export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
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
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/dashboard" className="text-brand underline">
        ← Pembelajaran
      </Link>
      <h1 className="text-3xl font-bold">Latihan SIMULA</h1>
      {!run && (
        <button
          disabled={busy}
          onClick={start}
          className="rounded-xl bg-brand p-4 text-white"
        >
          {busy ? "Memuat…" : "Mulai kuis"}
        </button>
      )}
      {run && (
        <>
          <p>
            Nilai lulus: {run.pass_score}. Sesi berakhir{" "}
            {new Date(run.expires_at).toLocaleString("id-ID")}.
          </p>
          {run.questions.map((q, i) => (
            <fieldset
              disabled={!!result || busy}
              key={q.id}
              className="rounded-2xl border-2 border-line bg-surface p-6"
            >
              <legend className="px-2 font-bold">
                {i + 1}. {q.prompt}
              </legend>
              {q.options.map((option, index) => (
                <label className="my-3 flex gap-3" key={index}>
                  <input
                    type="radio"
                    name={`q${q.id}`}
                    checked={answers[q.id] === index}
                    onChange={() =>
                      setAnswers((v) => ({ ...v, [q.id]: index }))
                    }
                  />
                  {option}
                </label>
              ))}
              {result && (
                <p className="mt-3 font-bold">
                  {result.feedback.find((f) => f.question_id === q.id)?.correct
                    ? "Benar"
                    : "Belum tepat"}
                  :{" "}
                  {
                    result.feedback.find((f) => f.question_id === q.id)
                      ?.explanation
                  }
                </p>
              )}
            </fieldset>
          ))}
          {!result && (
            <button
              disabled={
                busy || Object.keys(answers).length !== run.questions.length
              }
              onClick={submit}
              className="rounded-xl bg-brand p-4 text-white disabled:opacity-50"
            >
              {busy ? "Mengirim…" : "Kirim jawaban"}
            </button>
          )}
        </>
      )}
      {result && (
        <section role="status" className="rounded-xl border-2 border-line p-6">
          <h2 className="text-2xl font-bold">
            Nilai {result.score} — {result.passed ? "Lulus" : "Coba lagi"}
          </h2>
          <p>
            +{result.xp_awarded} XP
            {result.certificate_id ? " · Sertifikat tersedia di profil" : ""}
          </p>
          <button disabled={busy} onClick={start} className="mt-3 underline">
            Ulangi kuis
          </button>
        </section>
      )}
      {error && (
        <p role="alert" className="text-brand">
          {error}
        </p>
      )}
    </main>
  );
}

"use client";
/* Question images come from the content API; native <img> avoids Next image host configuration. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type QuizRun, type QuizResult } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
import { CheckIcon, CloseIcon } from "@/components/Icons";

type QuizDetail = {
  id: number;
  module_id: number;
  title: string;
  kind: string;
  pass_score: number;
  questions: { id: number }[];
};
type Check = {
  question_id: number;
  answer: number;
  correct: boolean;
  correct_index: number;
  explanation: string;
};
type Question = QuizRun["questions"][number];

const kindLabel: Record<string, string> = {
  PRE: "TES AWAL",
  POST: "TES AKHIR",
};

/* Tombol 3D seperti desain Figma (PERIKSA / LANJUT / LOMPATI). */
const btnBase =
  "min-w-[136px] cursor-pointer rounded-[14px] px-8 py-3.5 font-heading text-[15px] font-extrabold uppercase tracking-[0.4px] transition active:translate-y-[4px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0";
const btnRed = `${btnBase} bg-brand text-white shadow-[0_4px_0_#b71c1c]`;
const btnBlue = `${btnBase} bg-sky-dark text-white shadow-[0_4px_0_#1565c0]`;
const btnGhost = `${btnBase} border-2 border-line bg-surface text-muted shadow-[0_4px_0_var(--border)]`;

function optionClass(state: "idle" | "selected" | "right" | "wrong") {
  const base =
    "relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] border-2 text-left font-bold transition disabled:cursor-default";
  return {
    idle: `${base} border-line bg-surface text-ink shadow-[0_4px_0_var(--border)] enabled:hover:bg-sky-soft/50`,
    selected: `${base} border-sky-dark bg-sky-soft text-ink shadow-[0_4px_0_var(--blue-dark)]`,
    right: `${base} border-sky-dark bg-sky-soft text-ink shadow-[0_4px_0_var(--blue-dark)]`,
    wrong: `${base} border-brand bg-brand-soft text-ink shadow-[0_4px_0_var(--red)]`,
  }[state];
}

function KeyBadge({ n }: { n: number }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-md border-2 border-line bg-surface text-[11px] font-black text-muted">
      {n}
    </span>
  );
}

function TopBar({
  exitHref,
  progress,
  label,
}: {
  exitHref: string;
  progress: number;
  label?: string;
}) {
  return (
    <header className="mx-auto flex w-[min(1000px,calc(100%-32px))] items-center gap-4 pt-5">
      <Link
        href={exitHref}
        aria-label="Keluar dari kuis"
        className="grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-line/60"
      >
        <CloseIcon size={22} />
      </Link>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-4 flex-1 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full min-w-4 rounded-full bg-sky-dark transition-[width] duration-500"
          style={{ width: `${Math.max(progress * 100, 2)}%` }}
        />
      </div>
      {label && (
        <span className="shrink-0 font-heading text-sm font-extrabold text-muted">
          {label}
        </span>
      )}
    </header>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-full bg-brand-soft text-sm text-gold">
        ★
      </span>
      <span className="font-heading text-xs font-extrabold tracking-[0.4px] text-brand">
        {text}
      </span>
    </div>
  );
}

function Options({
  q,
  selected,
  check,
  onSelect,
}: {
  q: Question;
  selected: number | null;
  check: Check | null;
  onSelect: (i: number) => void;
}) {
  const images = (q.option_images || []).some(Boolean);
  const state = (i: number) =>
    check
      ? i === check.answer && !check.correct
        ? "wrong"
        : i === check.correct_index
          ? "right"
          : "idle"
      : i === selected
        ? "selected"
        : "idle";
  return (
    <div
      role="radiogroup"
      aria-label="Pilihan jawaban"
      className={
        images
          ? "mt-6 grid grid-cols-3 gap-3 max-[560px]:grid-cols-2"
          : "mt-6 grid gap-3"
      }
    >
      {q.options.map((option, i) => (
        <button
          key={i}
          role="radio"
          aria-checked={selected === i}
          disabled={!!check}
          onClick={() => onSelect(i)}
          className={`${optionClass(state(i))} ${
            images ? "aspect-square flex-col justify-center p-4" : "px-4 py-3.5"
          }`}
        >
          {images && q.option_images?.[i] ? (
            <img
              src={q.option_images[i]!}
              alt={option}
              className="max-h-[70%] max-w-full object-contain"
            />
          ) : null}
          <span className={images ? "text-center text-sm" : "text-[15px]"}>
            {option}
          </span>
          <span className={images ? "absolute bottom-2.5 right-2.5" : ""}>
            <KeyBadge n={i + 1} />
          </span>
        </button>
      ))}
    </div>
  );
}

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useApiData<QuizDetail>(`/quizzes/${id}`);
  const quiz = detail.data;
  const [run, setRun] = useState<QuizRun | null>(null);
  const [queue, setQueue] = useState<number[]>([]); // indeks soal yang belum diperiksa
  const [selected, setSelected] = useState<number | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [checks, setChecks] = useState<Record<number, Check>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const exitHref = quiz ? `/belajar/${quiz.module_id}` : "/dashboard";
  const q = run && queue.length ? run.questions[queue[0]] : null;
  const total = run?.questions.length || quiz?.questions.length || 0;
  const done = Object.keys(checks).length;

  async function start() {
    setBusy(true);
    setError("");
    try {
      const r = await api<QuizRun>(`/quizzes/${id}/runs`, { method: "POST" });
      setRun(r);
      setQueue(r.questions.map((_, i) => i));
      setChecks({});
      setCheck(null);
      setSelected(null);
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const periksa = useCallback(async () => {
    if (!run || !q || selected === null || check) return;
    setBusy(true);
    setError("");
    try {
      const c = await api<Check>(`/quizzes/${id}/runs/${run.id}/check`, {
        method: "POST",
        body: JSON.stringify({ question_id: q.id, answer: selected }),
      });
      setCheck(c);
      setChecks((v) => ({ ...v, [q.id]: c }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [check, id, q, run, selected]);

  const lanjut = useCallback(async () => {
    if (!run || !check) return;
    const rest = queue.slice(1);
    setCheck(null);
    setSelected(null);
    if (rest.length) {
      setQueue(rest);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const answers = Object.fromEntries(
        Object.values(checks).map((c) => [c.question_id, c.answer]),
      );
      setResult(
        await api<QuizResult>(`/quizzes/${id}/runs/${run.id}/submit`, {
          method: "POST",
          body: JSON.stringify({ answers }),
        }),
      );
      setQueue([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [check, checks, id, queue, run]);

  function lompati() {
    if (check || queue.length < 2) return;
    setQueue([...queue.slice(1), queue[0]]);
    setSelected(null);
  }

  // Keyboard: angka memilih jawaban, Enter = Periksa / Lanjut.
  useEffect(() => {
    if (!q) return;
    function onKey(e: KeyboardEvent) {
      if (busy) return;
      const n = Number(e.key);
      if (!check && n >= 1 && n <= (q?.options.length || 0)) setSelected(n - 1);
      if (e.key === "Enter") {
        e.preventDefault();
        if (check) lanjut();
        else periksa();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, check, lanjut, periksa, q]);

  /* ---------- Layar hasil ---------- */
  if (result) {
    const correct = result.feedback.filter((f) => f.correct).length;
    return (
      <div className="min-h-screen bg-page">
        <TopBar exitHref={exitHref} progress={1} />
        <main className="mx-auto mt-14 w-[min(540px,calc(100%-32px))] text-center">
          <div
            className={`mx-auto grid size-36 place-items-center rounded-full border-[6px] ${
              result.passed
                ? "border-gold bg-gold-soft"
                : "border-brand bg-brand-soft"
            }`}
          >
            <span className="font-heading text-5xl font-extrabold text-ink">
              {result.score}
            </span>
          </div>
          <h1 className="mt-6 font-heading text-[28px] font-extrabold">
            {result.passed ? "Hebat, kamu lulus!" : "Belum lulus, ayo coba lagi!"}
          </h1>
          <p className="mt-2 font-bold text-muted">
            {correct} dari {result.feedback.length} jawaban benar · Nilai lulus{" "}
            {run?.pass_score}
          </p>
          {(result.xp_awarded > 0 || result.certificate_id) && (
            <p className="mt-3 inline-block rounded-full bg-sky-soft px-4 py-1.5 font-heading text-sm font-extrabold text-sky-dark">
              {result.xp_awarded > 0 && `+${result.xp_awarded} XP`}
              {result.xp_awarded > 0 && result.certificate_id && " · "}
              {result.certificate_id && "Sertifikat tersedia di profil"}
            </p>
          )}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button disabled={busy} onClick={start} className={btnGhost}>
              Ulangi
            </button>
            <Link href={exitHref} className={btnRed}>
              Kembali ke modul
            </Link>
          </div>
        </main>
      </div>
    );
  }

  /* ---------- Layar pembuka ---------- */
  if (!run || !q) {
    return (
      <div className="min-h-screen bg-page">
        <TopBar exitHref={exitHref} progress={0} />
        <main className="mx-auto mt-14 w-[min(540px,calc(100%-32px))]">
          <ApiState
            loading={detail.loading}
            error={detail.error}
            retry={detail.reload}
          />
          {quiz && (
            <div className="rounded-[20px] border-2 border-line bg-surface p-8 text-center shadow-pop">
              <div className="flex justify-center">
                <Chip text={kindLabel[quiz.kind] || "KUIS"} />
              </div>
              <h1 className="mt-4 font-heading text-[26px] font-extrabold leading-tight">
                {quiz.title}
              </h1>
              <p className="mt-2 font-bold text-muted">
                {quiz.questions.length} soal · Nilai lulus {quiz.pass_score}
              </p>
              <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-sm text-muted">
                <li>• Pilih satu jawaban, lalu tekan <b>Periksa</b>.</li>
                <li>• Jawaban yang sudah diperiksa tidak bisa diubah.</li>
                <li>• Bisa <b>Lompati</b> soal dan menjawabnya nanti.</li>
              </ul>
              <button
                disabled={busy}
                onClick={start}
                className={`${btnRed} mt-7`}
              >
                {busy ? "Memuat…" : "Mulai"}
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 text-center font-bold text-brand">
              {error}
            </p>
          )}
        </main>
      </div>
    );
  }

  /* ---------- Layar soal ---------- */
  const footer = check
    ? check.correct
      ? "bg-sky-soft"
      : "bg-brand-soft"
    : "border-t-2 border-line bg-page";

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <TopBar
        exitHref={exitHref}
        progress={done / total}
        label={`${Math.min(done + 1, total)}/${total}`}
      />

      <main className="mx-auto w-[min(540px,calc(100%-32px))] flex-1 pb-10 pt-10">
        <Chip text={kindLabel[quiz?.kind || ""] || "KUIS"} />
        <h1 className="mt-4 font-heading text-[24px] font-extrabold leading-snug">
          {q.prompt}
        </h1>
        {q.image_url && (
          <div className="mt-5 grid place-items-center rounded-[20px] bg-sky-soft p-6">
            <img
              src={q.image_url}
              alt="Ilustrasi pertanyaan"
              className="max-h-56 max-w-full object-contain"
            />
          </div>
        )}
        <Options
          q={q}
          selected={selected}
          check={check}
          onSelect={setSelected}
        />
        {error && (
          <p role="alert" className="mt-4 font-bold text-brand">
            {error}
          </p>
        )}
      </main>

      <footer className={`sticky bottom-0 ${footer} transition-colors`}>
        <div className="mx-auto flex w-[min(1000px,calc(100%-32px))] items-center justify-between gap-4 py-6 max-[560px]:flex-col max-[560px]:items-stretch">
          {check ? (
            <div role="status" className="flex items-center gap-4">
              <span
                className={`grid size-14 shrink-0 place-items-center rounded-full bg-surface ${
                  check.correct ? "text-sky-dark" : "text-brand"
                }`}
              >
                {check.correct ? <CheckIcon size={28} /> : <CloseIcon size={24} />}
              </span>
              <div>
                <p
                  className={`font-heading text-xl font-extrabold ${
                    check.correct ? "text-sky-dark" : "text-brand"
                  }`}
                >
                  {check.correct ? "Hebat!" : "Belum tepat"}
                </p>
                <p className="text-sm font-semibold text-ink">
                  {!check.correct &&
                    `Jawaban benar: ${q.options[check.correct_index]}. `}
                  {check.explanation}
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={lompati}
              disabled={busy || queue.length < 2}
              className={btnGhost}
            >
              Lompati
            </button>
          )}
          {check ? (
            <button
              onClick={lanjut}
              disabled={busy}
              className={check.correct ? btnBlue : btnRed}
            >
              {busy ? "Mengirim…" : queue.length > 1 ? "Lanjut" : "Selesai"}
            </button>
          ) : (
            <button
              onClick={periksa}
              disabled={busy || selected === null}
              className={btnRed}
            >
              {busy ? "Memeriksa…" : "Periksa"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

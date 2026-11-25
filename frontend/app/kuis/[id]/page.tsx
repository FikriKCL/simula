"use client";
/* Question images come from the content API; native <img> avoids Next image host configuration. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type QuizRun, type QuizResult } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
import { CheckIcon, CloseIcon } from "@/components/Icons";
import { PikoAvatar } from "@/components/PikoAvatar";

type QuizDetail = {
  id: number;
  module_id: number;
  title: string;
  kind: string;
  pass_score: number;
  questions: { id: number }[];
};

type QType =
  | "single"
  | "image_choice"
  | "guess"
  | "situation"
  | "true_false"
  | "multi"
  | "order"
  | "match";

/** Jawaban: angka untuk soal tunggal, array untuk multi / urutan / pasangan. */
type Answer = number | number[];

type Check = {
  question_id: number;
  answer: Answer;
  correct: boolean;
  correct_index: Answer;
  explanation: string;
};

/** Field tambahan per tipe soal (lihat tabel kontrak data). */
type QuestionExtra = {
  type?: QType;
  question_type?: string;
  left_items?: string[];
  statement?: string;
  hint?: string;
  left_images?: (string | null)[];
};
type Question = QuizRun["questions"][number] & QuestionExtra;

type OptState = "idle" | "selected" | "right" | "wrong";

const kindLabel: Record<string, string> = {
  PRE: "TES AWAL",
  POST: "TES AKHIR",
};

const typeLabel: Partial<Record<QType, string>> = {
  match: "PASANGKAN",
  true_false: "BENAR ATAU SALAH",
  order: "URUTKAN LANGKAH",
  multi: "PILIH SEMUA YANG BENAR",
  situation: "SITUASI",
  guess: "TEBAK OBJEK",
  image_choice: "PILIH GAMBAR",
};

const backendType: Record<string, QType> = {
  TRUE_FALSE: "true_false",
  ORDERING: "order",
  MATCHING: "match",
  IMAGE_CHOICE: "image_choice",
};

function typeOf(q: Question): QType {
  if (q.type) return q.type;
  const mapped = q.question_type ? backendType[q.question_type] : undefined;
  if (mapped === "image_choice" && !(q.option_images || []).some(Boolean)) return "single";
  if (mapped) return mapped;
  return (q.option_images || []).some(Boolean) ? "image_choice" : "single";
}

/** Apakah jawaban sudah lengkap sehingga tombol Periksa boleh aktif? */
function isReady(q: Question, a: Answer | null): boolean {
  if (a === null) return false;
  const t = typeOf(q);
  if (t === "multi") return Array.isArray(a) && a.length > 0;
  if (t === "order") return Array.isArray(a) && a.length === q.options.length;
  if (t === "match")
    return Array.isArray(a) && a.length === q.options.length && a.every((v) => v >= 0);
  return typeof a === "number";
}

/** Teks jawaban benar untuk panel umpan balik. */
function correctLabel(q: Question, check: Check): string | null {
  const ci = check.correct_index;
  if (typeof ci === "number") return q.options[ci] ?? null;
  const t = typeOf(q);
  if (t === "multi") return ci.map((i) => q.options[i]).join(", ");
  if (t === "order") return ci.map((i) => q.options[i]).join(" → ");
  return null; // pasangan: cukup tampilkan penjelasan
}

/* Tombol 3D seperti desain Figma (PERIKSA / LANJUT / LOMPATI). */
const btnBase =
  "min-w-[136px] cursor-pointer rounded-[14px] px-8 py-3.5 font-heading text-[15px] font-extrabold uppercase tracking-[0.4px] transition active:translate-y-[4px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0";
const btnRed = `${btnBase} bg-brand text-white shadow-[0_4px_0_#b71c1c]`;
const btnBlue = `${btnBase} bg-sky-dark text-white shadow-[0_4px_0_#1565c0]`;
const btnGhost = `${btnBase} border-2 border-line bg-surface text-muted shadow-[0_4px_0_var(--border)]`;

function optionClass(state: OptState) {
  const base =
    "relative flex w-full cursor-pointer items-center justify-between gap-3 rounded-[14px] border-2 text-left font-bold transition disabled:cursor-default";
  return {
    idle: `${base} border-line bg-surface text-ink shadow-[0_4px_0_var(--border)] enabled:hover:bg-sky-soft/50`,
    selected: `${base} border-sky-dark bg-sky-soft text-ink shadow-[0_4px_0_var(--blue-dark)]`,
    right: `${base} border-sky-dark bg-sky-soft text-ink shadow-[0_4px_0_var(--blue-dark)]`,
    wrong: `${base} border-brand bg-brand-soft text-ink shadow-[0_4px_0_var(--red)]`,
  }[state];
}

/* ---------- Potongan tampilan kecil ---------- */

function KeyBadge({ n }: { n: number }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-md border-2 border-line bg-surface text-[11px] font-black text-muted">
      {n}
    </span>
  );
}

function PairBadge({ n }: { n: number }) {
  return (
    <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-sky-dark text-[11px] font-black text-white">
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

/* ============================================================
   Tipe soal
   ============================================================ */

type AreaProps = {
  q: Question;
  selected: Answer | null;
  check: Check | null;
  onSelect: (a: Answer | null) => void;
};

function singleState(i: number, selected: Answer | null, check: Check | null): OptState {
  if (check) {
    const ans = check.answer as number;
    const right = check.correct_index as number;
    return i === ans && !check.correct ? "wrong" : i === right ? "right" : "idle";
  }
  return i === selected ? "selected" : "idle";
}

/** Pilihan teks: single, tebak objek, situasi (ikon kecil di kiri bila ada). */
function ListOptions({ q, selected, check, onSelect }: AreaProps) {
  return (
    <div role="radiogroup" aria-label="Pilihan jawaban" className="mt-6 grid gap-3">
      {q.options.map((option, i) => {
        const icon = q.option_images?.[i];
        return (
          <button
            key={i}
            role="radio"
            aria-checked={selected === i}
            disabled={!!check}
            onClick={() => onSelect(i)}
            className={`${optionClass(singleState(i, selected, check))} px-4 py-3.5`}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              {icon && <img src={icon} alt="" className="size-9 shrink-0 object-contain" />}
              <span className="text-[15px]">{option}</span>
            </span>
            <KeyBadge n={i + 1} />
          </button>
        );
      })}
    </div>
  );
}

/** Pilih gambar (satu jawaban) dan pilih semua yang benar (beberapa jawaban). */
function ImageGrid({
  q,
  selected,
  check,
  onSelect,
  multi,
}: AreaProps & { multi: boolean }) {
  const picked = Array.isArray(selected) ? selected : [];

  function state(i: number): OptState {
    if (!multi) return singleState(i, selected, check);
    if (check) {
      const ans = check.answer as number[];
      const right = check.correct_index as number[];
      const isRight = right.includes(i);
      return ans.includes(i) && !isRight ? "wrong" : isRight ? "right" : "idle";
    }
    return picked.includes(i) ? "selected" : "idle";
  }

  function click(i: number) {
    if (!multi) return onSelect(i);
    onSelect(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]);
  }

  return (
    <>
      {multi && (
        <p className="mt-3 text-sm font-bold text-muted">
          {q.hint || "Boleh lebih dari satu jawaban."}
        </p>
      )}
      <div
        role={multi ? "group" : "radiogroup"}
        aria-label="Pilihan jawaban"
        className={`grid grid-cols-3 gap-3 ${multi ? "mt-3" : "mt-6"}`}
      >
        {q.options.map((option, i) => {
          const st = state(i);
          const on = st === "selected" || st === "right" || st === "wrong";
          return (
            <button
              key={i}
              role={multi ? "checkbox" : "radio"}
              aria-checked={multi ? picked.includes(i) : selected === i}
              aria-label={option}
              disabled={!!check}
              onClick={() => click(i)}
              className={`${optionClass(st)} aspect-[4/3] flex-col justify-center gap-1 p-3`}
            >
              {q.option_images?.[i] && (
                <img
                  src={q.option_images[i]!}
                  alt={multi ? "" : option}
                  className={`max-w-full object-contain ${multi ? "max-h-[55%]" : "max-h-[70%]"}`}
                />
              )}
              {multi && <span className="text-center text-sm">{option}</span>}

              {multi && on && (
                <span
                  className={`absolute right-2 top-2 grid size-6 place-items-center rounded-full text-white ${
                    st === "wrong" ? "bg-brand" : "bg-sky-dark"
                  }`}
                >
                  {st === "wrong" ? <CloseIcon size={12} /> : <CheckIcon size={12} />}
                </span>
              )}
              {!multi && (
                <span className="absolute bottom-2.5 right-2.5">
                  <KeyBadge n={i + 1} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

/** Benar atau salah: kartu pernyataan + dua tombol besar. */
function TrueFalseOptions({ q, selected, check, onSelect }: AreaProps) {
  const labels = [q.options[0] || "Benar", q.options[1] || "Salah"];
  return (
    <>
      {q.statement && (
        <div className="mt-5 rounded-[14px] border-2 border-line bg-surface px-6 py-5 font-heading text-[17px] font-extrabold shadow-[0_4px_0_var(--border)]">
          {q.statement}
        </div>
      )}
      <div role="radiogroup" aria-label="Pilihan jawaban" className="mt-3 grid grid-cols-2 gap-3">
        {labels.map((label, i) => (
          <button
            key={i}
            role="radio"
            aria-checked={selected === i}
            disabled={!!check}
            onClick={() => onSelect(i)}
            className={`${optionClass(singleState(i, selected, check))} flex-col justify-center gap-2 py-6`}
          >
            <span
              className={`grid size-14 place-items-center rounded-full text-white ${
                i === 0 ? "bg-sky-dark" : "bg-brand"
              }`}
            >
              {i === 0 ? <CheckIcon size={28} /> : <CloseIcon size={26} />}
            </span>
            <span className="font-heading text-lg font-extrabold uppercase">{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/** Urutkan langkah: ketuk langkah di bawah untuk mengisi slot, ketuk slot untuk mengembalikan. */
function OrderOptions({ q, selected, check, onSelect }: AreaProps) {
  const placed = Array.isArray(selected) ? selected : [];
  const n = q.options.length;
  const bank = q.options.map((_, i) => i).filter((i) => !placed.includes(i));

  function slotState(pos: number): OptState {
    if (!check) return "idle";
    return (check.correct_index as number[])[pos] === placed[pos] ? "right" : "wrong";
  }

  return (
    <div className="mt-6">
      <ol className="grid gap-2.5">
        {Array.from({ length: n }, (_, pos) => {
          const item = placed[pos];
          return (
            <li key={pos} className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-line font-heading text-xs font-black text-ink">
                {pos + 1}
              </span>
              {item === undefined ? (
                <div className="h-14 flex-1 rounded-[14px] border-2 border-dashed border-line" />
              ) : (
                <button
                  type="button"
                  disabled={!!check}
                  onClick={() => onSelect(placed.filter((x) => x !== item))}
                  aria-label={`Langkah ${pos + 1}: ${q.options[item]}. Ketuk untuk mengembalikan`}
                  className={`${optionClass(slotState(pos))} min-h-14 flex-1 px-4 py-3 text-[15px]`}
                >
                  {q.options[item]}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {bank.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2.5" aria-label="Langkah yang tersedia">
          {bank.map((i) => (
            <button
              key={i}
              type="button"
              disabled={!!check}
              onClick={() => onSelect([...placed, i])}
              className="cursor-pointer rounded-[12px] border-2 border-line bg-surface px-4 py-2.5 text-sm font-bold text-ink shadow-[0_3px_0_var(--border)] transition hover:bg-sky-soft/50 active:translate-y-[3px] active:shadow-none"
            >
              {q.options[i]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Pasangkan: ketuk gambar di kiri, lalu nama di kanan. Ketuk lagi untuk melepas pasangan. */
function MatchOptions({ q, selected, check, onSelect }: AreaProps) {
  const n = q.options.length;
  const pairs = Array.isArray(selected) ? selected : Array<number>(n).fill(-1);
  const [active, setActive] = useState<number | null>(null);
  const locked = !!check;
  const owner = (j: number) => pairs.indexOf(j);
  const verdict = (i: number): OptState =>
    (check!.answer as number[])[i] === (check!.correct_index as number[])[i] ? "right" : "wrong";

  function pickLeft(i: number) {
    if (locked) return;
    if (pairs[i] >= 0) {
      const next = [...pairs];
      next[i] = -1;
      onSelect(next);
    }
    setActive(i);
  }

  function pickRight(j: number) {
    if (locked) return;
    const next = [...pairs];
    const current = owner(j);
    if (current >= 0) next[current] = -1;
    if (active === null) {
      if (current >= 0) onSelect(next); // ketuk pasangan yang sudah ada = lepas
      return;
    }
    next[active] = j;
    onSelect(next);
    setActive(null);
  }

  const leftState = (i: number): OptState =>
    check ? verdict(i) : active === i || pairs[i] >= 0 ? "selected" : "idle";
  const rightState = (j: number): OptState => {
    const o = owner(j);
    if (check) return o >= 0 ? verdict(o) : "idle";
    return o >= 0 ? "selected" : "idle";
  };

  return (
    <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-0">
      <div className="grid gap-3" aria-label="Sisi kiri">
        {Array.from({ length: n }, (_, i) => (
          <button
            key={i}
            type="button"
            disabled={locked}
            onClick={() => pickLeft(i)}
            aria-label={q.left_items?.[i] || `Gambar ${i + 1}`}
            aria-pressed={active === i}
            className={`${optionClass(leftState(i))} h-[76px] justify-center px-3 ${
              active === i ? "ring-4 ring-sky-dark/30" : ""
            }`}
          >
            {q.left_images?.[i] ? (
              <img src={q.left_images[i]!} alt={q.left_items?.[i] || ""} className="max-h-[70%] max-w-full object-contain" />
            ) : (
              <span className="text-center text-[15px] leading-snug">{q.left_items?.[i]}</span>
            )}
            {pairs[i] >= 0 && <PairBadge n={i + 1} />}
          </button>
        ))}
      </div>

      <div className="grid gap-3" aria-label="Sisi kanan">
        {q.options.map((option, j) => (
          <button
            key={j}
            type="button"
            disabled={locked}
            onClick={() => pickRight(j)}
            className={`${optionClass(rightState(j))} h-[76px] justify-center px-3 text-center text-[15px]`}
          >
            {option}
            {owner(j) >= 0 && <PairBadge n={owner(j) + 1} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Memilih tampilan jawaban sesuai tipe soal. */
function AnswerArea(props: AreaProps) {
  switch (typeOf(props.q)) {
    case "true_false":
      return <TrueFalseOptions {...props} />;
    case "multi":
      return <ImageGrid {...props} multi />;
    case "image_choice":
      return <ImageGrid {...props} multi={false} />;
    case "order":
      return <OrderOptions {...props} />;
    case "match":
      return <MatchOptions {...props} />;
    default:
      return <ListOptions {...props} />; // single, guess, situation
  }
}

/* ============================================================
   Halaman kuis
   ============================================================ */

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useApiData<QuizDetail>(`/quizzes/${id}`);
  const quiz = detail.data;
  const [run, setRun] = useState<QuizRun | null>(null);
  const [queue, setQueue] = useState<number[]>([]); // indeks soal yang belum diperiksa
  const [selected, setSelected] = useState<Answer | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [checks, setChecks] = useState<Record<number, Check>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Keluar kembali ke halaman modul (level) tempat kuis ini berada
  const moduleHref = quiz ? `/belajar/${quiz.module_id}` : "/dashboard";
  const exitHref = moduleHref;
  const q: Question | null = run && queue.length ? (run.questions[queue[0]] as Question) : null;
  const total = run?.questions.length || quiz?.questions.length || 0;
  const done = Object.keys(checks).length;
  const ready = q ? isReady(q, selected) : false;

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
    if (!run || !q || !isReady(q, selected) || check) return;
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

  // Keyboard: angka memilih jawaban (untuk tipe pilihan), Enter = Periksa / Lanjut.
  useEffect(() => {
    if (!q) return;
    const current = q;
    const t = typeOf(current);
    function onKey(e: KeyboardEvent) {
      if (busy) return;
      const n = Number(e.key);
      const count = current.options.length;
      if (!check && n >= 1 && n <= count) {
        if (t === "multi") {
          setSelected((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.includes(n - 1) ? list.filter((x) => x !== n - 1) : [...list, n - 1];
          });
        } else if (t !== "order" && t !== "match") {
          setSelected(n - 1);
        }
      }
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
          {result.passed && quiz?.kind === "POST" && (
            <p className="mt-4 font-bold text-sky-dark">
              Level berikutnya sudah terbuka di jalur belajar.
            </p>
          )}
          {!result.passed && (
            <p className="mt-4 font-semibold text-muted">
              Baca lagi materinya, lalu ulangi kuis. Nilai terbaikmu tetap tersimpan.
            </p>
          )}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button disabled={busy} onClick={start} className={btnGhost}>
              Ulangi
            </button>
            <Link href={moduleHref} className={result.passed && quiz?.kind === "POST" ? btnGhost : btnRed}>
              Kembali ke modul
            </Link>
            {result.passed && quiz?.kind === "POST" && (
              <Link href="/dashboard" className={btnRed}>
                Lanjut level berikutnya
              </Link>
            )}
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
                <li>• Jawab soal, lalu tekan <b>Periksa</b>.</li>
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
            <div role="alert" className="mt-4 rounded-[14px] border-2 border-brand/30 bg-brand-soft px-4 py-3 text-center font-bold text-brand">
              {error}
              {quiz && (
                <Link href={moduleHref} className="mt-2 block underline">
                  Buka halaman modul
                </Link>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  /* ---------- Layar soal ---------- */
  const type = typeOf(q);
  const chipText = typeLabel[type] || kindLabel[quiz?.kind || ""] || "KUIS";
  const footer = check
    ? check.correct
      ? "bg-sky-soft"
      : "bg-brand-soft"
    : "border-t-2 border-line bg-page";
  const rightAnswer = check && !check.correct ? correctLabel(q, check) : null;

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <TopBar
        exitHref={exitHref}
        progress={done / total}
        label={`${Math.min(done + 1, total)}/${total}`}
      />

      <main className="mx-auto w-[min(540px,calc(100%-32px))] flex-1 pb-10 pt-10 min-[1000px]:w-[min(760px,calc(100%-32px))]">
        <Chip text={chipText} />

        {type === "situation" ? (
          <div className="mt-4 flex items-center gap-3">
            <div className="shrink-0">
              <PikoAvatar size={72} />
            </div>
            <h1 className="relative rounded-[16px] border-2 border-line bg-surface px-4 py-3 font-heading text-[17px] font-extrabold leading-snug">
              {q.prompt}
            </h1>
          </div>
        ) : (
          <h1 className="mt-4 font-heading text-[24px] font-extrabold leading-snug">
            {q.prompt}
          </h1>
        )}

        {(type === "order" || type === "match") && !check && (
          <p className="mt-2 text-sm font-bold text-muted">
            {type === "order"
              ? "Ketuk langkah di bawah sesuai urutan yang benar. Ketuk lagi untuk mengembalikan."
              : "Ketuk kotak kiri, lalu ketuk pasangannya di kanan."}
          </p>
        )}

        {q.image_url && (
          <div className="mt-5 grid min-h-[190px] place-items-center rounded-[20px] bg-sky-soft p-6">
            <img
              src={q.image_url}
              alt="Ilustrasi pertanyaan"
              className="max-h-40 max-w-full object-contain"
            />
          </div>
        )}

        {/* key = id soal: state internal (mis. pasangan aktif) ikut reset di soal berikutnya */}
        <AnswerArea
          key={q.id}
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
                  {rightAnswer && `Jawaban benar: ${rightAnswer}. `}
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
              disabled={busy || !ready}
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
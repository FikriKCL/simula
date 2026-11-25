"use client";

import React, { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { ContentTree, LearningMaterial, Module, QuizQuestion } from "../types";
import { PlusIcon, TrashIcon } from "./AdminIcons";
import { FieldError, FormErrorSummary, SaveError, errorRing, fieldProps, type FieldErrors } from "./FormErrors";

type Props = {
  tree?: ContentTree;
  materials: LearningMaterial[];
  questions: QuizQuestion[];
  /** Jalankan perubahan lalu muat ulang workspace (toast + error ditangani halaman admin). */
  run: (action: () => Promise<unknown>, message: string) => Promise<void>;
  onGoto: (tab: "materi" | "soal") => void;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  PUBLISHED: { label: "Terbit", cls: "bg-[#E7F8EE] text-[#15803D] border-[#86EFAC]" },
  DRAFT: { label: "Draf", cls: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300" },
  PENDING: { label: "Menunggu tinjauan", cls: "bg-[#FEF9C3] text-[#A16207] border-[#FDE047]" },
  REJECTED: { label: "Ditolak", cls: "bg-[#FEECEB] text-[#E5252A] border-[#FCA5A5]" },
};

const field =
  "w-full h-10 px-3.5 rounded-[12px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-semibold text-[#1E293B] dark:text-white";
const label = "block text-xs font-extrabold text-[#1E293B] dark:text-slate-200 mb-1";
const btn =
  "inline-flex items-center gap-1.5 rounded-[12px] border-[1.5px] px-3 py-2 text-xs font-extrabold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";
const btnPrimary = `${btn} border-[#E5252A] bg-[#E5252A] text-white border-b-[3px] border-b-[#991B1B]`;
const btnSoft = `${btn} border-[#DCE3EC] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#334155] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700`;

type Form =
  | { kind: "level"; module?: Module; level: string; title: string; description: string }
  | { kind: "lesson"; module: Module; title: string; body: string };

export default function LevelView({ tree, materials, questions, run, onGoto }: Props) {
  const [topicId, setTopicId] = useState<number | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);

  const topics = tree?.topics || [];
  const activeTopic = topics.find((t) => t.id === topicId) || topics[0];
  const levels = useMemo(
    () => (tree?.modules || []).filter((m) => m.topic_id === activeTopic?.id).sort((a, b) => a.level - b.level),
    [tree, activeTopic],
  );
  const bad = (id: string) => (errors[id] ? ` ${errorRing}` : "");

  function stats(m: Module) {
    const lessons = (tree?.lessons || []).filter((l) => l.module_id === m.id).sort((a, b) => a.position - b.position);
    const lessonIds = new Set(lessons.map((l) => l.id));
    const quizzes = (tree?.quizzes || []).filter((q) => q.module_id === m.id);
    const count = (kind: "PRE" | "POST") =>
      questions.filter((q) => quizzes.some((z) => z.id === q.quizId && z.kind === kind)).length;
    const mats = materials.filter((x) => x.lessonId && lessonIds.has(x.lessonId)).length;
    const warnings: string[] = [];
    if (!lessons.length) warnings.push("Belum ada pelajaran");
    if (!mats) warnings.push("Belum ada materi");
    if (!count("POST")) warnings.push("Belum ada soal tes akhir (siswa langsung lulus level)");
    return { lessons, mats, pre: count("PRE"), post: count("POST"), warnings };
  }

  function openLevelForm(module?: Module) {
    const next = Math.max(0, ...levels.map((l) => l.level)) + 1;
    setForm({
      kind: "level",
      module,
      level: String(module?.level ?? next),
      title: module?.title ?? `${activeTopic?.name ?? "Level"} — Level ${next}`,
      description: module?.description ?? "",
    });
    setErrors({});
    setAttempt(0);
    setSaveError("");
  }

  function validate(f: Form): FieldErrors {
    const e: FieldErrors = {};
    if (f.title.trim().length < 3) e["lv-title"] = "Judul minimal 3 karakter.";
    if (f.kind === "level") {
      const n = Number(f.level);
      if (!Number.isInteger(n) || n < 1 || n > 1000) e["lv-level"] = "Nomor level harus angka 1–1000.";
      else if (levels.some((m) => m.level === n && m.id !== f.module?.id))
        e["lv-level"] = `Level ${n} sudah ada di topik ini.`;
      if (f.description.trim().length < 3) e["lv-desc"] = "Deskripsi minimal 3 karakter.";
    } else if (f.body.trim().length < 10) e["lv-body"] = "Pengantar pelajaran minimal 10 karakter.";
    return e;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || busy) return;
    const found = validate(form);
    setErrors(found);
    setAttempt((n) => n + 1);
    if (Object.keys(found).length) return;
    setBusy(true);
    setSaveError("");
    try {
      if (form.kind === "level") {
        const body = JSON.stringify({
          topic_id: activeTopic?.id,
          level: Number(form.level),
          title: form.title.trim(),
          description: form.description.trim(),
        });
        await run(
          () => api(form.module ? `/modules/${form.module.id}` : "/modules", { method: form.module ? "PUT" : "POST", body }),
          form.module ? "Level diperbarui." : "Level baru dibuat sebagai draf.",
        );
      } else {
        const position = Math.max(0, ...stats(form.module).lessons.map((l) => l.position)) + 1;
        await run(
          () =>
            api(`/modules/${form.module.id}/lessons`, {
              method: "POST",
              body: JSON.stringify({ title: form.title.trim(), body: form.body.trim(), position }),
            }),
          "Pelajaran ditambahkan.",
        );
      }
      setForm(null);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function action(m: Module, kind: "publish" | "unpublish") {
    if (
      kind === "unpublish" &&
      !window.confirm(`Tarik "${m.title}" ke draf? Siswa tidak bisa membukanya sampai diterbitkan lagi. Progres siswa tetap tersimpan.`)
    )
      return;
    try {
      await run(
        () => api(`/admin/modules/${m.id}/${kind}`, { method: "POST" }),
        kind === "publish" ? "Level diterbitkan dan tampil di jalur belajar siswa." : "Level ditarik ke draf.",
      );
    } catch {
      /* pesan error sudah tampil di halaman admin */
    }
  }

  async function removeLesson(lid: number, title: string) {
    if (!window.confirm(`Hapus pelajaran "${title}" beserta materinya?`)) return;
    try {
      await run(() => api(`/lessons/${lid}`, { method: "DELETE" }), "Pelajaran dihapus.");
    } catch {
      /* ditampilkan halaman admin */
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#43A8F6] border-b-[4px] border-[#2589D8] rounded-[20px] px-5 py-4 md:px-7 md:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-black text-[#1E293B] tracking-tight leading-tight">Kelola Level</h1>
          <p className="text-xs md:text-[13px] font-bold text-[#1E293B]/90 mt-0.5">
            Level yang terbit tampil di jalur belajar siswa, berurutan per topik
          </p>
        </div>
        <button
          type="button"
          onClick={() => openLevelForm()}
          className="shrink-0 bg-white hover:bg-slate-50 text-[#1E293B] font-extrabold text-xs md:text-[13px] px-3.5 py-2 md:px-4 md:py-2.5 rounded-[14px] border-[1.5px] border-[#1E293B] border-b-[3px] inline-flex items-center gap-1.5 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          Tambah level
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-[#DCE3EC] border-b-[3px] dark:border-slate-800 p-4 md:p-6">
        <div role="tablist" aria-label="Topik" className="flex flex-wrap gap-2 mb-5">
          {topics.map((t) => {
            const n = (tree?.modules || []).filter((m) => m.topic_id === t.id).length;
            const on = t.id === activeTopic?.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setTopicId(t.id);
                  setForm(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-extrabold cursor-pointer ${
                  on
                    ? "border-[#E5252A] bg-[#FEECEB] text-[#E5252A]"
                    : "border-[#DCE3EC] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {t.code} · {t.name}
                <span className="rounded-full bg-white/80 dark:bg-slate-900/60 px-1.5 text-[10px]">{n}</span>
              </button>
            );
          })}
        </div>

        {form && (
          <form
            onSubmit={submit}
            noValidate
            className="mb-5 space-y-3 rounded-[16px] border-[1.5px] border-[#43A8F6] bg-[#F3F9FF] dark:bg-slate-800/60 p-4"
          >
            <h2 className="text-sm font-black">
              {form.kind === "lesson"
                ? `Pelajaran baru di ${form.module.title}`
                : form.module
                  ? `Ubah ${form.module.title}`
                  : `Level baru · ${activeTopic?.name}`}
            </h2>
            <FormErrorSummary errors={errors} attempt={attempt} />
            {form.kind === "level" && (
              <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 max-[560px]:grid-cols-1">
                <div>
                  <label htmlFor="lv-level" className={label}>Nomor level</label>
                  <input
                    {...fieldProps("lv-level", errors)}
                    type="number"
                    min={1}
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    className={field + bad("lv-level")}
                  />
                  <FieldError id="lv-level" errors={errors} />
                </div>
                <div>
                  <label htmlFor="lv-title" className={label}>Judul level</label>
                  <input
                    {...fieldProps("lv-title", errors)}
                    value={form.title}
                    maxLength={200}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className={field + bad("lv-title")}
                  />
                  <FieldError id="lv-title" errors={errors} />
                </div>
              </div>
            )}
            {form.kind === "lesson" && (
              <div>
                <label htmlFor="lv-title" className={label}>Judul pelajaran</label>
                <input
                  {...fieldProps("lv-title", errors)}
                  value={form.title}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={field + bad("lv-title")}
                />
                <FieldError id="lv-title" errors={errors} />
              </div>
            )}
            <div>
              <label htmlFor={form.kind === "level" ? "lv-desc" : "lv-body"} className={label}>
                {form.kind === "level" ? "Deskripsi singkat (tampil di halaman modul)" : "Pengantar pelajaran (Markdown)"}
              </label>
              <textarea
                {...fieldProps(form.kind === "level" ? "lv-desc" : "lv-body", errors)}
                rows={3}
                value={form.kind === "level" ? form.description : form.body}
                onChange={(e) =>
                  setForm(form.kind === "level" ? { ...form, description: e.target.value } : { ...form, body: e.target.value })
                }
                className={`${field} !h-auto p-3${bad(form.kind === "level" ? "lv-desc" : "lv-body")}`}
              />
              <FieldError id={form.kind === "level" ? "lv-desc" : "lv-body"} errors={errors} />
            </div>
            <SaveError message={saveError} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnSoft} onClick={() => setForm(null)} disabled={busy}>
                Batal
              </button>
              <button className={btnPrimary} disabled={busy}>
                {busy ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        )}

        {!levels.length && (
          <p className="py-10 text-center text-sm font-bold text-slate-400">
            Belum ada level di topik ini. Tekan “Tambah level”.
          </p>
        )}

        <ol className="space-y-3">
          {levels.map((m) => {
            const s = stats(m);
            const st = STATUS[m.status] || STATUS.DRAFT;
            const editable = m.status === "DRAFT" || m.status === "REJECTED";
            return (
              <li key={m.id} className="rounded-[16px] border-[1.5px] border-[#DCE3EC] dark:border-slate-700 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#FEECEB] text-sm font-black text-[#E5252A]">
                      {m.level}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-[15px] text-[#1E293B] dark:text-white">{m.title}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#64748B]">
                        {s.lessons.length} pelajaran · {s.mats} materi · {s.pre} soal tes awal · {s.post} soal tes akhir
                      </p>
                      {s.warnings.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {s.warnings.map((w) => (
                            <li key={w} className="text-[11px] font-bold text-[#A16207]">⚠ {w}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.status === "PUBLISHED" ? (
                      <button type="button" className={btnSoft} onClick={() => action(m, "unpublish")}>
                        Tarik ke draf
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={btnPrimary}
                        disabled={!s.lessons.length}
                        title={s.lessons.length ? undefined : "Tambahkan pelajaran dulu"}
                        onClick={() => action(m, "publish")}
                      >
                        Terbitkan
                      </button>
                    )}
                    {editable && (
                      <button type="button" className={btnSoft} onClick={() => openLevelForm(m)}>
                        Ubah
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 border-t border-[#EEF2F6] dark:border-slate-800 pt-3">
                  {s.lessons.length > 0 && (
                    <ul className="mb-2.5 space-y-1.5">
                      {s.lessons.map((l, i) => (
                        <li key={l.id} className="flex items-center justify-between gap-2 text-[13px] font-semibold">
                          <span className="min-w-0 truncate">
                            <span className="text-[#94A3B8]">Pelajaran {i + 1}.</span> {l.title}
                          </span>
                          {editable && (
                            <button
                              type="button"
                              aria-label={`Hapus pelajaran ${l.title}`}
                              onClick={() => removeLesson(l.id, l.title)}
                              className="shrink-0 grid size-7 place-items-center rounded-[8px] text-[#E5252A] hover:bg-[#FEECEB] cursor-pointer"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {editable ? (
                      <button
                        type="button"
                        className={btnSoft}
                        onClick={() => {
                          setForm({ kind: "lesson", module: m, title: "", body: "" });
                          setErrors({});
                          setAttempt(0);
                          setSaveError("");
                        }}
                      >
                        <PlusIcon className="w-3.5 h-3.5" /> Pelajaran
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#94A3B8] self-center">
                        Tarik ke draf untuk mengubah pelajaran.
                      </span>
                    )}
                    <button type="button" className={btnSoft} onClick={() => onGoto("materi")}>
                      Kelola materi
                    </button>
                    <button type="button" className={btnSoft} onClick={() => onGoto("soal")}>
                      Kelola soal
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

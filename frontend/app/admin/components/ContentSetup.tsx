"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useApiData } from "@/components/ApiState";
import type { ContentTree, Module } from "../types";
import { button, input, panel, Message } from "./Shared";
import { FieldError, FormErrorSummary, errorRing, fieldProps, type FieldErrors } from "./FormErrors";
export default function ContentSetup({
  tree,
  selectedModule,
  onChange,
}: {
  tree: ContentTree;
  selectedModule?: Module;
  onChange: () => void;
}) {
  const me = useApiData<{ id: number }>("/users/me");
  const [form, setFormState] = useState<"module" | "lesson" | null>(null);
  // Ganti/tutup form: kesalahan lama ikut dihapus
  const setForm = (next: "module" | "lesson" | null) => {
    setFormState(next);
    setErrors({});
    setAttempt(0);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempt, setAttempt] = useState(0);
  const bad = (id: string) => (errors[id] ? ` ${errorRing}` : "");

  // Semua kesalahan sekaligus, termasuk level/urutan yang sudah dipakai
  function validate(f: FormData): FieldErrors {
    const e: FieldErrors = {};
    const title = String(f.get("title") || "").trim();
    const body = String(f.get("body") || "").trim();
    if (form === "module") {
      const level = Number(f.get("level"));
      const topicId = Number(f.get("topic_id"));
      if (!Number.isInteger(level) || level < 1 || level > 1000)
        e["setup-level"] = "Level harus angka 1–1000.";
      else if (tree.modules.some((m) => m.topic_id === topicId && m.level === level))
        e["setup-level"] = `Level ${level} sudah dipakai di topik ini. Pilih level lain.`;
    } else {
      const position = Number(f.get("position"));
      if (!Number.isInteger(position) || position < 1)
        e["setup-position"] = "Urutan pelajaran harus angka 1 atau lebih.";
      else if (tree.lessons.some((l) => l.module_id === selectedModule?.id && l.position === position))
        e["setup-position"] = `Urutan ${position} sudah dipakai di modul ini.`;
    }
    if (title.length < 3) e["setup-title"] = "Judul minimal 3 karakter.";
    const minBody = form === "module" ? 3 : 10;
    if (body.length < minBody)
      e["setup-body"] = `${form === "module" ? "Deskripsi" : "Pengantar pelajaran"} minimal ${minBody} karakter.`;
    return e;
  }

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const found = validate(f);
    setErrors(found);
    setAttempt((n) => n + 1);
    if (Object.keys(found).length) return;
    setBusy(true);
    setError("");
    try {
      if (form === "module")
        await api("/modules", {
          method: "POST",
          body: JSON.stringify({
            topic_id: Number(f.get("topic_id")),
            level: Number(f.get("level")),
            title: f.get("title"),
            description: f.get("body"),
          }),
        });
      else
        await api(`/modules/${selectedModule?.id}/lessons`, {
          method: "POST",
          body: JSON.stringify({
            title: f.get("title"),
            body: f.get("body"),
            position: Number(f.get("position")),
          }),
        });
      setForm(null);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function review(
    action: "submit-review" | "review",
    approved?: boolean,
  ) {
    if (!selectedModule) return;
    const note =
      action === "review"
        ? window.prompt("Catatan peninjauan (minimal 3 karakter):")
        : undefined;
    if (action === "review" && !note) return;
    setBusy(true);
    setError("");
    try {
      await api(`/modules/${selectedModule.id}/${action}`, {
        method: "POST",
        body:
          action === "review" ? JSON.stringify({ approved, note }) : undefined,
      });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const editable =
    selectedModule && ["DRAFT", "REJECTED"].includes(selectedModule.status);
  return (
    <section className={`${panel} mb-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={button}
          disabled={busy}
          onClick={() => setForm("module")}
        >
          Tambah modul
        </button>
        <button
          className={button}
          disabled={busy || !editable}
          onClick={() => setForm("lesson")}
        >
          Tambah pelajaran
        </button>
        {editable && (
          <button
            className={button}
            disabled={busy}
            onClick={() => review("submit-review")}
          >
            Ajukan peninjauan
          </button>
        )}
        {selectedModule?.status === "PENDING" && (
          <>
            <button
              className={button}
              disabled={busy || me.data?.id === selectedModule.created_by}
              onClick={() => review("review", true)}
            >
              Setujui & terbitkan
            </button>
            <button
              className={button}
              disabled={busy || me.data?.id === selectedModule.created_by}
              onClick={() => review("review", false)}
            >
              Tolak modul
            </button>
          </>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {selectedModule
          ? `Modul dipilih: ${selectedModule.title} (${selectedModule.status}). `
          : "Pilih atau buat modul. "}
        Materi hanya dapat diubah pada DRAFT/REJECTED. Publikasi memerlukan
        peninjau dengan akun berbeda dari pembuat.
      </p>
      <Message error={error} />
      {form && (
        <form
          onSubmit={create}
          noValidate
          onInput={(e) => {
            if (attempt) setErrors(validate(new FormData(e.currentTarget)));
          }}
          className="mt-4 grid gap-3"
        >
          <FormErrorSummary errors={errors} attempt={attempt} />
          <h2 className="font-bold">
            {form === "module" ? "Modul baru" : "Pelajaran baru"}
          </h2>
          {form === "module" ? (
            <>
              <label>
                Topik
                <select name="topic_id" className={input}>
                  {tree.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Level (unik per topik)
                <input
                  {...fieldProps("setup-level", errors)}
                  name="level"
                  type="number"
                  min={1}
                  max={1000}
                  defaultValue={1}
                  className={input + bad("setup-level")}
                />
                <FieldError id="setup-level" errors={errors} />
              </label>
            </>
          ) : (
            <label>
              Urutan pelajaran
              <input
                {...fieldProps("setup-position", errors)}
                name="position"
                type="number"
                min={1}
                defaultValue={
                  Math.max(
                    0,
                    ...tree.lessons
                      .filter((l) => l.module_id === selectedModule?.id)
                      .map((l) => l.position),
                  ) + 1
                }
                className={input + bad("setup-position")}
              />
              <FieldError id="setup-position" errors={errors} />
            </label>
          )}
          <label>
            Judul
            <input
              {...fieldProps("setup-title", errors)}
              name="title"
              maxLength={200}
              className={input + bad("setup-title")}
            />
            <FieldError id="setup-title" errors={errors} />
          </label>
          <label>
            {form === "module" ? "Deskripsi" : "Pengantar pelajaran"}
            <textarea
              {...fieldProps("setup-body", errors)}
              name="body"
              maxLength={form === "module" ? 5000 : 50000}
              className={input + bad("setup-body")}
            />
            <FieldError id="setup-body" errors={errors} />
          </label>
          <div className="flex gap-3">
            <button disabled={busy} className={button}>
              {busy ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              disabled={busy}
              className={button}
              onClick={() => setForm(null)}
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

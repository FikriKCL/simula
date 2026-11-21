"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useApiData } from "@/components/ApiState";
import type { ContentTree, Module } from "../types";
import { button, input, panel, Message } from "./Shared";
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
  const [form, setForm] = useState<"module" | "lesson" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
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
          ? `Modul dipilih: ${selectedModule.title} · ${selectedModule.status}. `
          : "Pilih atau buat modul. "}
        Materi hanya dapat diubah pada DRAFT/REJECTED. Publikasi memerlukan
        peninjau dengan akun berbeda dari pembuat.
      </p>
      <Message error={error} />
      {form && (
        <form onSubmit={create} className="mt-4 grid gap-3">
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
                  name="level"
                  type="number"
                  min={1}
                  max={1000}
                  required
                  defaultValue={1}
                  className={input}
                />
              </label>
            </>
          ) : (
            <label>
              Urutan pelajaran
              <input
                name="position"
                type="number"
                min={1}
                required
                defaultValue={
                  Math.max(
                    0,
                    ...tree.lessons
                      .filter((l) => l.module_id === selectedModule?.id)
                      .map((l) => l.position),
                  ) + 1
                }
                className={input}
              />
            </label>
          )}
          <label>
            Judul
            <input
              name="title"
              minLength={3}
              maxLength={200}
              required
              className={input}
            />
          </label>
          <label>
            {form === "module" ? "Deskripsi" : "Pengantar pelajaran"}
            <textarea
              name="body"
              minLength={form === "module" ? 3 : 10}
              maxLength={form === "module" ? 5000 : 50000}
              required
              className={input}
            />
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

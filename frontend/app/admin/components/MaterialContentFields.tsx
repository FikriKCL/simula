"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import { api, API_URL } from "@/lib/api";
import type { LearningMaterial, ContentTree, TopicCode, MaterialType } from "../types";
import { FieldError, errorRing, fieldProps, isHttpUrl, type FieldErrors } from "./FormErrors";

const control = "w-full h-10 px-3.5 rounded-[12px] border-[1.5px] border-navy text-sm font-semibold";
const label = "block text-xs font-extrabold text-navy dark:text-slate-200 mb-1";
const smallBtn =
  "rounded-[10px] border border-edge px-2.5 py-1 font-bold text-slate-ink hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_URL = /(^|\/\/|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i;

/** Aturan sama dengan backend (schemas/content.py), dicek dulu agar semua kesalahan terlihat sekaligus. */
export function validateMaterial(
  title: string,
  type: MaterialType,
  draft: Partial<LearningMaterial>,
): FieldErrors {
  const e: FieldErrors = {};
  const t = title.trim();
  if (t.length < 3) e["mat-title"] = "Judul materi minimal 3 karakter.";
  else if (t.length > 200) e["mat-title"] = "Judul materi maksimal 200 karakter.";
  if (!draft.lessonId) e["mat-lesson"] = "Pilih pelajaran tujuan.";
  if ((draft.body || "").trim().length < 10) e["mat-body"] = "Isi artikel / deskripsi minimal 10 karakter.";
  if (draft.position !== undefined && draft.position < 1) e["mat-position"] = "Urutan harus 1 atau lebih.";
  if (type === "VIDEO" && !draft.url) {
    const id = (draft.videoId || "").trim();
    const provider = draft.videoProvider || "youtube";
    if (!id) e["mat-video"] = "Isi ID atau URL video.";
    else if (provider === "youtube" && !YOUTUBE_ID.test(id) && !YOUTUBE_URL.test(id))
      e["mat-video"] = "ID YouTube harus 11 karakter, atau tempel URL YouTube lengkap.";
    else if (provider === "vimeo" && !/^\d{1,15}$/.test(id)) e["mat-video"] = "ID Vimeo hanya berisi angka.";
  }
  if (type === "VIDEO" && draft.durationSeconds != null && draft.durationSeconds < 1)
    e["mat-duration"] = "Durasi harus lebih dari 0 detik.";
  if (type === "PDF" && !isHttpUrl(draft.url || "")) e["mat-url"] = "URL PDF harus diawali http:// atau https://.";
  if (type === "KOMIK") {
    const pages = draft.pages || [];
    if (!pages.length) e["mat-pages"] = "Komik memerlukan minimal satu halaman.";
    pages.forEach((p, i) => {
      if (!isHttpUrl(p.image_url)) e[`mat-page-${i}-image`] = `Halaman ${i + 1}: isi URL gambar atau unggah gambar.`;
      if (p.alt.trim().length < 3) e[`mat-page-${i}-alt`] = `Halaman ${i + 1}: teks alternatif minimal 3 karakter.`;
    });
  }
  return e;
}

export default function MaterialContentFields({
  value,
  onChange,
  tree,
  topic,
  type,
  editing,
  onManage,
  onUploadingChange,
  errors = {},
}: {
  value: Partial<LearningMaterial>;
  onChange: Dispatch<SetStateAction<Partial<LearningMaterial>>>;
  tree?: ContentTree;
  topic: TopicCode;
  type: MaterialType;
  editing: boolean;
  onManage: () => void;
  onUploadingChange: (value: boolean) => void;
  errors?: FieldErrors;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const bad = (id: string) => (errors[id] ? ` ${errorRing}` : "");

  const topicId = tree?.topics.find((t) => t.code === topic)?.id;
  const lessons =
    tree?.lessons.filter((l) => tree.modules.some((m) => m.id === l.module_id && m.topic_id === topicId)) || [];
  const pages = value.pages || [];
  function pageChange(i: number, key: "image_url" | "alt" | "text", text: string) {
    onChange((old) => ({ ...old, pages: (old.pages || []).map((p, n) => (n === i ? { ...p, [key]: text } : p)) }));
  }
  async function upload(i: number, file: File) {
    setUploading(true);
    onUploadingChange(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api<{ path: string }>("/admin/uploads/images", { method: "POST", body: form });
      pageChange(i, "image_url", new URL(r.path, API_URL).href);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }
  }
  const move = (from: number, to: number) => {
    const next = [...pages];
    [next[from], next[to]] = [next[to], next[from]];
    onChange({ ...value, pages: next });
  };

  return (
    <>
      <div>
        <label htmlFor="mat-lesson" className={label}>Pelajaran tujuan</label>
        <select
          {...fieldProps("mat-lesson", errors)}
          className={control + bad("mat-lesson")}
          value={value.lessonId || ""}
          disabled={editing}
          onChange={(e) => {
            const lessonId = Number(e.target.value);
            const rows = tree?.lessons.find((l) => l.id === lessonId);
            onChange({ ...value, lessonId, position: undefined, moduleId: rows?.module_id });
          }}
        >
          <option value="">Pilih modul / pelajaran</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {tree?.modules.find((m) => m.id === l.module_id)?.title}: {l.title}
            </option>
          ))}
        </select>
        {!lessons.length && !editing && (
          <p className="mt-1 text-xs font-semibold text-slate-muted">
            Belum ada pelajaran di kategori ini. Buat lewat “Kelola modul dan pelajaran”.
          </p>
        )}
        <FieldError id="mat-lesson" errors={errors} />
      </div>

      <div>
        <label htmlFor="mat-body" className={label}>Isi artikel / deskripsi materi (Markdown)</label>
        <textarea
          {...fieldProps("mat-body", errors)}
          value={value.body || ""}
          onChange={(e) => onChange({ ...value, body: e.target.value })}
          maxLength={1000000}
          rows={6}
          className={control + " !h-auto p-3" + bad("mat-body")}
        />
        <FieldError id="mat-body" errors={errors} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="mat-thumb" className={label}>Thumbnail</label>
          <select
            id="mat-thumb"
            className={control}
            value={value.thumbnailKey || ""}
            onChange={(e) => onChange({ ...value, thumbnailKey: e.target.value || null })}
          >
            <option value="">Otomatis</option>
            {["plaster", "kit", "hand", "heart", "roll"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="mat-position" className={label}>Urutan</label>
          <input
            {...fieldProps("mat-position", errors)}
            type="number"
            min={1}
            className={control + bad("mat-position")}
            value={value.position || ""}
            placeholder="Otomatis"
            onChange={(e) => onChange({ ...value, position: Number(e.target.value) || undefined })}
          />
          <FieldError id="mat-position" errors={errors} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.required ?? true}
          onChange={(e) => onChange({ ...value, required: e.target.checked })}
        />
        Materi wajib
      </label>

      {type === "VIDEO" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mat-provider" className={label}>Provider</label>
              <select
                id="mat-provider"
                className={control}
                value={value.videoProvider || "youtube"}
                onChange={(e) => onChange({ ...value, videoProvider: e.target.value as "youtube" | "vimeo" })}
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
              </select>
            </div>
            <div>
              <label htmlFor="mat-video" className={label}>
                {(value.videoProvider || "youtube") === "youtube" ? "ID atau URL video YouTube" : "ID video Vimeo"}
              </label>
              <input
                {...fieldProps("mat-video", errors)}
                className={control + bad("mat-video")}
                value={value.videoId || ""}
                placeholder={(value.videoProvider || "youtube") === "youtube" ? "dQw4w9WgXcQ" : "76979871"}
                onChange={(e) =>
                  onChange({ ...value, videoId: e.target.value, videoProvider: value.videoProvider || "youtube" })
                }
              />
              <FieldError id="mat-video" errors={errors} />
            </div>
          </div>
          <div>
            <label htmlFor="mat-duration" className={label}>Durasi (detik)</label>
            <input
              {...fieldProps("mat-duration", errors)}
              className={control + bad("mat-duration")}
              type="number"
              min={1}
              value={value.durationSeconds || ""}
              onChange={(e) => onChange({ ...value, durationSeconds: Number(e.target.value) || null })}
            />
            <FieldError id="mat-duration" errors={errors} />
          </div>
        </>
      )}

      {type === "PDF" && (
        <div>
          <label htmlFor="mat-url" className={label}>URL PDF lama</label>
          <input
            {...fieldProps("mat-url", errors)}
            className={control + bad("mat-url")}
            type="url"
            value={value.url || ""}
            onChange={(e) => onChange({ ...value, url: e.target.value })}
          />
          <FieldError id="mat-url" errors={errors} />
        </div>
      )}

      {type === "KOMIK" && (
        <div>
          {pages.map((page, i) => (
            <fieldset key={i} className="mb-3 space-y-2 rounded-[12px] border border-edge p-3 dark:border-slate-700">
              <legend className={label}>Halaman {i + 1}</legend>
              <input
                {...fieldProps(`mat-page-${i}-image`, errors)}
                aria-label={`URL halaman ${i + 1}`}
                className={control + bad(`mat-page-${i}-image`)}
                type="url"
                value={page.image_url}
                placeholder="URL gambar"
                onChange={(e) => pageChange(i, "image_url", e.target.value)}
              />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(i, file);
                }}
              />
              <FieldError id={`mat-page-${i}-image`} errors={errors} />
              <input
                {...fieldProps(`mat-page-${i}-alt`, errors)}
                aria-label={`Alt halaman ${i + 1}`}
                className={control + bad(`mat-page-${i}-alt`)}
                maxLength={1000}
                value={page.alt}
                placeholder="Teks alternatif (deskripsi gambar)"
                onChange={(e) => pageChange(i, "alt", e.target.value)}
              />
              <FieldError id={`mat-page-${i}-alt`} errors={errors} />
              <textarea
                aria-label={`Narasi halaman ${i + 1}`}
                className={control + " !h-auto p-3"}
                maxLength={10000}
                value={page.text}
                placeholder="Narasi"
                onChange={(e) => pageChange(i, "text", e.target.value)}
              />
              <div className="flex gap-2 text-xs">
                <button type="button" className={smallBtn} disabled={!i || uploading} onClick={() => move(i, i - 1)}>
                  Naik
                </button>
                <button
                  type="button"
                  className={smallBtn}
                  disabled={i === pages.length - 1 || uploading}
                  onClick={() => move(i, i + 1)}
                >
                  Turun
                </button>
                <button
                  type="button"
                  className={smallBtn + " text-red-strong"}
                  disabled={uploading}
                  onClick={() => onChange({ ...value, pages: pages.filter((_, n) => n !== i) })}
                >
                  Hapus halaman
                </button>
              </div>
            </fieldset>
          ))}
          <button
            id="mat-pages"
            type="button"
            disabled={pages.length >= 100 || uploading}
            className={control + bad("mat-pages")}
            onClick={() => onChange({ ...value, pages: [...pages, { image_url: "", alt: "", text: "" }] })}
          >
            Tambah halaman
          </button>
          <FieldError id="mat-pages" errors={errors} />
        </div>
      )}

      {uploading && (
        <p role="status" className="text-xs font-bold text-admin-blue">
          Mengunggah gambar… Tunggu sebelum menyimpan.
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-bold text-red-strong">
          Unggah gagal: {error}
        </p>
      )}
      {!editing && tree && (
        <button type="button" className={control} onClick={onManage}>
          Kelola modul dan pelajaran
        </button>
      )}
    </>
  );
}

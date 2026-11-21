"use client";
import { useState, type FormEvent } from "react";
import { API_URL, api } from "@/lib/api";
import type { Material } from "../types";
import { button, input, panel, primary, Message } from "./Shared";
export default function MaterialEditor({
  initial,
  lessonId,
  position,
  onClose,
  onSaved,
}: {
  initial: Material | null;
  lessonId: number;
  position: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<Material["kind"]>(
    initial?.kind || "ARTICLE",
  );
  const [pages, setPages] = useState(
    initial?.pages.length
      ? initial.pages
      : [{ image_url: "", alt: "", text: "" }],
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState("");
  function pageEdit(
    i: number,
    key: "image_url" | "alt" | "text",
    value: string,
  ) {
    setPages((p) => p.map((v, n) => (n === i ? { ...v, [key]: value } : v)));
  }
  async function upload(i: number, file: File) {
    setUploading(i);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api<{ path: string }>("/admin/uploads/images", {
        method: "POST",
        body: form,
      });
      pageEdit(i, "image_url", new URL(r.path, API_URL).href);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(null);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const videoId = String(f.get("video_id") || "").trim();
    const payload = {
      title: f.get("title"),
      kind,
      body: f.get("body"),
      position: Number(f.get("position")),
      required: f.get("required") === "on",
      thumbnail_key: f.get("thumbnail_key") || null,
      thumbnail_url: initial?.thumbnail_url || null,
      pages: kind === "COMIC" ? pages : [],
      page_count: kind === "COMIC" ? pages.length : null,
      duration_seconds:
        kind === "VIDEO" && f.get("duration")
          ? Number(f.get("duration"))
          : null,
      video_provider: kind === "VIDEO" && videoId ? f.get("provider") : null,
      video_id: kind === "VIDEO" && videoId ? videoId : null,
      url: kind === "PDF" || kind === "VIDEO" ? f.get("url") || null : null,
    };
    try {
      await api(
        initial ? `/materials/${initial.id}` : `/lessons/${lessonId}/materials`,
        { method: initial ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`${panel} mt-5`}>
      <h2 className="text-xl font-bold">
        {initial ? "Ubah materi" : "Tambah materi"}
      </h2>
      <form onSubmit={save} className="mt-4 grid gap-4">
        <label>
          Judul
          <input
            name="title"
            defaultValue={initial?.title}
            required
            minLength={3}
            maxLength={200}
            className={input}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          <label>
            Jenis
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Material["kind"])}
              className={input}
            >
              <option value="ARTICLE">Artikel</option>
              <option value="COMIC">Komik</option>
              <option value="VIDEO">Video embed</option>
              {initial?.kind === "PDF" && <option value="PDF">PDF lama</option>}
            </select>
          </label>
          <label>
            Ilustrasi thumbnail
            <select
              name="thumbnail_key"
              defaultValue={initial?.thumbnail_key || ""}
              className={input}
            >
              <option value="">Otomatis menurut jenis</option>
              {["plaster", "kit", "hand", "heart", "roll"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Urutan
            <input
              className={input}
              type="number"
              name="position"
              min={1}
              defaultValue={initial?.position || position}
              required
            />
          </label>
        </div>
        <label>
          {kind === "ARTICLE"
            ? "Isi artikel (Markdown)"
            : "Deskripsi / transkrip untuk pencarian"}
          <textarea
            className={input + " min-h-52"}
            name="body"
            defaultValue={initial?.body}
            required
            minLength={10}
            maxLength={1000000}
          />
        </label>
        <label className="flex gap-3">
          <input
            type="checkbox"
            name="required"
            defaultChecked={initial?.required ?? true}
          />
          Wajib diselesaikan sebelum pelajaran selesai
        </label>
        {kind === "VIDEO" && (
          <div className="grid gap-3 md:grid-cols-3">
            <label>
              Provider
              <select
                className={input}
                name="provider"
                defaultValue={initial?.video_provider || "youtube"}
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
              </select>
            </label>
            <label>
              URL Video
              <input
                className={input}
                name="video_id"
                defaultValue={initial?.video_id || ""}
                required={!initial?.url}
                placeholder="URL Video, bukan kode iframe"
              />
            </label>
            <label>
              Durasi (detik)
              <input
                name="duration"
                className={input}
                min={1}
                type="number"
                defaultValue={initial?.duration_seconds || undefined}
              />
            </label>
          </div>
        )}
        {(kind === "PDF" || (kind === "VIDEO" && initial?.url)) && (
          <label>
            URL lama
            <input
              className={input}
              name="url"
              type="url"
              defaultValue={initial?.url || ""}
            />
          </label>
        )}
        {kind === "COMIC" && (
          <div className="space-y-4">
            <h3 className="font-bold">
              Halaman komik (urutan dari atas ke bawah)
            </h3>
            {pages.map((p, i) => (
              <fieldset
                key={i}
                className="rounded-xl border border-slate-300 p-4"
              >
                <legend>Halaman {i + 1}</legend>
                <label>
                  URL gambar
                  <input
                    className={input}
                    type="url"
                    value={p.image_url}
                    onChange={(e) => pageEdit(i, "image_url", e.target.value)}
                    required
                  />
                </label>
                <label className="mt-3 block">
                  Atau unggah PNG/JPEG/WebP (maks. 10 MB)
                  <input
                    className={input}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy || uploading !== null}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void upload(i, file);
                    }}
                  />
                </label>
                {uploading === i && <p role="status">Mengunggah gambar…</p>}
                <label className="mt-3 block">
                  Teks alternatif
                  <input
                    className={input}
                    value={p.alt}
                    onChange={(e) => pageEdit(i, "alt", e.target.value)}
                    minLength={3}
                    maxLength={1000}
                    required
                  />
                </label>
                <label className="mt-3 block">
                  Narasi
                  <textarea
                    className={input}
                    value={p.text}
                    maxLength={10000}
                    onChange={(e) => pageEdit(i, "text", e.target.value)}
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={button}
                    disabled={!i}
                    onClick={() =>
                      setPages((old) => {
                        const next = [...old];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        return next;
                      })
                    }
                  >
                    Naik
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={i === pages.length - 1}
                    onClick={() =>
                      setPages((old) => {
                        const next = [...old];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        return next;
                      })
                    }
                  >
                    Turun
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={pages.length === 1}
                    onClick={() =>
                      setPages((old) => old.filter((_, n) => n !== i))
                    }
                  >
                    Hapus halaman
                  </button>
                </div>
              </fieldset>
            ))}
            <button
              type="button"
              className={button}
              disabled={pages.length >= 100}
              onClick={() =>
                setPages((p) => [...p, { image_url: "", alt: "", text: "" }])
              }
            >
              Tambah halaman
            </button>
          </div>
        )}
        <Message error={error} />
        <div className="flex gap-3">
          <button className={primary} disabled={busy || uploading !== null}>
            {busy ? "Menyimpan…" : "Simpan materi"}
          </button>
          <button
            type="button"
            className={button}
            disabled={busy || uploading !== null}
            onClick={onClose}
          >
            Batal
          </button>
        </div>
      </form>
    </section>
  );
}

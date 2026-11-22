"use client";
/* Page images come from the content API, so native <img> avoids Next image host configuration. */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type Material } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
import Markdown from "@/components/chat/Markdown";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import { banner, btnOutline, column } from "@/components/ui";
import { ArrowDownIcon } from "@/components/MateriIcons";

function embed(material: Material) {
  if (
    material.video_provider === "youtube" &&
    /^[\w-]{11}$/.test(material.video_id || "")
  )
    return `https://www.youtube-nocookie.com/embed/${material.video_id}`;
  if (
    material.video_provider === "vimeo" &&
    /^\d{1,15}$/.test(material.video_id || "")
  )
    return `https://player.vimeo.com/video/${material.video_id}`;
  // Backwards compatibility for existing VIDEO URL records. Only allow known hosts.
  try {
    const u = new URL(material.url || "");
    if (u.protocol !== "https:") return null;
    if (
      [
        "www.youtube.com",
        "youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
      ].includes(u.hostname)
    ) {
      const id =
        u.hostname === "youtu.be"
          ? u.pathname.slice(1)
          : u.searchParams.get("v") || u.pathname.split("/embed/")[1];
      if (id && /^[\w-]{11}$/.test(id))
        return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (["vimeo.com", "player.vimeo.com"].includes(u.hostname)) {
      const id = u.pathname.split("/").pop();
      if (id && /^\d{1,15}$/.test(id))
        return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
}

const kindLabel: Record<Material["kind"], string> = {
  ARTICLE: "ARTIKEL",
  PDF: "BUKU MATERI",
  VIDEO: "VIDEO",
  COMIC: "KOMIK",
};

const card =
  "rounded-[20px] border-2 border-line bg-surface shadow-pop";
const navBtn =
  "grid size-11 shrink-0 place-items-center rounded-full border-[3px] border-[#1c2b3d] bg-white font-heading text-lg font-black text-[#1c2b3d] shadow-[0_3px_0_#1c2b3d] transition active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 disabled:active:shadow-[0_3px_0_#1c2b3d]";

/** Pembaca halaman demi halaman untuk buku materi & komik. */
function PageReader({ material }: { material: Material }) {
  const pages = material.pages;
  const [index, setIndex] = useState(0);
  const [scroll, setScroll] = useState(material.kind === "COMIC");
  const last = pages.length - 1;
  const go = useCallback(
    (to: number) => setIndex(Math.min(last, Math.max(0, to))),
    [last],
  );

  useEffect(() => {
    if (scroll) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, scroll]);

  // Preload the next page so flipping feels instant.
  useEffect(() => {
    if (scroll || index >= last) return;
    const img = new Image();
    img.src = pages[index + 1].image_url;
  }, [index, last, pages, scroll]);

  if (!pages.length)
    return (
      <p className="mt-6 text-center font-bold text-muted">
        Halaman belum tersedia.
      </p>
    );

  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Mode baca"
          className="flex rounded-full border-2 border-line bg-surface p-1"
        >
          {[
            { key: false, label: "Per halaman" },
            { key: true, label: "Gulir" },
          ].map((m) => (
            <button
              key={m.label}
              role="tab"
              aria-selected={scroll === m.key}
              onClick={() => setScroll(m.key)}
              className={`rounded-full px-4 py-1.5 font-heading text-[13px] font-extrabold transition-colors ${
                scroll === m.key
                  ? "bg-brand text-white"
                  : "text-muted hover:bg-sky-soft"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {material.kind === "PDF" && material.url && (
          <a
            href={material.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 font-heading text-[13px] font-extrabold text-brand"
          >
            <ArrowDownIcon size={13} /> Unduh PDF
          </a>
        )}
      </div>

      {scroll ? (
        <div className="mt-4 space-y-4">
          {pages.map((page, i) => (
            <figure key={page.image_url} className={`${card} overflow-hidden`}>
              <img
                className="h-auto w-full"
                src={page.image_url}
                alt={page.alt}
                loading={i < 2 ? "eager" : "lazy"}
              />
              {page.text && (
                <figcaption className="px-5 py-3 text-sm">{page.text}</figcaption>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <>
          <figure className={`${card} mt-4 overflow-hidden bg-sky-soft`}>
            {/* Satu halaman muat di layar supaya tombol navigasi tetap terlihat. */}
            <img
              key={pages[index].image_url}
              className="mx-auto h-auto max-h-[max(640px,calc(100vh-250px))] w-auto max-w-full animate-pop-in max-[720px]:max-h-none"
              src={pages[index].image_url}
              alt={pages[index].alt}
            />
            {pages[index].text && (
              <figcaption className="px-5 py-3 text-sm">
                {pages[index].text}
              </figcaption>
            )}
          </figure>
          <div className="mt-4 flex items-center gap-4">
            <button
              className={navBtn}
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Halaman sebelumnya"
            >
              ‹
            </button>
            <div className="flex-1">
              <div className="h-3 overflow-hidden rounded-full bg-lock">
                <div
                  className="h-full rounded-full bg-gold transition-[width]"
                  style={{ width: `${((index + 1) / pages.length) * 100}%` }}
                />
              </div>
              <label className="mt-2 flex items-center justify-center gap-2 text-[13px] font-bold text-muted">
                Halaman
                <input
                  type="number"
                  min={1}
                  max={pages.length}
                  value={index + 1}
                  onChange={(e) => go(Number(e.target.value) - 1)}
                  aria-label="Nomor halaman"
                  className="w-14 rounded-lg border-2 border-line bg-surface px-1.5 py-0.5 text-center text-ink"
                />
                dari {pages.length}
              </label>
            </div>
            <button
              className={navBtn}
              onClick={() => go(index + 1)}
              disabled={index === last}
              aria-label="Halaman berikutnya"
            >
              ›
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default function MaterialPage() {
  const { id } = useParams<{ id: string }>();
  const source = useApiData<Material>(`/materials/${id}`);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api(`/materials/${id}/open`, { method: "POST" }).catch((e) => {
      if (active) setMessage(e.message);
    });
    return () => {
      active = false;
    };
  }, [id]);
  const m = source.data;
  async function complete() {
    setBusy(true);
    setMessage("");
    try {
      await api(`/materials/${id}/complete`, { method: "POST" });
      setMessage("Materi ditandai selesai.");
      source.reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const video = m ? embed(m) : null;
  const paged = m && (m.kind === "COMIC" || m.kind === "PDF") && m.pages.length;

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="materi" />

      <main className="relative overflow-hidden pb-[120px] pt-6">
        <div className={column}>
          <div className={`${banner} gap-4 px-[26px] py-[18px]`}>
            <div className="min-w-0">
              <span className="rounded-full bg-brand px-[11px] py-[3px] text-[11px] font-black tracking-[0.5px] text-white">
                {m ? kindLabel[m.kind] : "MATERI"}
              </span>
              <h1 className="mt-2 font-heading text-[22px] font-extrabold leading-tight">
                {m?.title || "Memuat materi…"}
              </h1>
              {m?.meta && (
                <p className="mt-0.5 text-[13px] font-bold">{m.meta}</p>
              )}
            </div>
            <Link href="/materi" className={`${btnOutline} shrink-0`}>
              Kembali
            </Link>
          </div>

          <ApiState
            loading={source.loading}
            error={source.error}
            retry={source.reload}
          />

          {m && (
            <>
              {m.kind === "VIDEO" && (
                <div className={`${card} mt-5 overflow-hidden`}>
                  {video ? (
                    <iframe
                      className="aspect-video w-full border-0"
                      src={video}
                      title={m.title}
                      allow="fullscreen; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : (
                    <p className="p-6">
                      Video belum tersedia dari provider yang didukung.
                    </p>
                  )}
                </div>
              )}

              {paged ? (
                <PageReader material={m} />
              ) : (
                m.kind === "PDF" &&
                m.url &&
                /^https?:\/\//.test(m.url) && (
                  <a
                    className={`${btnOutline} mt-5 inline-block`}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buka dokumen
                  </a>
                )
              )}

              {/* Body teks PDF/komik hanya hasil ekstraksi untuk pencarian, jadi tidak ditampilkan. */}
              {(m.kind === "ARTICLE" || m.kind === "VIDEO") && m.body && (
                <section className={`${card} mt-5 p-6`}>
                  <Markdown text={m.body} />
                </section>
              )}

              <div className={`${card} mt-6 flex flex-wrap items-center justify-between gap-3 px-6 py-4`}>
                <p className="font-heading text-[15px] font-extrabold">
                  {m.completed
                    ? "Hebat! Materi ini sudah selesai."
                    : "Sudah selesai membaca?"}
                </p>
                <div className="flex flex-wrap gap-3">
                  {m.module_id && (
                    <Link
                      href={`/belajar/${m.module_id}`}
                      className="rounded-[14px] px-4 py-2.5 font-heading text-sm font-extrabold text-sky-dark hover:bg-sky-soft"
                    >
                      Ke modul
                    </Link>
                  )}
                  <button
                    disabled={busy || m.completed}
                    onClick={complete}
                    className="rounded-[14px] bg-brand px-6 py-2.5 font-heading text-sm font-extrabold text-white shadow-[0_3px_0_#b71c1c] transition active:translate-y-[3px] active:shadow-none disabled:opacity-60"
                  >
                    {m.completed
                      ? "Sudah selesai"
                      : busy
                        ? "Menyimpan…"
                        : "Tandai selesai"}
                  </button>
                </div>
              </div>
            </>
          )}
          {message && (
            <p role="status" className="mt-3 text-sm font-bold text-muted">
              {message}
            </p>
          )}
        </div>
      </main>

      <RightPanel />
    </div>
  );
}

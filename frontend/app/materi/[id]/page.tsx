"use client";
/* Comic pages use native images so URLs from the content API need no Next image host configuration. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type Material } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
import Markdown from "@/components/chat/Markdown";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";

const panel = "rounded-[22px] border-2 border-line bg-surface shadow-pop";
const btnPrimary =
  "cursor-pointer rounded-[14px] bg-brand px-6 py-3 font-heading text-sm font-extrabold text-white shadow-[0_4px_0_#b71c1c] transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";
const btnGhost =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-brand px-4 py-1.5 font-heading text-sm font-extrabold text-brand no-underline transition-colors hover:bg-brand-soft";
const kindLabel: Record<string, string> = {
  VIDEO: "Video",
  COMIC: "Komik",
  PDF: "Dokumen",
  ARTICLE: "Artikel",
};

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

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="materi" />

      <main className="relative overflow-hidden pb-30 pt-6">
        <div className="mx-auto flex w-[min(800px,calc(100%-48px))] flex-col gap-4">
          <Link href="/materi" className={`${btnGhost} self-start`}>
            ← Katalog materi
          </Link>

          <ApiState
            loading={source.loading}
            error={source.error}
            retry={source.reload}
          />

          {m && (
            <>
              {/* Banner judul */}
              <div className="rounded-[20px] bg-sky px-[26px] py-[18px] text-[#1c2b3d] shadow-[0_5px_0_var(--blue-edge)] dark:text-white">
                <span className="inline-block rounded-full bg-white/70 px-3 py-0.5 font-heading text-xs font-extrabold text-[#1c2b3d]">
                  {kindLabel[m.kind] ?? m.kind}
                </span>
                <h1 className="mt-2 font-heading text-[26px] font-extrabold leading-tight">
                  {m.title}
                </h1>
              </div>

              {/* Video */}
              {m.kind === "VIDEO" &&
                (video ? (
                  <div className={`${panel} overflow-hidden p-2`}>
                    <iframe
                      className="aspect-video w-full rounded-[16px] border-0"
                      src={video}
                      title={m.title}
                      allow="fullscreen; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                ) : (
                  <p className={`${panel} p-5 text-sm font-bold text-muted`}>
                    Video belum tersedia dari provider yang didukung.
                  </p>
                ))}

              {/* Komik */}
              {m.kind === "COMIC" && (
                <div className="flex flex-col gap-4">
                  {m.pages.map((page, i) => (
                    <figure key={i} className={`${panel} overflow-hidden p-2`}>
                      <img
                        className="h-auto w-full rounded-[16px]"
                        src={page.image_url}
                        alt={page.alt}
                        loading="lazy"
                      />
                      <figcaption className="flex gap-3 px-3 pb-2 pt-3 text-[15px] font-semibold">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft font-heading text-xs font-extrabold text-brand">
                          {i + 1}
                        </span>
                        {page.text}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}

              {/* Isi materi */}
              <section className={`${panel} p-6`}>
                <Markdown text={m.body} />
              </section>

              {m.kind === "PDF" && m.url && /^https?:\/\//.test(m.url) && (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btnGhost} self-start`}
                >
                  Buka dokumen lama
                </a>
              )}

              {/* Aksi */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  disabled={busy || m.completed}
                  onClick={complete}
                  className={btnPrimary}
                >
                  {m.completed
                    ? "Sudah selesai ✓"
                    : busy
                      ? "Menyimpan…"
                      : "Tandai selesai"}
                </button>
                <Link
                  href={m.module_id ? `/belajar/${m.module_id}` : "/dashboard"}
                  className={btnGhost}
                >
                  Kembali ke modul
                </Link>
              </div>
            </>
          )}

          {message && (
            <p
              role="status"
              className="rounded-[14px] bg-sky-soft px-3.5 py-2.5 text-sm font-bold text-ink"
            >
              {message}
            </p>
          )}
        </div>
      </main>

      <RightPanel />
    </div>
  );
}
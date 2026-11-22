"use client";
/* Comic pages use native images so URLs from the content API need no Next image host configuration. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type Material } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
import Markdown from "@/components/chat/Markdown";
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
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <Link className="text-brand underline" href="/materi">
        ← Katalog materi
      </Link>
      <ApiState
        loading={source.loading}
        error={source.error}
        retry={source.reload}
      />
      {m && (
        <>
          <h1 className="text-3xl font-bold">{m.title}</h1>
          {m.kind === "VIDEO" &&
            (video ? (
              <iframe
                className="aspect-video w-full rounded-2xl border-0"
                src={video}
                title={m.title}
                allow="fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : (
              <p>Video belum tersedia dari provider yang didukung.</p>
            ))}
          {m.kind === "COMIC" && (
            <div className="space-y-6">
              {m.pages.map((page, i) => (
                <figure key={i}>
                  <img
                    className="h-auto w-full rounded-2xl"
                    src={page.image_url}
                    alt={page.alt}
                    loading="lazy"
                  />
                  <figcaption className="mt-2">
                    {i + 1}. {page.text}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <section className="rounded-2xl border-2 border-line bg-surface p-6">
            <Markdown text={m.body} />
          </section>
          {m.kind === "PDF" && m.url && /^https?:\/\//.test(m.url) && (
            <a href={m.url} target="_blank" rel="noopener noreferrer">
              Buka dokumen lama
            </a>
          )}
          <button
            disabled={busy || m.completed}
            onClick={complete}
            className="rounded-xl bg-brand px-6 py-3 font-bold text-white disabled:opacity-60"
          >
            {m.completed
              ? "Sudah selesai"
              : busy
                ? "Menyimpan…"
                : "Tandai selesai"}
          </button>
          <p>
            <Link
              className="text-brand underline"
              href={m.module_id ? `/belajar/${m.module_id}` : "/dashboard"}
            >
              Kembali ke modul
            </Link>
          </p>
        </>
      )}
      {message && <p role="status">{message}</p>}
    </main>
  );
}

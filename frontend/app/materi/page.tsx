"use client";

import { useMemo, useState, type ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import { banner, btnOutline, column } from "@/components/ui";
import {
  ArrowDownIcon,
  ComicIcon,
  GridIcon,
  HandArt,
  HeartArt,
  KitArt,
  PdfIcon,
  PlasterArt,
  PlayIcon,
  RollArt,
  SearchIcon,
  VideoIcon,
} from "@/components/MateriIcons";

type Kind = "pdf" | "video" | "komik";
type Tab = "semua" | Kind;
type Tone = "blue" | "pink" | "yellow" | "gray";

type Item = {
  id: string;
  kind: Kind;
  title: string;
  meta: string;
  tone: Tone;
  art: ReactNode;
  href?: string; // isi dengan URL PDF / video / komik
};

const items: Item[] = [
  { id: "1", kind: "pdf", title: "Plester dan Perban", meta: "8 halaman", tone: "blue", art: <PlasterArt /> },
  { id: "2", kind: "video", title: "Cara Pakai Plester", meta: "3 menit", tone: "pink", art: <PlasterArt /> },
  { id: "3", kind: "komik", title: "Piko Menolong Teman", meta: "12 halaman", tone: "blue", art: <HeartArt /> },
  { id: "4", kind: "pdf", title: "Kotak P3K", meta: "10 halaman", tone: "yellow", art: <KitArt /> },
  { id: "5", kind: "video", title: "Membalut dengan Rapi", meta: "4 menit", tone: "gray", art: <RollArt /> },
  { id: "6", kind: "komik", title: "Lukaku Diobati", meta: "10 halaman", tone: "blue", art: <PlasterArt /> },
  { id: "7", kind: "pdf", title: "Cuci Tangan Bersih", meta: "6 halaman", tone: "pink", art: <HandArt /> },
  { id: "8", kind: "video", title: "Cuci Tangan 6 Langkah", meta: "2 menit", tone: "blue", art: <HandArt /> },
  { id: "9", kind: "komik", title: "Petualangan Sabun", meta: "8 halaman", tone: "yellow", art: <HandArt /> },
];

const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: "semua", label: "Semua", icon: <GridIcon size={26} /> },
  { key: "pdf", label: "Dokumen/PDF", icon: <PdfIcon size={26} /> },
  { key: "video", label: "Video", icon: <VideoIcon size={26} /> },
  { key: "komik", label: "Komik", icon: <ComicIcon size={26} /> },
];

const badge: Record<Kind, string> = { pdf: "PDF", video: "VIDEO", komik: "KOMIK" };

const tone: Record<Tone, string> = {
  blue: "bg-[#e3f0fd] dark:bg-[#1c3550]",
  pink: "bg-[#fde3e3] dark:bg-[#3a2a33]",
  yellow: "bg-[#fff1c9] dark:bg-[#4a3d17]",
  gray: "bg-[#e5e8ec] dark:bg-[#2a3547]",
};

const actStyle: Record<Kind, string> = {
  pdf: "size-6 bg-brand-soft text-brand",
  video: "size-6 bg-sky-soft text-sky-dark",
  komik: "size-[26px] text-ink",
};

export default function MateriPage() {
  const [tab, setTab] = useState<Tab>("semua");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) => (tab === "semua" || it.kind === tab) && (!q || it.title.toLowerCase().includes(q))
    );
  }, [tab, query]);

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="materi" />

      <main className="relative overflow-hidden pb-[120px] pt-6">
        <div className={column}>
          {/* Pencarian */}
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className={`${banner} gap-3 px-[18px] py-3.5`}
          >
            <label className="flex h-[50px] flex-1 items-center gap-3 rounded-full border-[3px] border-[#1c2b3d] bg-white px-[18px] text-[#1c2b3d]">
              <SearchIcon size={24} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari materi pertolongan pertama..."
                aria-label="Cari materi"
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-[#1c2b3d] outline-none placeholder:text-[#7b8798]"
              />
            </label>
            <button type="submit" className={btnOutline}>
              Cari
            </button>
          </form>

          {/* Tab */}
          <div role="tablist" className="mt-4 grid grid-cols-4 border-b-2 border-line">
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                aria-label={t.label}
                onClick={() => setTab(t.key)}
                className={`flex items-center justify-center gap-2.5 rounded-t-[14px] px-2 pb-4 pt-[18px] font-heading text-[15px] font-extrabold uppercase tracking-[0.4px] transition-colors ${
                  tab === t.key
                    ? "bg-brand-soft text-brand shadow-[inset_0_-4px_0_var(--red)]"
                    : "text-muted hover:bg-sky-soft"
                }`}
              >
                {t.icon}
                <span className="max-[560px]:hidden">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Daftar materi */}
          {visible.length === 0 ? (
            <p className="mt-12 text-center font-bold text-muted">
              Materi tidak ditemukan. Coba kata kunci lain ya!
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
              {visible.map((it) => (
                <article
                  key={it.id}
                  className="overflow-hidden rounded-[18px] border-2 border-line bg-surface shadow-pop transition hover:-translate-y-[3px] hover:shadow-[0_7px_0_var(--border)]"
                >
                  <div className={`relative grid h-[122px] place-items-center ${tone[it.tone]}`}>
                    <span className="absolute left-3 top-3 rounded-full bg-brand px-[11px] py-[3px] text-[11px] font-black tracking-[0.5px] text-white">
                      {badge[it.kind]}
                    </span>
                    {it.art}
                    {it.kind === "video" && (
                      <a
                        href={it.href ?? "#"}
                        aria-label={`Putar ${it.title}`}
                        className="absolute bottom-3 right-3 grid size-[34px] place-items-center rounded-full bg-white text-brand shadow-[0_2px_6px_rgba(0,0,0,0.14)]"
                      >
                        <PlayIcon size={14} />
                      </a>
                    )}
                  </div>

                  <div className="px-4 pb-4 pt-3.5">
                    <h3 className="font-heading text-base font-extrabold leading-[1.2]">{it.title}</h3>
                    <div className="mt-2.5 flex items-center justify-between text-[13px] font-semibold text-muted">
                      <span>{it.meta}</span>
                      <a
                        href={it.href ?? "#"}
                        aria-label={
                          it.kind === "pdf"
                            ? `Unduh ${it.title}`
                            : it.kind === "video"
                              ? `Putar ${it.title}`
                              : `Baca ${it.title}`
                        }
                        className={`grid place-items-center rounded-full ${actStyle[it.kind]}`}
                      >
                        {it.kind === "pdf" && <ArrowDownIcon size={13} />}
                        {it.kind === "video" && <PlayIcon size={11} />}
                        {it.kind === "komik" && <ComicIcon size={22} />}
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      <RightPanel />
    </div>
  );
}
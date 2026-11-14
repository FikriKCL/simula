"use client";

import { useMemo, useState, type ReactNode } from "react";
import { type MaterialCard } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
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

type Kind = "artikel" | "video" | "komik";
type Tab = "semua" | Kind;
type Tone = "blue" | "pink" | "yellow" | "gray";

type Item = {
  id: string;
  kind: Kind;
  title: string;
  meta: string;
  tone: Tone;
  art: ReactNode;
  href?: string; // Internal reader route; locked materials have no link.
};

const artByKey: Record<string, ReactNode> = {
  plaster: <PlasterArt />,
  heart: <HeartArt />,
  kit: <KitArt />,
  hand: <HandArt />,
  roll: <RollArt />,
};
function toItem(material: MaterialCard): Item {
  const kind: Kind =
    material.kind === "VIDEO"
      ? "video"
      : material.kind === "COMIC"
        ? "komik"
        : "artikel";
  return {
    id: String(material.id),
    kind,
    title: material.title,
    tone: kind === "video" ? "pink" : "blue",
    art:
      artByKey[material.thumbnail_key || ""] ||
      (kind === "komik" ? (
        <HeartArt />
      ) : kind === "video" ? (
        <RollArt />
      ) : (
        <KitArt />
      )),
    meta: material.locked
      ? "Terkunci · selesaikan level sebelumnya"
      : material.completed
        ? "Selesai"
        : kind === "komik"
          ? `${material.page_count || 0} halaman`
          : kind === "video"
            ? `${Math.ceil((material.duration_seconds || 0) / 60)} menit`
            : "Baca artikel",
    href: material.locked ? undefined : `/materi/${material.id}`,
  };
}

const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: "semua", label: "Semua", icon: <GridIcon size={26} /> },
  { key: "artikel", label: "Artikel", icon: <PdfIcon size={26} /> },
  { key: "video", label: "Video", icon: <VideoIcon size={26} /> },
  { key: "komik", label: "Komik", icon: <ComicIcon size={26} /> },
];

const badge: Record<Kind, string> = {
  artikel: "ARTIKEL",
  video: "VIDEO",
  komik: "KOMIK",
};

const tone: Record<Tone, string> = {
  blue: "bg-[#e3f0fd] dark:bg-[#1c3550]",
  pink: "bg-[#fde3e3] dark:bg-[#3a2a33]",
  yellow: "bg-[#fff1c9] dark:bg-[#4a3d17]",
  gray: "bg-[#e5e8ec] dark:bg-[#2a3547]",
};

const actStyle: Record<Kind, string> = {
  artikel: "size-6 bg-brand-soft text-brand",
  video: "size-6 bg-sky-soft text-sky-dark",
  komik: "size-[26px] text-ink",
};

export default function MateriPage() {
  const [tab, setTab] = useState<Tab>("semua");
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");

  const kindFilter =
    tab === "semua"
      ? ""
      : `&kind=${tab === "artikel" ? "ARTICLE" : tab === "video" ? "VIDEO" : "COMIC"}`;
  const source = useApiData<{ items: MaterialCard[]; total: number }>(
    `/materials?limit=100&offset=${offset}&q=${encodeURIComponent(query)}${kindFilter}`,
  );
  const items = useMemo(
    () => source.data?.items.map(toItem) || [],
    [source.data],
  );
  const visible = items;

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="materi" />

      <main className="relative overflow-hidden pb-30 pt-6">
        <div className={column}>
          {/* Pencarian */}
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className={`${banner} gap-3 px-4.5 py-3.5`}
          >
            <label className="flex h-12.5 flex-1 items-center gap-3 rounded-full border-[3px] border-[#1c2b3d] bg-white px-4.5 text-[#1c2b3d]">
              <SearchIcon size={24} />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOffset(0);
                }}
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
          <div
            role="tablist"
            className="mt-4 grid grid-cols-4 border-b-2 border-line"
          >
            {tabs.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                aria-label={t.label}
                onClick={() => {
                  setTab(t.key);
                  setOffset(0);
                }}
                className={`flex items-center justify-center gap-2.5 rounded-t-[14px] px-2 pb-4 pt-4.5 font-heading text-[15px] font-extrabold uppercase tracking-[0.4px] transition-colors ${
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

          <ApiState
            loading={source.loading}
            error={source.error}
            retry={source.reload}
          />
          <p className="mt-3 text-sm text-muted">
            {source.data?.total || 0} materi
          </p>
          {/* Daftar materi */}
          {!source.loading && !source.error && visible.length === 0 ? (
            <p className="mt-12 text-center font-bold text-muted">
              Materi tidak ditemukan. Coba kata kunci lain ya!
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
              {visible.map((it) => (
                <article
                  key={it.id}
                  className="overflow-hidden rounded-[18px] border-2 border-line bg-surface shadow-pop transition hover:-translate-y-0.75 hover:shadow-[0_7px_0_var(--border)]"
                >
                  <div
                    className={`relative grid h-30.5 place-items-center ${tone[it.tone]}`}
                  >
                    <span className="absolute left-3 top-3 rounded-full bg-brand px-2.75 py-0.75 text-[11px] font-black tracking-[0.5px] text-white">
                      {badge[it.kind]}
                    </span>
                    {it.art}
                    {it.kind === "video" && (
                      <a
                        href={it.href}
                        aria-disabled={!it.href}
                        aria-label={`Putar ${it.title}`}
                        className="absolute bottom-3 right-3 grid size-8.5 place-items-center rounded-full bg-white text-brand shadow-[0_2px_6px_rgba(0,0,0,0.14)]"
                      >
                        <PlayIcon size={14} />
                      </a>
                    )}
                  </div>

                  <div className="px-4 pb-4 pt-3.5">
                    <h3 className="font-heading text-base font-extrabold leading-[1.2]">
                      {it.title}
                    </h3>
                    <div className="mt-2.5 flex items-center justify-between text-[13px] font-semibold text-muted">
                      <span>{it.meta}</span>
                      <a
                        href={it.href}
                        aria-disabled={!it.href}
                        aria-label={
                          it.kind === "artikel"
                            ? `Baca ${it.title}`
                            : it.kind === "video"
                              ? `Putar ${it.title}`
                              : `Baca ${it.title}`
                        }
                        className={`grid place-items-center rounded-full ${actStyle[it.kind]}`}
                      >
                        {it.kind === "artikel" && <ArrowDownIcon size={13} />}
                        {it.kind === "video" && <PlayIcon size={11} />}
                        {it.kind === "komik" && <ComicIcon size={22} />}
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button
              disabled={offset === 0 || source.loading}
              onClick={() => setOffset(Math.max(0, offset - 100))}
            >
              Sebelumnya
            </button>
            <button
              disabled={
                source.loading || offset + 100 >= (source.data?.total || 0)
              }
              onClick={() => setOffset(offset + 100)}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </main>

      <RightPanel />
    </div>
  );
}

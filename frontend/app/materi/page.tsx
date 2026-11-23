"use client";

import { useMemo, useState, type ReactNode } from "react";
import { type MaterialCard } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
import { CardSkeleton, Skeleton, Spinner } from "@/components/Loading";
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

type Kind = "artikel" | "pdf" | "video" | "komik";
type Tab = "semua" | "dokumen" | "video" | "komik";
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
// Rotasi warna kartu seperti desain Figma (biru, kuning, merah muda, abu).
const toneCycle: Tone[] = ["blue", "yellow", "pink", "gray"];

function toItem(material: MaterialCard, index: number): Item {
  const kind: Kind =
    material.kind === "VIDEO"
      ? "video"
      : material.kind === "COMIC"
        ? "komik"
        : material.kind === "PDF"
          ? "pdf"
          : "artikel";
  return {
    id: String(material.id),
    kind,
    title: material.title,
    tone: toneCycle[index % toneCycle.length],
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
        : material.meta ? material.meta
          : kind === "komik" || kind === "pdf"
            ? `${material.page_count || 0} halaman`
            : kind === "video"
              ? `${Math.ceil((material.duration_seconds || 0) / 60)} menit`
              : "Baca artikel",
    href: material.locked ? undefined : `/materi/${material.id}`,
  };
}

const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: "semua", label: "Semua", icon: <GridIcon size={26} /> },
  { key: "dokumen", label: "Dokumen/PDF", icon: <PdfIcon size={26} /> },
  { key: "video", label: "Video", icon: <VideoIcon size={26} /> },
  { key: "komik", label: "Komik", icon: <ComicIcon size={26} /> },
];

const badge: Record<Kind, string> = {
  artikel: "ARTIKEL",
  pdf: "PDF",
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
  pdf: "size-6 bg-brand-soft text-brand",
  video: "size-6 bg-sky-soft text-sky-dark",
  komik: "size-[26px] text-ink",
};

// 12 habis dibagi 2, 3, dan 4, jadi baris terakhir tetap rapi di semua jumlah kolom
const PAGE_SIZE = 12;

const gridClass =
  "mt-5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3.5 max-[560px]:mt-4 max-[560px]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] max-[560px]:gap-2.5";

type Sort = "default" | "az" | "za";

const sortOptions: { key: Sort; label: string }[] = [
  { key: "default", label: "Urutkan: Bawaan" },
  { key: "az", label: "Urutkan: Judul A–Z" },
  { key: "za", label: "Urutkan: Judul Z–A" },
];


export default function MateriPage() {
  const [tab, setTab] = useState<Tab>("semua");
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");

  const kindFilter =
    tab === "semua"
      ? ""
      : tab === "dokumen"
        ? "&kind=ARTICLE&kind=PDF"
        : `&kind=${tab === "video" ? "VIDEO" : "COMIC"}`;
  const source = useApiData<{ items: MaterialCard[]; total: number }>(
    `/materials?limit=${PAGE_SIZE}&offset=${offset}&q=${encodeURIComponent(query)}${kindFilter}`,
  );

  const total = source.data?.total || 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToPage(nextOffset: number) {
    setOffset(Math.max(0, nextOffset));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const items = useMemo(
    () => source.data?.items.map((m, i) => toItem(m, i)) || [],
    [source.data],
  );
  const [sort, setSort] = useState<Sort>("default");


  const visible = useMemo(() => {
    if (sort === "default") return items;
    const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title, "id"));
    return sort === "za" ? sorted.reverse() : sorted;
  }, [items, sort]);

  // Pemuatan pertama (belum ada data sama sekali) -> kerangka kartu.
  // Pemuatan berikutnya (ganti tab / cari) -> kartu lama diredupkan + spinner kecil.
  const firstLoad = source.loading && !source.data;

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="materi" />

      <main className="relative overflow-hidden pb-[120px] pt-6">
        <div className={column}>
          {/* Pencarian */}
          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className={`${banner} gap-3 px-[18px] py-3.5 max-[560px]:gap-2 max-[560px]:px-3 max-[560px]:py-3`}
          >
            <label className="flex h-[50px] min-w-0 flex-1 items-center gap-3 rounded-full border-[3px] border-[#1c2b3d] bg-white px-[18px] text-[#1c2b3d] max-[560px]:h-11 max-[560px]:gap-2 max-[560px]:border-2 max-[560px]:px-3.5">
              <span className="shrink-0">
                <SearchIcon size={22} />
              </span>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOffset(0);
                }}
                placeholder="Cari materi P3K..."
                aria-label="Cari materi"
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[#1c2b3d] outline-none placeholder:text-[#7b8798] min-[561px]:text-[15px]"
              />
            </label>
            <button
              type="submit"
              className={`${btnOutline} shrink-0 max-[560px]:px-4 max-[560px]:py-2 max-[560px]:text-sm`}
            >
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
                className={`flex items-center justify-center gap-2.5 rounded-t-[14px] px-2 pb-4 pt-[18px] font-heading text-[15px] font-extrabold uppercase tracking-[0.4px] transition-colors ${tab === t.key
                  ? "bg-brand-soft text-brand shadow-[inset_0_-4px_0_var(--red)]"
                  : "text-muted hover:bg-sky-soft"
                  }`}
              >
                {t.icon}
                <span className="max-[560px]:hidden">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Loading ditangani kerangka di bawah, jadi ApiState hanya menampilkan error + tombol coba lagi */}
          <ApiState loading={false} error={source.error} retry={source.reload} />

          {/* Jumlah materi */}
          {/* Jumlah materi (kiri) + urutkan (kanan) */}
          <div className="mt-3 flex min-h-9 items-center justify-between gap-2 text-sm text-muted">
            <div className="flex items-center gap-2">
              {firstLoad ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span>{source.data?.total || 0} materi</span>
              )}
              {source.loading && source.data && <Spinner size={14} label="Memuat materi…" />}
            </div>

            <label className="relative inline-flex items-center">
              <span className="sr-only">Urutkan materi</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                disabled={firstLoad}
                className="cursor-pointer appearance-none rounded-full border-2 border-line bg-surface py-1.5 pl-3.5 pr-9 font-heading text-xs font-extrabold text-ink outline-none transition hover:bg-sky-soft focus-visible:ring-4 focus-visible:ring-sky-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sortOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="pointer-events-none absolute right-3 text-muted"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </label>
          </div>

          {/* Daftar materi */}
          {firstLoad ? (
            <div className={gridClass} aria-busy="true">
              <span role="status" className="sr-only">
                Memuat materi…
              </span>
              {Array.from({ length: 6 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : !source.loading && !source.error && visible.length === 0 ? (
            <p className="mt-12 text-center font-bold text-muted">
              Materi tidak ditemukan. Coba kata kunci lain ya!
            </p>
          ) : (
            <div
              aria-busy={source.loading}
              className={`${gridClass} transition-opacity ${source.loading ? "opacity-60" : ""}`}
            >
              {visible.map((it) => (
                <article
                  key={it.id}
                  className="overflow-hidden rounded-[18px] border-2 border-line bg-surface shadow-pop transition hover:-translate-y-[3px] hover:shadow-[0_7px_0_var(--border)]"
                >
                  <div
                    className={`relative grid h-[122px] place-items-center max-[560px]:h-[96px] ${tone[it.tone]}`}
                  >
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-brand px-[10px] py-[3px] text-[11px] font-black tracking-[0.5px] text-white max-[560px]:px-2 max-[560px]:text-[10px]">
                      {badge[it.kind]}
                    </span>
                    <div className="max-[560px]:scale-[0.8]">{it.art}</div>
                    {it.kind === "video" && (
                      <a
                        href={it.href}
                        aria-disabled={!it.href}
                        aria-label={`Putar ${it.title}`}
                        className="absolute bottom-2.5 right-2.5 grid size-[34px] place-items-center rounded-full bg-white text-brand shadow-[0_2px_6px_rgba(0,0,0,0.14)] max-[560px]:size-8"
                      >
                        <PlayIcon size={14} />
                      </a>
                    )}
                  </div>

                  <div className="px-4 pb-4 pt-3.5 max-[560px]:px-3 max-[560px]:pb-3 max-[560px]:pt-2.5">
                    <h3 className="line-clamp-2 font-heading text-base font-extrabold leading-[1.2] max-[560px]:text-sm">
                      {it.title}
                    </h3>
                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[13px] font-semibold text-muted max-[560px]:mt-2 max-[560px]:text-xs">
                      <span className="min-w-0 leading-snug">{it.meta}</span>
                      <a
                        href={it.href}
                        aria-disabled={!it.href}
                        aria-label={
                          it.kind === "video" ? `Putar ${it.title}` : `Baca ${it.title}`
                        }
                        className={`grid shrink-0 place-items-center rounded-full ${actStyle[it.kind]}`}
                      >
                        {(it.kind === "artikel" || it.kind === "pdf") && (
                          <ArrowDownIcon size={13} />
                        )}
                        {it.kind === "video" && <PlayIcon size={11} />}
                        {it.kind === "komik" && <ComicIcon size={22} />}
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Halaman materi"
              className="mt-6 flex items-center justify-center gap-2 max-[560px]:gap-1.5 pb-12"
            >
              <button
                type="button"
                className={`${btnOutline} disabled:cursor-not-allowed disabled:opacity-50`}
                disabled={page <= 1 || source.loading}
                onClick={() => goToPage(offset - PAGE_SIZE)}
              >
                Sebelumnya
              </button>

              <span
                aria-live="polite"
                className="min-w-[72px] text-center text-sm font-extrabold text-ink max-[560px]:min-w-[56px]"
              >
                {page} / {totalPages}
              </span>

              <button
                type="button"
                className={`${btnOutline} disabled:cursor-not-allowed disabled:opacity-50`}
                disabled={page >= totalPages || source.loading}
                onClick={() => goToPage(offset + PAGE_SIZE)}
              >
                Berikutnya
              </button>
            </nav>
          )}
        </div>
      </main>

      <RightPanel />
    </div>
  );
}
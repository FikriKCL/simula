"use client";

import { useRouter } from "next/navigation";
import { type PathTopic } from "@/lib/api";
import ApiState, { useApiData } from "./ApiState";
import { Cross, CheckIcon, LockIcon } from "./Icons";
import { LevelPathSkeleton } from "./Loading";

type Status = "done" | "open" | "locked";

type Level = {
  id: string;
  label: string;
  status: Status;
  /** Pergeseran horizontal dari tengah (px) agar jalurnya berkelok. */
  offset: number;
};

const openBtn =
  "cursor-pointer bg-gold-soft shadow-[0_6px_0_var(--gold)] hover:-translate-y-[3px] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_var(--gold)]";
const lockedBtn =
  "cursor-not-allowed bg-lock shadow-[0_6px_0_var(--lock-edge)]";

export default function LevelPath({
  onOpen,
}: {
  onOpen?: (id: string) => void;
}) {
  const { data, error, loading, reload } =
    useApiData<PathTopic[]>("/learning/path");
  const router = useRouter();

  // Pemuatan pertama (belum ada data) -> kerangka jalur level.
  if (loading && !data) return <LevelPathSkeleton />;

  const topics = (data || []).map((topic) => {
    let current = false; // level pertama yang masih terbuka = "lanjutkan di sini"
    const levels: (Level & { title: string; current: boolean })[] = topic.levels.map((node, i) => {
      const status: Status =
        node.status === "COMPLETED" ? "done" : node.status === "AVAILABLE" ? "open" : "locked";
      const isCurrent = status === "open" && !current;
      if (isCurrent) current = true;
      return {
        id: String(node.id),
        label: `${topic.name}, level ${node.level}`,
        // "Pertolongan Pertama — Level 1: Siap Menolong" -> "Siap Menolong"
        title: node.title.includes(":") ? node.title.split(":").slice(1).join(":").trim() : `Level ${node.level}`,
        status,
        current: isCurrent,
        offset: [0, 40, 70, 40][i % 4],
      };
    });
    const done = levels.filter((l) => l.status === "done").length;
    return { id: topic.id, name: topic.name, levels, done };
  });

  return (
    <div className="relative z-[1] mx-auto mt-2 flex w-[min(800px,calc(100%-48px))] flex-col items-center">
      {/* Loading ditangani kerangka di atas, jadi ApiState hanya menampilkan error + coba lagi */}
      <ApiState loading={false} error={error} retry={reload} />

      {!loading && !error && !topics.some((t) => t.levels.length) && (
        <p className="mt-8 text-center font-bold text-muted">
          Belum ada modul terbit.
        </p>
      )}

      {topics.filter((t) => t.levels.length).map((topic) => (
        <section key={topic.id} aria-label={topic.name} className="flex w-full flex-col items-center pb-6">
          {/* Judul topik: memisahkan jalur PP, ASB, KR */}
          <header className="mb-5 mt-6 flex w-full max-w-[420px] items-center gap-3 rounded-[16px] border-2 border-line bg-surface px-4 py-3 shadow-pop">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft">
              <Cross size={20} color="var(--red)" dot="var(--surface)" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-base font-extrabold leading-tight">{topic.name}</h2>
              <p className="text-[13px] font-bold text-muted">
                {topic.done} dari {topic.levels.length} level selesai
              </p>
            </div>
            <div
              className="h-2.5 w-20 shrink-0 overflow-hidden rounded-full bg-line"
              role="progressbar"
              aria-label={`Progres ${topic.name}`}
              aria-valuemin={0}
              aria-valuemax={topic.levels.length}
              aria-valuenow={topic.done}
            >
              <div
                className="h-full origin-left rounded-full bg-sky-dark transition-transform duration-500 motion-reduce:transition-none"
                style={{ transform: `scaleX(${topic.levels.length ? topic.done / topic.levels.length : 0})` }}
              />
            </div>
          </header>

          {topic.levels.map((level) => {
            const locked = level.status === "locked";
            return (
              <div
                key={level.id}
                className="relative flex h-44 w-[170px] flex-col items-center text-center"
                style={{ transform: `translateX(${level.offset}px)` }}
              >
                {level.current && (
                  <span className="absolute -top-7 z-[2] rounded-[10px] border-2 border-line bg-surface px-2.5 py-1 font-heading text-xs font-extrabold text-brand shadow-pop">
                    Lanjutkan di sini
                  </span>
                )}
                <button
                  disabled={locked}
                  aria-label={`${level.label}: ${level.title}${locked ? " (terkunci)" : level.status === "done" ? " (selesai)" : ""}`}
                  onClick={() =>
                    onOpen ? onOpen(level.id) : router.push(`/belajar/${level.id}`)
                  }
                  className={`relative grid size-[100px] place-items-center rounded-full transition-transform motion-reduce:transition-none ${
                    locked ? lockedBtn : openBtn
                  }`}
                >
                  <Cross
                    size={52}
                    color={locked ? "var(--surface)" : "var(--red)"}
                    dot={locked ? "var(--lock-edge)" : "var(--surface)"}
                  />

                  {level.status === "done" && (
                    <span className="absolute -right-0.5 -top-0.5 grid size-7 place-items-center rounded-full border-2 border-surface bg-sky-dark text-white">
                      <CheckIcon size={15} />
                    </span>
                  )}
                  {locked && (
                    <span className="absolute -right-0.5 -top-0.5 grid size-7 place-items-center rounded-full border-2 border-surface bg-muted text-white">
                      <LockIcon size={14} />
                    </span>
                  )}
                </button>
                <span className="mt-3 font-heading text-[13px] font-extrabold text-muted">
                  Level {level.label.split("level ")[1]}
                </span>
                <span className="font-heading text-sm font-black leading-[1.15]">
                  {level.title}
                </span>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

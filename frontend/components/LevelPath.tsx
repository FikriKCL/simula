"use client";

import { useRouter } from "next/navigation";
import { type PathTopic } from "@/lib/api";
import ApiState, { useApiData } from "./ApiState";
import { Cross, CheckIcon, LockIcon } from "./Icons";

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
  const levels: Level[] = (data || []).flatMap((topic) =>
    topic.levels.map((node, i) => ({
      id: String(node.id),
      label: `${topic.name} · Level ${node.level}`,
      status:
        node.status === "COMPLETED"
          ? ("done" as const)
          : node.status === "AVAILABLE"
            ? ("open" as const)
            : ("locked" as const),
      offset: [0, 40, 70, 40][i % 4],
    })),
  );
  return (
    <div className="relative z-[1] mx-auto mt-2 flex w-[min(800px,calc(100%-48px))] flex-col items-center">
      <ApiState loading={loading} error={error} retry={reload} />
      {!loading && !error && !levels.length && <p>Belum ada modul terbit.</p>}
      {levels.map((level) => {
        const locked = level.status === "locked";
        return (
          <div
            key={level.id}
            className="relative flex h-52 w-[160px] flex-col items-center text-center"
            style={{ transform: `translateX(${level.offset}px)` }}
          >
            <button
              disabled={locked}
              aria-label={level.label}
              onClick={() =>
                onOpen ? onOpen(level.id) : router.push(`/belajar/${level.id}`)
              }
              className={`relative grid size-[100px] place-items-center rounded-full transition-transform ${
                locked ? lockedBtn : openBtn
              }`}
            >
              <Cross
                size={52}
                color={locked ? "#fff" : "#e53935"}
                dot={locked ? "#c9d0d9" : "#fff"}
              />

              {level.status === "done" && (
                <span className="absolute -right-0.5 -top-0.5 grid size-7 place-items-center rounded-full border-2 border-surface bg-sky-dark text-white">
                  <CheckIcon size={15} />
                </span>
              )}
              {locked && (
                <span className="absolute -right-0.5 -top-0.5 grid size-7 place-items-center rounded-full border-2 border-surface bg-[#8fa0b5] text-white">
                  <LockIcon size={14} />
                </span>
              )}
            </button>
            <span className="mt-3.5 min-h-[34px] font-heading text-sm font-black leading-[1.15]">
              {level.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

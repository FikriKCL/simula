"use client";

import { Cross, CheckIcon, LockIcon } from "./Icons";

type Status = "done" | "open" | "locked";

type Level = {
  id: string;
  label: string;
  status: Status;
  /** Pergeseran horizontal dari tengah (px) agar jalurnya berkelok. */
  offset: number;
};

const levels: Level[] = [
  { id: "1", label: "Level 1", status: "done", offset: 0 },
  { id: "2", label: "Level 2", status: "open", offset: 70 },
  { id: "3", label: "Level 3", status: "locked", offset: 134 },
  { id: "4", label: "Level 4", status: "locked", offset: 70 },
  { id: "5", label: "Level 5", status: "locked", offset: 0 },
  { id: "6", label: "Level 6", status: "locked", offset: 64 },
  { id: "7", label: "Level 7", status: "locked", offset: 128 },
  { id: "8", label: "Level 8", status: "locked", offset: 63 },
  { id: "9", label: "Level 9", status: "locked", offset: 0 },
  { id: "10", label: "Level 10", status: "locked", offset: 64 },
  { id: "tes", label: "Level Tes (PP)", status: "locked", offset: 128 },
];

const openBtn =
  "cursor-pointer bg-gold-soft shadow-[0_6px_0_var(--gold)] hover:-translate-y-[3px] hover:scale-105 active:translate-y-1 active:shadow-[0_2px_0_var(--gold)]";
const lockedBtn = "cursor-not-allowed bg-lock shadow-[0_6px_0_var(--lock-edge)]";

export default function LevelPath({ onOpen }: { onOpen?: (id: string) => void }) {
  return (
    <div className="relative z-[1] mx-auto mt-2 flex w-[min(800px,calc(100%-48px))] flex-col items-center">
      {levels.map((level) => {
        const locked = level.status === "locked";
        return (
          <div
            key={level.id}
            className="relative flex h-36 w-[104px] flex-col items-center text-center"
            style={{ transform: `translateX(${level.offset}px)` }}
          >
            <button
              disabled={locked}
              aria-label={level.label}
              onClick={() => onOpen?.(level.id)}
              className={`relative grid size-[100px] place-items-center rounded-full transition-transform ${
                locked ? lockedBtn : openBtn
              }`}
            >
              <Cross size={52} color={locked ? "#fff" : "#e53935"} dot={locked ? "#c9d0d9" : "#fff"} />

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
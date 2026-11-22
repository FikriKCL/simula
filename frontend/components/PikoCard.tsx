"use client";

import type { Ref } from "react";
import { PikoMascot, type PikoMood } from "./PikoMascot";

// Di bawah tinggi ini maskot dan balon tidak muat bertumpuk, jadi ditata mendatar
export const PIKO_CARD_COLUMN_MIN = 190;
// Di bawah tinggi ini kartu disembunyikan (chat dianggap penuh)
export const PIKO_CARD_HIDE_BELOW = 56;

type Props = {
  /** Tinggi yang tersedia. undefined = ukuran alami (desain Figma). */
  height?: number;
  message: string;
  mood: PikoMood;
  /** Animasikan perubahan tinggi (dimatikan selama pengguna menggeser). */
  animateSize: boolean;
  ref?: Ref<HTMLElement>;
};

/**
 * Kartu Dokter Piko di atas chat. Mengikuti ruang yang tersisa: tegak (maskot di bawah balon),
 * lalu mendatar (maskot kecil di samping balon) saat ruang menyempit, dan hilang saat chat penuh.
 */
export function PikoCard({ height, message, mood, animateSize, ref }: Props) {
  const natural = height === undefined;
  const hidden = !natural && height < PIKO_CARD_HIDE_BELOW;
  const row = !natural && !hidden && height < PIKO_CARD_COLUMN_MIN;

  return (
    <section
      ref={ref}
      aria-label="Dokter Piko"
      aria-hidden={hidden}
      style={natural ? undefined : { height: hidden ? 0 : height }}
      className={`piko-card flex shrink-0 overflow-hidden rounded-[28px] bg-sky-soft ${
        animateSize ? "transition-[height,opacity,padding] duration-300 ease-out" : ""
      } ${
        // Saat tersembunyi padding juga 0, kalau tidak tinggi 0 tetap menyisakan padding
        hidden
          ? "pointer-events-none flex-col p-0 opacity-0"
          : row
            ? "flex-row items-center gap-2 px-3 py-2 opacity-100"
            : "flex-col items-center px-[18px] pb-2 pt-5 opacity-100"
      }`}
    >
      {row && (
        <PikoMascot animated mood={mood} className="h-full max-h-[96px] w-auto shrink-0" />
      )}

      {/* Balon ucapan: ekor menunjuk ke maskot (bawah saat tegak, kiri saat mendatar) */}
      <div
        aria-live="polite"
        className={`relative rounded-2xl border border-line bg-surface font-extrabold leading-[1.4] ${
          row
            ? "min-w-0 flex-1 px-3 py-2 text-[13px] before:absolute before:-left-[7px] before:top-1/2 before:size-3 before:-translate-y-1/2 before:rotate-45 before:rounded-bl-[3px] before:border-b before:border-l before:border-line before:bg-surface before:content-['']"
            : "w-full shrink-0 px-4 py-3.5 text-sm after:absolute after:-bottom-[9px] after:left-1/2 after:size-4 after:-translate-x-1/2 after:rotate-45 after:rounded-br-[4px] after:border-b after:border-r after:border-line after:bg-surface after:content-['']"
        }`}
      >
        {/* Selalu setinggi 2 baris agar pergantian ucapan tidak menggeser chat */}
        <p key={message} className="piko-bubble-text line-clamp-2 min-h-[2.8em]">
          {message}
        </p>
      </div>

      {!row && (
        <div className={`flex w-full justify-center ${natural ? "" : "min-h-0 flex-1 pt-3.5"}`}>
          <PikoMascot
            animated
            mood={mood}
            className={natural ? "mt-3.5 h-auto w-[140px]" : "h-full max-h-[200px] w-auto"}
          />
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";

/** Field id → pesan kesalahan. Kunci juga dipakai sebagai id elemen input. */
export type FieldErrors = Record<string, string>;

export const errorRing = "!border-red-strong ring-2 ring-red-strong/20";

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Pesan merah kecil di bawah satu input. */
export function FieldError({ id, errors }: { id: string; errors: FieldErrors }) {
  const message = errors[id];
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="mt-1 text-xs font-bold text-red-strong">
      {message}
    </p>
  );
}

/** Props untuk input yang terhubung ke pesan kesalahannya (aria + id). */
export function fieldProps(id: string, errors: FieldErrors) {
  return {
    id,
    "aria-invalid": errors[id] ? true : undefined,
    "aria-describedby": errors[id] ? `${id}-error` : undefined,
  } as const;
}

/**
 * Kotak ringkasan di atas form: daftar semua isian yang salah.
 * Klik satu baris untuk lompat ke isian itu. Muncul tiap kali form dikirim dengan kesalahan.
 */
export function FormErrorSummary({ errors, attempt }: { errors: FieldErrors; attempt: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(errors);
  useEffect(() => {
    if (attempt && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
      ref.current.focus({ preventScroll: true });
    }
  }, [attempt]);
  if (!entries.length) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-[14px] border-[1.5px] border-red-strong bg-red-tint px-4 py-3 text-red-deep outline-none dark:bg-red-950/40 dark:text-red-200"
    >
      <p className="text-sm font-black">
        Periksa {entries.length} isian berikut sebelum menyimpan:
      </p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs font-bold">
        {entries.map(([id, message]) => (
          <li key={id}>
            <button
              type="button"
              className="cursor-pointer text-left underline decoration-dotted underline-offset-2"
              onClick={() => {
                const el = document.getElementById(id);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
                el?.focus({ preventScroll: true });
              }}
            >
              {message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pesan gagal dari server (mis. validasi backend), tampil jelas di bawah form. */
export function SaveError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-[12px] border border-red-strong/40 bg-red-tint px-3 py-2 text-xs font-bold text-red-deep dark:bg-red-950/40 dark:text-red-200"
    >
      Gagal menyimpan: {message}
    </p>
  );
}

"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Dialog konfirmasi sebelum logout. Tutup dengan Batal, klik di luar kotak, atau tombol Esc. */
export default function LogoutDialog({ open, onCancel, onConfirm }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-6" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-desc"
        onClick={(event) => event.stopPropagation()}
        className="w-[min(420px,100%)] animate-pop-in rounded-[22px] border-2 border-line bg-surface p-6 text-center shadow-pop motion-reduce:animate-none"
      >
        <div className="mx-auto mb-3.5 grid size-[60px] place-items-center rounded-full bg-brand-soft text-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 id="logout-title" className="font-heading text-[22px] font-extrabold">
          Yakin ingin keluar?
        </h2>
        <p id="logout-desc" className="mt-1.5 text-[15px] font-semibold text-muted">
          Kamu perlu masuk lagi untuk melanjutkan belajar.
        </p>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="flex-1 cursor-pointer rounded-[14px] border-2 border-line bg-surface px-5 py-2.5 font-heading text-sm font-extrabold text-muted shadow-[0_4px_0_var(--border)] transition hover:bg-sky-soft active:translate-y-1 active:shadow-none"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-[14px] bg-brand px-5 py-2.5 font-heading text-sm font-extrabold text-white shadow-[0_4px_0_var(--red-shadow)] transition active:translate-y-1 active:shadow-none"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  );
}
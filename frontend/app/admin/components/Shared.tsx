"use client";
import type { ReactNode } from "react";
export const panel =
  "rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";
export const input =
  "mt-1 w-full rounded-xl border border-slate-400 bg-white p-2.5 text-sm text-slate-900 dark:bg-slate-800 dark:text-white";
export const button =
  "rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-white";
export const primary = button + " !bg-[#E5252A] !text-white";
export function Hero({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 rounded-[20px] border-b-4 border-[#2589D8] bg-[#43A8F6] p-6 text-[#1E293B]">
      <h1 className="text-2xl font-black">{title}</h1>
      <div className="mt-1 text-sm font-semibold">{children}</div>
    </div>
  );
}
export function Pager({
  offset,
  total,
  busy,
  onChange,
}: {
  offset: number;
  total: number;
  busy?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        className={button}
        disabled={!offset || busy}
        onClick={() => onChange(Math.max(0, offset - 20))}
      >
        Sebelumnya
      </button>
      <span className="text-sm">
        {total
          ? `${offset + 1}–${Math.min(offset + 20, total)} dari ${total}`
          : "0 data"}
      </span>
      <button
        className={button}
        disabled={offset + 20 >= total || busy}
        onClick={() => onChange(offset + 20)}
      >
        Berikutnya
      </button>
    </div>
  );
}
export function Message({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="my-3 rounded-xl bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="my-3 rounded-xl bg-green-50 p-3 text-green-800"
        >
          {message}
        </p>
      )}
    </>
  );
}

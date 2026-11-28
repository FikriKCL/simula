"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDownIcon, CheckIcon } from "./AdminIcons";

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

/* ---- Toolbar daftar admin: cari + urutkan + filter ---- */
export const toolbarSelect =
  "w-full md:w-[165px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-[#1E293B] dark:text-white appearance-none cursor-pointer focus:outline-none";

export type DateSort = "newest" | "oldest";
export type SortOption = "newest" | "oldest" | "az" | "za";

/** Urut terbaru/terlama (dipakai di DashboardView). */
export function compareByDate(
  sort: DateSort,
  a: { id: string; createdAt?: number },
  b: { id: string; createdAt?: number }
) {
  const diff = (a.createdAt ?? Number(a.id)) - (b.createdAt ?? Number(b.id));
  return sort === "newest" ? -diff : diff;
}

/** Urutkan daftar berdasarkan waktu upload atau abjad (A-Z / Z-A). */
export function sortItems<T extends { id: string; createdAt?: number }>(
  items: T[],
  sort: SortOption,
  getLabel: (item: T) => string
): T[] {
  const copy = [...items];
  if (sort === "az") {
    return copy.sort((a, b) =>
      getLabel(a).localeCompare(getLabel(b), "id", { sensitivity: "base" })
    );
  }
  if (sort === "za") {
    return copy.sort((a, b) =>
      getLabel(b).localeCompare(getLabel(a), "id", { sensitivity: "base" })
    );
  }
  return copy.sort((a, b) => compareByDate(sort, a, b));
}

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
}

/**
 * Dropdown dengan konsep:
 * 1. Tampil awal sebagai judul pilihan (`title`) saat `value === null`.
 * 2. Saat dibuka menampilkan judul di header popover + daftar opsi bersih tanpa warna khusus.
 * 3. Setelah memilih opsi, tombol menampilkan label opsi yang dipilih.
 */
export function FilterDropdown<T extends string = string>({
  title,
  value,
  options,
  onChange,
  className = "",
}: {
  title: string;
  value: T | null;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const selectedOption = value !== null ? options.find((o) => o.value === value) : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={title}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full md:min-w-[185px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold flex items-center justify-between gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#43A8F6]/30"
      >
        <span
          className={`truncate ${
            selectedOption
              ? "text-[#1E293B] dark:text-white"
              : "text-[#64748B] dark:text-slate-300"
          }`}
        >
          {selectedOption ? selectedOption.label : title}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 text-[#64748B] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={title}
          className="absolute right-0 left-0 md:left-auto md:min-w-[215px] mt-1.5 z-30 rounded-[16px] border-[1.5px] border-[#1E293B] border-b-[3px] dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg py-1.5 overflow-hidden"
        >
          {/* Header judul pilihan */}
          <div className="px-3.5 py-2 border-b border-[#EEF2F6] dark:border-slate-700 flex items-center justify-between gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B] dark:text-slate-400 select-none">
            <span>{title}</span>
            <ChevronDownIcon className="w-3.5 h-3.5 rotate-180 text-[#64748B]" />
          </div>

          <div className="py-1 max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-[13px] font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 dark:bg-slate-700/70 text-[#1E293B] dark:text-white"
                      : "text-[#334155] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <CheckIcon className="w-3.5 h-3.5 shrink-0 text-[#1E293B] dark:text-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const SORT_OPTIONS: DropdownOption<SortOption>[] = [
  { value: "newest", label: "Terbaru" },
  { value: "oldest", label: "Terlama" },
  { value: "az", label: "A - Z" },
  { value: "za", label: "Z - A" },
];

export function SortDropdown({
  value,
  onChange,
  className = "",
}: {
  value: SortOption | null;
  onChange: (v: SortOption) => void;
  className?: string;
}) {
  return (
    <FilterDropdown
      title="Urutkan berdasarkan"
      value={value}
      options={SORT_OPTIONS}
      onChange={onChange}
      className={className}
    />
  );
}

/** Menghasilkan daftar nomor halaman dinamis; tanda "..." hanya muncul jika ada selisih > 1 antarhalaman. */
export function buildPageItems(currentPage: number, pageCount: number): (number | "...")[] {
  if (pageCount <= 1) return [1];
  const visible = Array.from(
    new Set(
      [1, currentPage - 1, currentPage, currentPage + 1, pageCount].filter(
        (n) => n >= 1 && n <= pageCount
      )
    )
  ).sort((a, b) => a - b);

  const items: (number | "...")[] = [];
  for (let i = 0; i < visible.length; i++) {
    if (i > 0 && visible[i] - visible[i - 1] > 1) {
      items.push("...");
    }
    items.push(visible[i]);
  }
  return items;
}

export function PaginationFooter({
  currentPage,
  totalItems,
  pageSize = 10,
  itemLabel,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(currentPage, pageCount);
  const items = buildPageItems(page, pageCount);

  return (
    <div className="mt-5 pt-4 border-t border-[#EEF2F6] dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
      <p className="text-xs font-bold text-[#64748B]">
        Menampilkan {totalItems ? (page - 1) * pageSize + 1 : 0}–
        {Math.min(page * pageSize, totalItems)} dari {totalItems} {itemLabel}
      </p>

      <div className="flex items-center gap-1.5">
        {items.map((item, idx) =>
          item === "..." ? (
            <span
              key={`ellipsis-${idx}`}
              className="w-8 h-8 rounded-[10px] border border-[#DCE3EC] dark:border-slate-700 text-xs font-extrabold text-[#94A3B8] flex items-center justify-center select-none"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`w-8 h-8 rounded-[10px] text-xs font-extrabold transition-colors cursor-pointer ${
                page === item
                  ? "bg-[#FEECEB] border-[1.5px] border-[#E5252A] text-[#E5252A]"
                  : "bg-white dark:bg-slate-800 border border-[#DCE3EC] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          )
        )}
      </div>
    </div>
  );
}
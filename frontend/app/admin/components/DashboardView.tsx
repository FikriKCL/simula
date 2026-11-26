"use client";

import React, { useState, useMemo } from "react";
import { MemberProgress } from "../types";
import { SearchIcon } from "./AdminIcons";
import { compareByDate } from "./Shared";

interface DashboardViewProps {
  members: MemberProgress[];
  /** Ringkasan dari data workspace yang sudah dimuat (tanpa request tambahan). */
  overview?: { label: string; value: number; tab?: "pendaftaran" | "level" | "materi" | "soal" }[];
  onGoto?: (tab: "pendaftaran" | "level" | "materi" | "soal") => void;
}

export default function DashboardView({ members, overview = [], onGoto }: DashboardViewProps) {
  const [search, setSearch] = useState("");
  const [progressFilter, setProgressFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("recent");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredMembers = useMemo(() => {
    let result = [...members];

    if (search.trim()) {
      result = result.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (progressFilter === "completed") {
      result = result.filter((m) => m.total === 100);
    } else if (progressFilter === "in_progress") {
      result = result.filter((m) => m.total > 0 && m.total < 100);
    } else if (progressFilter === "not_started") {
      result = result.filter((m) => m.total === 0);
    }

    if (sortFilter === "highest") {
      result.sort((a, b) => b.total - a.total);
    } else if (sortFilter === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortFilter === "newest" || sortFilter === "oldest") {
      result.sort((a, b) => compareByDate(sortFilter, a, b));
    } else {
      result.sort((a,b)=>(b.lastActiveAt||0)-(a.lastActiveAt||0));
    }

    return result;
  }, [members, search, progressFilter, sortFilter]);

  const pageCount=Math.max(1,Math.ceil(filteredMembers.length/10));
  const page=Math.min(currentPage,pageCount);
  const pageItems=filteredMembers.slice((page-1)*10,page*10);
  const pageButtons=Array.from(new Set([1,...[page-1,page,page+1].filter(n=>n>1&&n<pageCount)])).sort((a,b)=>a-b);

  return (
    <div className="space-y-4">
      {/* Blue Hero Banner with Tactile Bottom Border */}
      <div className="bg-admin-sky border-b-[4px] border-admin-sky-edge rounded-[20px] px-5 py-4 md:px-7 md:py-5">
        <h1 className="text-[22px] md:text-[26px] font-black text-navy tracking-tight leading-tight">
          Dashboard
        </h1>
        <p className="text-xs md:text-[13px] font-bold text-navy/90 mt-0.5">
          Progres belajar setiap anggota
        </p>
      </div>

      {overview.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {overview.map((o) => {
            const body = (
              <>
                <span className="block text-[26px] font-black leading-none tabular-nums text-navy dark:text-white">{o.value}</span>
                <span className="mt-1.5 block text-xs font-bold text-slate-muted dark:text-slate-400">{o.label}</span>
              </>
            );
            const cls = "rounded-[16px] border-[1.5px] border-edge border-b-[3px] bg-white dark:bg-slate-900 dark:border-slate-800 px-4 py-3.5 text-left";
            return o.tab && onGoto ? (
              <button key={o.label} type="button" onClick={() => onGoto(o.tab!)} className={`${cls} cursor-pointer transition-colors hover:bg-sky-tint dark:hover:bg-slate-800`}>
                {body}
              </button>
            ) : (
              <div key={o.label} className={cls}>{body}</div>
            );
          })}
        </div>
      )}

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-edge border-b-[3px] dark:border-slate-800 p-4 md:p-6">
        {/* Search & Clean Tactile Filters */}
        <div className="flex flex-col md:flex-row gap-2.5 md:gap-3 mb-5">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon className="w-4 h-4 text-slate-muted" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => {setSearch(e.target.value);setCurrentPage(1);}}
              placeholder="Cari anggota..."
              className="w-full h-11 pl-10 pr-4 rounded-[14px] border-[1.5px] border-navy dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-navy dark:text-white placeholder:text-slate-faint focus:outline-none focus:ring-2 focus:ring-admin-sky/30"
            />
          </div>

          <div className="grid grid-cols-2 md:flex gap-2.5 md:gap-3">
            <select
              value={progressFilter}
              onChange={(e) => {setProgressFilter(e.target.value);setCurrentPage(1);}}
              aria-label="Filter progres"
              className="w-full md:w-[165px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-navy dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-navy dark:text-white appearance-none cursor-pointer focus:outline-none"
            >
              <option value="all">Semua progres</option>
              <option value="completed">Selesai (100%)</option>
              <option value="in_progress">Sedang belajar</option>
              <option value="not_started">Belum mulai</option>
            </select>

            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              aria-label="Urutkan berdasarkan"
              className="w-full md:w-[165px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-navy dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-navy dark:text-white appearance-none cursor-pointer focus:outline-none"
            >
              <option value="recent">Terakhir aktif</option>
              <option value="highest">Progres tertinggi</option>
              <option value="name">Nama (A–Z)</option>
              <option value="newest">Terbaru bergabung</option>
              <option value="oldest">Terlama bergabung</option>
            </select>
          </div>
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-edge-soft dark:border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-faint">
                <th className="pb-3 pr-4">ANGGOTA</th>
                <th className="pb-3 px-3">PP</th>
                <th className="pb-3 px-3">ASB</th>
                <th className="pb-3 px-3">KR</th>
                <th className="pb-3 px-3">TOTAL</th>
                <th className="pb-3 pl-4 text-right">TERAKHIR AKTIF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-soft dark:divide-slate-800 text-[13px]">
              {pageItems.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${member.avatarBg} ${member.avatarText} flex items-center justify-center text-xs font-extrabold shrink-0`}
                      >
                        {member.initials}
                      </div>
                      <span className="font-extrabold text-navy dark:text-slate-100">
                        {member.name}
                      </span>
                    </div>
                  </td>

                  {/* PP */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[76px] h-[7px] bg-edge-2 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-admin-blue rounded-full origin-left transition-transform duration-300"
                          style={{ transform: `scaleX(${member.pp / 100})` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-navy dark:text-slate-200 w-9">
                        {member.pp}%
                      </span>
                    </div>
                  </td>

                  {/* ASB */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[76px] h-[7px] bg-edge-2 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-admin-blue rounded-full origin-left transition-transform duration-300"
                          style={{ transform: `scaleX(${member.asb / 100})` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-navy dark:text-slate-200 w-9">
                        {member.asb}%
                      </span>
                    </div>
                  </td>

                  {/* KR */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[76px] h-[7px] bg-edge-2 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-admin-blue rounded-full origin-left transition-transform duration-300"
                          style={{ transform: `scaleX(${member.prs / 100})` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-navy dark:text-slate-200 w-9">
                        {member.prs}%
                      </span>
                    </div>
                  </td>

                  {/* TOTAL */}
                  <td className="py-3.5 px-3 font-black text-navy dark:text-white">
                    {member.total}%
                  </td>

                  {/* TERAKHIR AKTIF */}
                  <td className="py-3.5 pl-4 text-right text-xs font-bold text-slate-muted dark:text-slate-400">
                    {member.lastActive}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST VIEW */}
        <div className="md:hidden divide-y divide-edge-soft dark:divide-slate-800">
          {pageItems.map((member) => (
            <div key={member.id} className="py-3.5 first:pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full ${member.avatarBg} ${member.avatarText} flex items-center justify-center text-xs font-extrabold shrink-0`}
                  >
                    {member.initials}
                  </div>
                  <span className="font-extrabold text-[14px] text-navy dark:text-white">
                    {member.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-faint">
                  {member.lastActive}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-3">
                {/* PP */}
                <div>
                  <div className="text-xs font-extrabold text-slate-faint uppercase mb-1">
                    PP
                  </div>
                  <div className="w-full h-[6px] bg-edge-2 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-admin-blue rounded-full"
                      style={{ width: `${member.pp}%` }}
                    />
                  </div>
                  <div className="text-xs font-extrabold text-navy dark:text-slate-200">
                    {member.pp}%
                  </div>
                </div>

                {/* ASB */}
                <div>
                  <div className="text-xs font-extrabold text-slate-faint uppercase mb-1">
                    ASB
                  </div>
                  <div className="w-full h-[6px] bg-edge-2 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-admin-blue rounded-full"
                      style={{ width: `${member.asb}%` }}
                    />
                  </div>
                  <div className="text-xs font-extrabold text-navy dark:text-slate-200">
                    {member.asb}%
                  </div>
                </div>

                {/* KR */}
                <div>
                  <div className="text-xs font-extrabold text-slate-faint uppercase mb-1">
                    KR
                  </div>
                  <div className="w-full h-[6px] bg-edge-2 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-admin-blue rounded-full"
                      style={{ width: `${member.prs}%` }}
                    />
                  </div>
                  <div className="text-xs font-extrabold text-navy dark:text-slate-200">
                    {member.prs}%
                  </div>
                </div>

                {/* TOTAL */}
                <div>
                  <div className="text-xs font-extrabold text-slate-faint uppercase mb-1">
                    TOTAL
                  </div>
                  <div className="text-[13px] font-black text-navy dark:text-white mt-1.5">
                    {member.total}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredMembers.length === 0 && (
          <div className="py-10 text-center text-sm font-bold text-slate-400">
            Anggota tidak ditemukan.
          </div>
        )}

        {/* Pagination Footer */}
        <div className="mt-5 pt-4 border-t border-edge-soft dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-muted">
            Menampilkan {filteredMembers.length ? (page-1)*10+1 : 0}–{Math.min(page*10,filteredMembers.length)} dari {filteredMembers.length} anggota
          </p>

          <div className="flex items-center gap-1.5">
            {pageButtons.map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-[10px] text-xs font-extrabold transition-colors cursor-pointer ${
                  Math.min(currentPage,pageCount) === page
                    ? "bg-red-tint border-[1.5px] border-red-strong text-red-strong"
                    : "bg-white dark:bg-slate-800 border border-edge dark:border-slate-700 text-slate-mid dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}
            {pageCount > 1 && <>
            <span className="w-8 h-8 rounded-[10px] border border-edge dark:border-slate-700 text-xs font-extrabold text-slate-faint flex items-center justify-center">
              ...
            </span>
            <button
              onClick={() => setCurrentPage(pageCount)}
              className={`w-8 h-8 rounded-[10px] text-xs font-extrabold transition-colors cursor-pointer ${
                currentPage === pageCount
                  ? "bg-red-tint border-[1.5px] border-red-strong text-red-strong"
                  : "bg-white dark:bg-slate-800 border border-edge dark:border-slate-700 text-slate-mid dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              {pageCount}
            </button>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
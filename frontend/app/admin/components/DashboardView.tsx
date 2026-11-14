"use client";

import React, { useState, useMemo } from "react";
import { MemberProgress } from "../types";
import { SearchIcon } from "./AdminIcons";

interface DashboardViewProps {
  members: MemberProgress[];
}

export default function DashboardView({ members }: DashboardViewProps) {
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
    }

    return result;
  }, [members, search, progressFilter, sortFilter]);

  return (
    <div className="space-y-4">
      {/* Blue Hero Banner with Tactile Bottom Border */}
      <div className="bg-[#43A8F6] border-b-[4px] border-[#2589D8] rounded-[20px] px-5 py-4 md:px-7 md:py-5">
        <h1 className="text-[22px] md:text-[26px] font-black text-[#1E293B] tracking-tight leading-tight">
          Dashboard
        </h1>
        <p className="text-xs md:text-[13px] font-bold text-[#1E293B]/90 mt-0.5">
          Progres belajar setiap anggota
        </p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-[#DCE3EC] border-b-[3px] dark:border-slate-800 p-4 md:p-6">
        {/* Search & Clean Tactile Filters */}
        <div className="flex flex-col md:flex-row gap-2.5 md:gap-3 mb-5">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon className="w-4 h-4 text-[#64748B]" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari anggota..."
              className="w-full h-11 pl-10 pr-4 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#43A8F6]/30"
            />
          </div>

          <div className="grid grid-cols-2 md:flex gap-2.5 md:gap-3">
            <select
              value={progressFilter}
              onChange={(e) => setProgressFilter(e.target.value)}
              aria-label="Filter progres"
              className="w-full md:w-[165px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-[#1E293B] dark:text-white appearance-none cursor-pointer focus:outline-none"
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
              className="w-full md:w-[165px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-[#1E293B] dark:text-white appearance-none cursor-pointer focus:outline-none"
            >
              <option value="recent">Terakhir aktif</option>
              <option value="highest">Progres tertinggi</option>
              <option value="name">Nama (A–Z)</option>
            </select>
          </div>
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EEF2F6] dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                <th className="pb-3 pr-4">ANGGOTA</th>
                <th className="pb-3 px-3">PP</th>
                <th className="pb-3 px-3">ASB</th>
                <th className="pb-3 px-3">PRS</th>
                <th className="pb-3 px-3">TOTAL</th>
                <th className="pb-3 pl-4 text-right">TERAKHIR AKTIF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F6] dark:divide-slate-800 text-[13px]">
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${member.avatarBg} ${member.avatarText} flex items-center justify-center text-[11px] font-extrabold shrink-0`}
                      >
                        {member.initials}
                      </div>
                      <span className="font-extrabold text-[#1E293B] dark:text-slate-100">
                        {member.name}
                      </span>
                    </div>
                  </td>

                  {/* PP */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[76px] h-[7px] bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1D8CF8] rounded-full transition-all duration-300"
                          style={{ width: `${member.pp}%` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-[#1E293B] dark:text-slate-200 w-9">
                        {member.pp}%
                      </span>
                    </div>
                  </td>

                  {/* ASB */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[76px] h-[7px] bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1D8CF8] rounded-full transition-all duration-300"
                          style={{ width: `${member.asb}%` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-[#1E293B] dark:text-slate-200 w-9">
                        {member.asb}%
                      </span>
                    </div>
                  </td>

                  {/* PRS */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-[76px] h-[7px] bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1D8CF8] rounded-full transition-all duration-300"
                          style={{ width: `${member.prs}%` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-[#1E293B] dark:text-slate-200 w-9">
                        {member.prs}%
                      </span>
                    </div>
                  </td>

                  {/* TOTAL */}
                  <td className="py-3.5 px-3 font-black text-[#1E293B] dark:text-white">
                    {member.total}%
                  </td>

                  {/* TERAKHIR AKTIF */}
                  <td className="py-3.5 pl-4 text-right text-xs font-bold text-[#64748B] dark:text-slate-400">
                    {member.lastActive}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST VIEW */}
        <div className="md:hidden divide-y divide-[#EEF2F6] dark:divide-slate-800">
          {filteredMembers.map((member) => (
            <div key={member.id} className="py-3.5 first:pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-full ${member.avatarBg} ${member.avatarText} flex items-center justify-center text-[11px] font-extrabold shrink-0`}
                  >
                    {member.initials}
                  </div>
                  <span className="font-extrabold text-[14px] text-[#1E293B] dark:text-white">
                    {member.name}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#94A3B8]">
                  {member.lastActive}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-3">
                {/* PP */}
                <div>
                  <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase mb-1">
                    PP
                  </div>
                  <div className="w-full h-[6px] bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-[#1D8CF8] rounded-full"
                      style={{ width: `${member.pp}%` }}
                    />
                  </div>
                  <div className="text-xs font-extrabold text-[#1E293B] dark:text-slate-200">
                    {member.pp}%
                  </div>
                </div>

                {/* ASB */}
                <div>
                  <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase mb-1">
                    ASB
                  </div>
                  <div className="w-full h-[6px] bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-[#1D8CF8] rounded-full"
                      style={{ width: `${member.asb}%` }}
                    />
                  </div>
                  <div className="text-xs font-extrabold text-[#1E293B] dark:text-slate-200">
                    {member.asb}%
                  </div>
                </div>

                {/* PRS */}
                <div>
                  <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase mb-1">
                    PRS
                  </div>
                  <div className="w-full h-[6px] bg-[#E2E8F0] dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-[#1D8CF8] rounded-full"
                      style={{ width: `${member.prs}%` }}
                    />
                  </div>
                  <div className="text-xs font-extrabold text-[#1E293B] dark:text-slate-200">
                    {member.prs}%
                  </div>
                </div>

                {/* TOTAL */}
                <div>
                  <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase mb-1">
                    TOTAL
                  </div>
                  <div className="text-[13px] font-black text-[#1E293B] dark:text-white mt-1.5">
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
        <div className="mt-5 pt-4 border-t border-[#EEF2F6] dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs font-bold text-[#64748B]">
            Menampilkan 1–{filteredMembers.length} dari 124 anggota
          </p>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-[10px] text-xs font-extrabold transition-colors cursor-pointer ${
                  currentPage === page
                    ? "bg-[#FEECEB] border-[1.5px] border-[#E5252A] text-[#E5252A]"
                    : "bg-white dark:bg-slate-800 border border-[#DCE3EC] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}
            <span className="w-8 h-8 rounded-[10px] border border-[#DCE3EC] dark:border-slate-700 text-xs font-extrabold text-[#94A3B8] flex items-center justify-center">
              ...
            </span>
            <button
              onClick={() => setCurrentPage(16)}
              className={`w-8 h-8 rounded-[10px] text-xs font-extrabold transition-colors cursor-pointer ${
                currentPage === 16
                  ? "bg-[#FEECEB] border-[1.5px] border-[#E5252A] text-[#E5252A]"
                  : "bg-white dark:bg-slate-800 border border-[#DCE3EC] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              16
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
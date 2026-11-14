"use client";

import React, { useState, useMemo } from "react";
import { AccountRegistration, RegistrationStatus } from "../types";
import { SearchIcon, CheckIcon } from "./AdminIcons";

interface PendaftaranViewProps {
  registrations: AccountRegistration[];
  onUpdateStatus: (id: string, status: RegistrationStatus) => void;
}

export default function PendaftaranView({
  registrations,
  onUpdateStatus,
}: PendaftaranViewProps) {
  const [activeTab, setActiveTab] = useState<RegistrationStatus>("menunggu");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    return {
      menunggu: registrations.filter((r) => r.status === "menunggu").length,
      diterima: registrations.filter((r) => r.status === "diterima").length,
      ditolak: registrations.filter((r) => r.status === "ditolak").length,
    };
  }, [registrations]);

  const filteredList = useMemo(() => {
    return registrations.filter((item) => {
      const matchTab = item.status === activeTab;
      const matchQuery =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.email.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchQuery;
    });
  }, [registrations, activeTab, search]);

  return (
    <div className="space-y-4">
      {/* Blue Hero Banner with Tactile Bottom Border */}
      <div className="bg-[#43A8F6] border-b-[4px] border-[#2589D8] rounded-[20px] px-5 py-4 md:px-7 md:py-5">
        <h1 className="text-[22px] md:text-[26px] font-black text-[#1E293B] tracking-tight leading-tight">
          Persetujuan Akun
        </h1>
        <p className="text-xs md:text-[13px] font-bold text-[#1E293B]/90 mt-0.5">
          Terima atau tolak anggota yang baru mendaftar
        </p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-[#DCE3EC] border-b-[3px] dark:border-slate-800 p-4 md:p-6">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 border-b border-[#E2E8F0] dark:border-slate-800 mb-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("menunggu")}
            className={`-mb-[1px] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-[12px] transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "menunggu"
                ? "bg-[#FEECEB] text-[#E5252A] border-b-[3px] border-[#E5252A]"
                : "text-[#64748B] hover:text-[#1E293B] dark:text-slate-400 border-b-[3px] border-transparent"
            }`}
          >
            MENUNGGU ({counts.menunggu})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("diterima")}
            className={`-mb-[1px] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-[12px] transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "diterima"
                ? "bg-[#FEECEB] text-[#E5252A] border-b-[3px] border-[#E5252A]"
                : "text-[#64748B] hover:text-[#1E293B] dark:text-slate-400 border-b-[3px] border-transparent"
            }`}
          >
            DITERIMA{counts.diterima > 0 ? ` (${counts.diterima})` : ""}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ditolak")}
            className={`-mb-[1px] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-[12px] transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "ditolak"
                ? "bg-[#FEECEB] text-[#E5252A] border-b-[3px] border-[#E5252A]"
                : "text-[#64748B] hover:text-[#1E293B] dark:text-slate-400 border-b-[3px] border-transparent"
            }`}
          >
            DITOLAK{counts.ditolak > 0 ? ` (${counts.ditolak})` : ""}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon className="w-4 h-4 text-[#64748B]" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full h-11 pl-10 pr-4 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#43A8F6]/30"
          />
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EEF2F6] dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                <th className="pb-3 pr-4">NAMA</th>
                <th className="pb-3 px-4">EMAIL</th>
                <th className="pb-3 px-4">TANGGAL DAFTAR</th>
                <th className="pb-3 pl-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F6] dark:divide-slate-800 text-[13px]">
              {filteredList.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full ${user.avatarBg} ${user.avatarText} flex items-center justify-center text-[11px] font-extrabold shrink-0`}
                      >
                        {user.initials}
                      </div>
                      <span className="font-extrabold text-[#1E293B] dark:text-slate-100">
                        {user.name}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-[#334155] dark:text-slate-300">
                    {user.email}
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-[#334155] dark:text-slate-300">
                    {user.registeredAt}
                  </td>

                  <td className="py-3.5 pl-4 text-right">
                    {user.status === "menunggu" ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(user.id, "diterima")}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[12px] bg-[#299E57] hover:bg-[#228649] text-white text-xs font-extrabold border-b-[3px] border-[#1B743E] transition-transform active:translate-y-0.5 cursor-pointer"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          <span>Terima</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(user.id, "ditolak")}
                          className="px-4 py-1.5 rounded-[12px] bg-white dark:bg-slate-800 hover:bg-[#FEECEB]/50 text-[#E5252A] text-xs font-extrabold border-[1.5px] border-[#E5252A] border-b-[3px] transition-transform active:translate-y-0.5 cursor-pointer"
                        >
                          Tolak
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(user.id, "menunggu")}
                        className="px-3.5 py-1.5 rounded-[12px] border border-[#DCE3EC] dark:border-slate-700 text-xs font-bold text-[#64748B] hover:text-[#1E293B] cursor-pointer"
                      >
                        Batalkan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST VIEW */}
        <div className="md:hidden divide-y divide-[#EEF2F6] dark:divide-slate-800">
          {filteredList.map((user) => (
            <div key={user.id} className="py-4 first:pt-1">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${user.avatarBg} ${user.avatarText} flex items-center justify-center text-[11px] font-extrabold shrink-0`}
                >
                  {user.initials}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-[14px] text-[#1E293B] dark:text-white truncate">
                    {user.name}
                  </div>
                  <div className="text-xs font-semibold text-[#64748B] truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="text-xs font-semibold text-[#64748B] mt-2.5">
                Daftar: {user.registeredAt}
              </div>

              {user.status === "menunggu" ? (
                <div className="grid grid-cols-2 gap-2.5 mt-3">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(user.id, "diterima")}
                    className="w-full py-2.5 rounded-[12px] bg-[#299E57] hover:bg-[#228649] text-white text-[13px] font-extrabold border-b-[3px] border-[#1B743E] inline-flex items-center justify-center gap-1.5 transition-transform active:translate-y-0.5 cursor-pointer"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Terima</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(user.id, "ditolak")}
                    className="w-full py-2.5 rounded-[12px] bg-white dark:bg-slate-800 hover:bg-[#FEECEB]/50 text-[#E5252A] text-[13px] font-extrabold border-[1.5px] border-[#E5252A] border-b-[3px] transition-transform active:translate-y-0.5 cursor-pointer"
                  >
                    Tolak
                  </button>
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(user.id, "menunggu")}
                    className="w-full py-2 rounded-[12px] border border-[#DCE3EC] dark:border-slate-700 text-xs font-bold text-[#64748B]"
                  >
                    Kembalikan ke Menunggu
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredList.length === 0 && (
          <div className="py-10 text-center text-sm font-bold text-slate-400">
            Tidak ada data akun pada kategori ini.
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-[#EEF2F6] dark:border-slate-800 text-center md:text-left">
          <p className="text-xs font-bold text-[#64748B]">
            {activeTab === "menunggu"
              ? `${counts.menunggu} akun menunggu persetujuan`
              : activeTab === "diterima"
              ? `${counts.diterima} akun telah diterima`
              : `${counts.ditolak} akun ditolak`}
          </p>
        </div>
      </div>
    </div>
  );
}
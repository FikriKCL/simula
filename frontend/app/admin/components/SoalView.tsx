"use client";

import React, { useState, useMemo } from "react";
import { QuizQuestion } from "../types";
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  TrashIcon,
} from "./AdminIcons";

interface SoalViewProps {
  questions: QuizQuestion[];
  onEditQuestion: (q: QuizQuestion) => void;
  onCreateQuestion: () => void;
  onDeleteQuestion: (id: string) => void;
}

export default function SoalView({
  questions,
  onEditQuestion,
  onCreateQuestion,
  onDeleteQuestion,
}: SoalViewProps) {
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch = q.question
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchTopic = topicFilter === "all" || q.topic === topicFilter;
      const matchType = typeFilter === "all" || q.type === typeFilter;
      return matchSearch && matchTopic && matchType;
    });
  }, [questions, search, topicFilter, typeFilter]);

  return (
    <div className="space-y-4">
      {/* Blue Hero Banner with Tactile Bottom Border */}
      <div className="bg-[#43A8F6] border-b-[4px] border-[#2589D8] rounded-[20px] px-5 py-4 md:px-7 md:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-black text-[#1E293B] tracking-tight leading-tight">
            Soal
          </h1>
          <p className="text-xs md:text-[13px] font-bold text-[#1E293B]/90 mt-0.5">
            Tambah, ubah, dan hapus soal
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateQuestion}
          className="shrink-0 bg-white hover:bg-slate-50 text-[#1E293B] font-extrabold text-xs md:text-[13px] px-3.5 py-2 md:px-4 md:py-2.5 rounded-[14px] border-[1.5px] border-[#1E293B] border-b-[3px] inline-flex items-center gap-1.5 transition-transform active:translate-y-0.5 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Tambah soal</span>
        </button>
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
              placeholder="Cari pertanyaan..."
              className="w-full h-11 pl-10 pr-4 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#43A8F6]/30"
            />
          </div>

          <div className="grid grid-cols-2 md:flex gap-2.5 md:gap-3">
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              aria-label="Filter materi"
              className="w-full md:w-[175px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-[#1E293B] dark:text-white appearance-none cursor-pointer focus:outline-none"
            >
              <option value="all">Semua materi</option>
              <option value="PP">PP</option>
              <option value="ASB">ASB</option>
              <option value="PRS">PRS</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter tipe soal"
              className="w-full md:w-[165px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-[#1E293B] dark:text-white appearance-none cursor-pointer focus:outline-none"
            >
              <option value="all">Semua tipe</option>
              <option value="Pilihan bergambar">Pilihan bergambar</option>
              <option value="Pilihan ganda">Pilihan ganda</option>
              <option value="Benar / salah">Benar / salah</option>
              <option value="Urutkan">Urutkan</option>
              <option value="Cocokkan">Cocokkan</option>
            </select>
          </div>
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EEF2F6] dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                <th className="pb-3 pr-3 w-12">NO</th>
                <th className="pb-3 px-3">PERTANYAAN</th>
                <th className="pb-3 px-3">MATERI</th>
                <th className="pb-3 px-3">TIPE</th>
                <th className="pb-3 px-3">LEVEL</th>
                <th className="pb-3 pl-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F6] dark:divide-slate-800 text-[13px]">
              {filteredQuestions.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 pr-3 font-extrabold text-[#64748B]">
                    {item.number}
                  </td>

                  <td className="py-3.5 px-3 font-extrabold text-[#1E293B] dark:text-slate-100">
                    {item.question}
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="inline-block bg-[#E5252A] text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      {item.topic}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 font-semibold text-[#334155] dark:text-slate-300">
                    {item.type}
                  </td>

                  <td className="py-3.5 px-3 font-semibold text-[#334155] dark:text-slate-300">
                    {item.level}
                  </td>

                  <td className="py-3.5 pl-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditQuestion(item)}
                        title="Ubah soal"
                        className="w-8 h-8 rounded-[10px] border border-[#DCE3EC] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-[#334155] dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteQuestion(item.id)}
                        title="Hapus soal"
                        className="w-8 h-8 rounded-[10px] border border-[#DCE3EC] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#FEECEB] text-[#E5252A] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST VIEW */}
        <div className="md:hidden divide-y divide-[#EEF2F6] dark:divide-slate-800">
          {filteredQuestions.map((item) => (
            <div
              key={item.id}
              className="py-3.5 first:pt-1 flex items-center justify-between gap-2.5"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-xs font-extrabold text-[#64748B] pt-0.5 w-4 shrink-0">
                  {item.number}
                </span>
                <div className="min-w-0">
                  <p className="font-extrabold text-[14px] text-[#1E293B] dark:text-white leading-snug">
                    {item.question}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-block bg-[#E5252A] text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {item.topic}
                    </span>
                    <span className="text-xs font-semibold text-[#64748B]">
                      {item.type} · {item.level}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditQuestion(item)}
                  aria-label="Ubah soal"
                  className="w-8 h-8 rounded-[10px] border border-[#DCE3EC] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#334155] flex items-center justify-center"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteQuestion(item.id)}
                  aria-label="Hapus soal"
                  className="w-8 h-8 rounded-[10px] border border-[#DCE3EC] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#E5252A] flex items-center justify-center"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredQuestions.length === 0 && (
          <div className="py-10 text-center text-sm font-bold text-slate-400">
            Soal tidak ditemukan.
          </div>
        )}

        {/* Pagination Footer */}
        <div className="mt-5 pt-4 border-t border-[#EEF2F6] dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs font-bold text-[#64748B]">
            Menampilkan 1–{filteredQuestions.length} dari 120 soal
          </p>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                type="button"
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
              type="button"
              onClick={() => setCurrentPage(18)}
              className={`w-8 h-8 rounded-[10px] text-xs font-extrabold transition-colors cursor-pointer ${
                currentPage === 18
                  ? "bg-[#FEECEB] border-[1.5px] border-[#E5252A] text-[#E5252A]"
                  : "bg-white dark:bg-slate-800 border border-[#DCE3EC] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              18
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
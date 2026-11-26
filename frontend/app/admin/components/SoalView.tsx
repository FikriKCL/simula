"use client";

import React, { useState, useMemo } from "react";
import { QuizQuestion } from "../types";
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  TrashIcon,
} from "./AdminIcons";
import { DateSortSelect, compareByDate, type DateSort } from "./Shared";

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
  const [sort, setSort] = useState<DateSort>("newest");
  const [currentPage, setCurrentPage] = useState<number>(1);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSearch = q.question
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchTopic = topicFilter === "all" || q.topic === topicFilter;
      const matchType = typeFilter === "all" || q.type === typeFilter;
      return matchSearch && matchTopic && matchType;
    }).sort((a, b) => compareByDate(sort, a, b));
  }, [questions, search, topicFilter, typeFilter, sort]);

  const pageCount=Math.max(1,Math.ceil(filteredQuestions.length/10));
  const page=Math.min(currentPage,pageCount);
  const pageItems=filteredQuestions.slice((page-1)*10,page*10);
  const pageButtons=Array.from(new Set([1,...[page-1,page,page+1].filter(n=>n>1&&n<pageCount)])).sort((a,b)=>a-b);

  return (
    <div className="space-y-4">
      {/* Blue Hero Banner with Tactile Bottom Border */}
      <div className="bg-admin-sky border-b-[4px] border-admin-sky-edge rounded-[20px] px-5 py-4 md:px-7 md:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-black text-navy tracking-tight leading-tight">
            Soal
          </h1>
          <p className="text-xs md:text-[13px] font-bold text-navy/90 mt-0.5">
            Tambah, ubah, dan hapus soal
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateQuestion}
          className="shrink-0 bg-white hover:bg-slate-50 text-navy font-extrabold text-xs md:text-[13px] px-3.5 py-2 md:px-4 md:py-2.5 rounded-[14px] border-[1.5px] border-navy border-b-[3px] inline-flex items-center gap-1.5 transition-transform active:translate-y-0.5 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Tambah soal</span>
        </button>
      </div>

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
              placeholder="Cari pertanyaan..."
              className="w-full h-11 pl-10 pr-4 rounded-[14px] border-[1.5px] border-navy dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-navy dark:text-white placeholder:text-slate-faint focus:outline-none focus:ring-2 focus:ring-admin-sky/30"
            />
          </div>

          <div className="grid grid-cols-2 md:flex gap-2.5 md:gap-3">
            <DateSortSelect value={sort} onChange={(v)=>{setSort(v);setCurrentPage(1);}} className="col-span-2 md:col-span-1" />
            <select
              value={topicFilter}
              onChange={(e) => {setTopicFilter(e.target.value);setCurrentPage(1);}}
              aria-label="Filter materi"
              className="w-full md:w-[175px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-navy dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-navy dark:text-white appearance-none cursor-pointer focus:outline-none"
            >
              <option value="all">Semua kategori</option>
              <option value="PP">PP</option>
              <option value="ASB">ASB</option>
              <option value="KR">KR</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {setTypeFilter(e.target.value);setCurrentPage(1);}}
              aria-label="Filter tipe soal"
              className="w-full md:w-[165px] h-11 px-3.5 rounded-[14px] border-[1.5px] border-navy dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-bold text-navy dark:text-white appearance-none cursor-pointer focus:outline-none"
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
              <tr className="border-b border-edge-soft dark:border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-faint">
                <th className="pb-3 pr-3 w-12">NO</th>
                <th className="pb-3 px-3">PERTANYAAN</th>
                <th className="pb-3 px-3">KATEGORI</th>
                <th className="pb-3 px-3">TIPE</th>
                <th className="pb-3 px-3">LEVEL</th>
                <th className="pb-3 pl-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-soft dark:divide-slate-800 text-[13px]">
              {pageItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 pr-3 font-extrabold text-slate-muted">
                    {item.number}
                  </td>

                  <td className="py-3.5 px-3 font-extrabold text-navy dark:text-slate-100">
                    {item.question}
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="inline-block bg-red-strong text-white text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      {item.topic}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 font-semibold text-slate-ink dark:text-slate-300">
                    {item.type}
                  </td>

                  <td className="py-3.5 px-3 font-semibold text-slate-ink dark:text-slate-300">
                    {item.level}
                  </td>

                  <td className="py-3.5 pl-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditQuestion(item)}
                        title="Ubah soal"
                        className="w-8 h-8 rounded-[10px] border border-edge dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-ink dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteQuestion(item.id)}
                        title="Hapus soal"
                        className="w-8 h-8 rounded-[10px] border border-edge dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-red-tint text-red-strong flex items-center justify-center transition-colors cursor-pointer"
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
        <div className="md:hidden divide-y divide-edge-soft dark:divide-slate-800">
          {pageItems.map((item) => (
            <div
              key={item.id}
              className="py-3.5 first:pt-1 flex items-center justify-between gap-2.5"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-xs font-extrabold text-slate-muted pt-0.5 w-4 shrink-0">
                  {item.number}
                </span>
                <div className="min-w-0">
                  <p className="font-extrabold text-[14px] text-navy dark:text-white leading-snug">
                    {item.question}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-block bg-red-strong text-white text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {item.topic}
                    </span>
                    <span className="text-xs font-semibold text-slate-muted">
                      {item.type}, {item.level}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditQuestion(item)}
                  aria-label="Ubah soal"
                  className="w-8 h-8 rounded-[10px] border border-edge dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-ink flex items-center justify-center"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteQuestion(item.id)}
                  aria-label="Hapus soal"
                  className="w-8 h-8 rounded-[10px] border border-edge dark:border-slate-700 bg-white dark:bg-slate-800 text-red-strong flex items-center justify-center"
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
        <div className="mt-5 pt-4 border-t border-edge-soft dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-muted">
            Menampilkan {filteredQuestions.length ? (page-1)*10+1 : 0}–{Math.min(page*10,filteredQuestions.length)} dari {filteredQuestions.length} soal
          </p>

          <div className="flex items-center gap-1.5">
            {pageButtons.map((page) => (
              <button
                key={page}
                type="button"
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
              type="button"
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
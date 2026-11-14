"use client";

import React, { useState } from "react";
import {
  QuizQuestion,
  QuestionType,
  TopicCode,
  QuestionOption,
} from "../types";
import { PlusIcon, TrashIcon } from "./AdminIcons";

interface SoalEditViewProps {
  question: QuizQuestion;
  isNew?: boolean;
  onBack: () => void;
  onSave: (updated: QuizQuestion) => void;
  onDelete: (id: string) => void;
}

const QUESTION_TYPES: QuestionType[] = [
  "Pilihan ganda",
  "Pilihan bergambar",
  "Benar / salah",
  "Cocokkan",
  "Urutkan",
];

const TOPIC_OPTIONS = [
  "Pertolongan Pertama (PP)",
  "Ayo Siaga Bencana (ASB)",
  "Pendidikan Remaja Sebaya (PRS)",
];

export default function SoalEditView({
  question,
  isNew = false,
  onBack,
  onSave,
  onDelete,
}: SoalEditViewProps) {
  const [topicFull, setTopicFull] = useState(question.topicFull);
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [level, setLevel] = useState(question.level);
  const [selectedType, setSelectedType] = useState<QuestionType>(question.type);
  const [prompt, setPrompt] = useState(question.question);
  const [options, setOptions] = useState<QuestionOption[]>(question.options);
  const [correctOptionId, setCorrectOptionId] = useState(
    question.correctOptionId
  );
  const [explanation, setExplanation] = useState(question.explanation);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleOptionTextChange = (id: string, value: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, text: value } : opt))
    );
  };

  const handleOptionImageAttach = (id: string, fileName: string) => {
    setOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, imageUrl: fileName } : opt))
    );
  };

  const handleAddOption = () => {
    const newId = `opt-${Date.now()}`;
    setOptions((prev) => [...prev, { id: newId, text: "" }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const derivedTopic: TopicCode = topicFull.includes("ASB")
      ? "ASB"
      : topicFull.includes("PRS")
      ? "PRS"
      : "PP";

    onSave({
      ...question,
      topic: derivedTopic,
      topicFull,
      level,
      type: selectedType,
      question: prompt,
      options,
      correctOptionId,
      explanation,
    });
  };

  const breadcrumbTopic = topicFull
    .replace(" (PP)", "")
    .replace(" (ASB)", "")
    .replace(" (PRS)", "");

  return (
    <div className="space-y-4">
      {/* Blue Hero Banner with Tactile Bottom Border */}
      <div className="bg-[#43A8F6] border-b-[4px] border-[#2589D8] rounded-[20px] px-5 py-4 md:px-7 md:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-black text-[#1E293B] tracking-tight leading-tight">
            {isNew ? "Tambah Soal" : "Ubah Soal"}
          </h1>
          <p className="text-xs md:text-[13px] font-bold text-[#1E293B]/90 mt-0.5">
            Soal › {breadcrumbTopic} › {level}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="shrink-0 bg-white hover:bg-slate-50 text-[#1E293B] font-extrabold text-xs md:text-[13px] px-4 py-2 md:px-4 md:py-2.5 rounded-[14px] border-[1.5px] border-[#1E293B] border-b-[3px] transition-transform active:translate-y-0.5 cursor-pointer"
        >
          <span className="md:hidden">Kembali</span>
          <span className="hidden md:inline">Kembali ke daftar</span>
        </button>
      </div>

      {/* Main Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-[#DCE3EC] border-b-[3px] dark:border-slate-800 p-4 md:p-6 space-y-5"
      >
        {/* Row 1: Materi & Level */}
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          <div className="relative">
            <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-1.5">
              Materi
            </label>
            <button
              type="button"
              onClick={() => setIsTopicDropdownOpen((prev) => !prev)}
              className="w-full min-h-[48px] md:min-h-[44px] px-3.5 py-2 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-left text-[13px] font-semibold text-[#1E293B] dark:text-white leading-snug cursor-pointer focus:outline-none"
            >
              {topicFull}
            </button>

            {isTopicDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 z-20 bg-white dark:bg-slate-800 rounded-[14px] border-[1.5px] border-[#1E293B] shadow-lg overflow-hidden">
                {TOPIC_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setTopicFull(option);
                      setIsTopicDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-[13px] font-bold transition-colors cursor-pointer ${
                      topicFull === option
                        ? "bg-[#FEECEB] text-[#E5252A]"
                        : "text-[#1E293B] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-1.5">
              Level
            </label>
            <input
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full h-[48px] md:h-[44px] px-3.5 py-2 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Row 2: Tipe Soal */}
        <div>
          <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-2">
            Tipe soal
          </label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => {
              const isSelected = selectedType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#FEECEB] border-[1.5px] border-[#E5252A] text-[#E5252A]"
                      : "bg-white dark:bg-slate-800 border border-[#DCE3EC] dark:border-slate-700 text-[#64748B] dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Pertanyaan & Gambar Pertanyaan (Opsional) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          <div>
            <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-1.5">
              Pertanyaan
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full h-24 md:h-[108px] p-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#43A8F6]/30"
            />
          </div>

          <div>
            <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-1.5">
              Gambar pertanyaan (opsional)
            </label>
            <label className="w-full h-24 md:h-[108px] rounded-[14px] border-2 border-dashed border-[#43A8F6] bg-[#EAF5FF] dark:bg-sky-950/30 hover:bg-[#DCEEFF] transition-colors flex items-center justify-center px-6 text-center cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setUploadedFileName(file.name);
                }}
              />
              <span className="inline-flex items-center justify-center gap-2 text-xs md:text-[13px] font-extrabold text-[#1D8CF8] leading-snug">
                <PlusIcon className="w-4 h-4 shrink-0" />
                <span>
                  {uploadedFileName
                    ? uploadedFileName
                    : "Unggah gambar · PNG atau JPG, maks. 2 MB"}
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Row 4: Opsi Jawaban */}
        <div>
          <div className="text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-2.5">
            Opsi jawaban{" "}
            <span className="font-semibold text-[#64748B] text-xs">
              (pilih satu jawaban benar)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-5 md:gap-y-3">
            {options.map((opt) => {
              const isCorrect = opt.id === correctOptionId;
              return (
                <div key={opt.id} className="flex items-center gap-2.5">
                  {/* Radio Button */}
                  <button
                    type="button"
                    onClick={() => setCorrectOptionId(opt.id)}
                    aria-label={`Pilih ${opt.text} sebagai jawaban benar`}
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      isCorrect
                        ? "border-2 border-[#E5252A] bg-white"
                        : "border-[1.5px] border-[#94A3B8] bg-white"
                    }`}
                  >
                    {isCorrect && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E5252A]" />
                    )}
                  </button>

                  {/* Option Text Input */}
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) =>
                      handleOptionTextChange(opt.id, e.target.value)
                    }
                    placeholder="Tulis opsi jawaban..."
                    className="flex-1 h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white focus:outline-none"
                  />

                  {/* Tactile Gambar Button */}
                  <label
                    title={
                      opt.imageUrl
                        ? `Terlampir: ${opt.imageUrl}`
                        : "Unggah gambar opsi"
                    }
                    className="shrink-0 h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] border-b-[3px] bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-extrabold text-[#1E293B] dark:text-white inline-flex items-center justify-center cursor-pointer active:translate-y-0.5"
                  >
                    <span>{opt.imageUrl ? "✓ Gambar" : "Gambar"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleOptionImageAttach(opt.id, file.name);
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddOption}
            className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#E5252A] hover:underline cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Tambah opsi</span>
          </button>
        </div>

        {/* Row 5: Penjelasan setelah menjawab */}
        <div>
          <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-1.5">
            Penjelasan setelah menjawab
          </label>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className="w-full h-20 md:h-[72px] p-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white resize-none focus:outline-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#EEF2F6] dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onDelete(question.id)}
            className="px-4 py-2.5 rounded-[14px] bg-white dark:bg-slate-800 hover:bg-[#FEECEB]/50 text-[#E5252A] font-extrabold text-xs md:text-[13px] border-[1.5px] border-[#E5252A] border-b-[3px] inline-flex items-center gap-1.5 transition-transform active:translate-y-0.5 cursor-pointer"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Hapus soal</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-[14px] bg-[#E5252A] hover:bg-[#c81e23] text-white font-extrabold text-xs md:text-[13px] border-b-[3px] border-[#991B1B] transition-transform active:translate-y-0.5 cursor-pointer"
          >
            Simpan perubahan
          </button>
        </div>
      </form>
    </div>
  );
}
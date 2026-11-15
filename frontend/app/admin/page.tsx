"use client";

import React, { useState } from "react";
import {
  AdminTab,
  AccountRegistration,
  LearningMaterial,
  QuizQuestion,
  RegistrationStatus,
} from "./types";
import {
  INITIAL_MEMBERS,
  INITIAL_REGISTRATIONS,
  INITIAL_MATERIALS,
  INITIAL_QUESTIONS,
} from "./mockData";
import {
  SimulaLogo,
  IndonesiaFlagIcon,
  SunIcon,
  MoonIcon,
  DashboardNavIcon,
  PendaftaranNavIcon,
  MateriNavIcon,
  SoalNavIcon,
} from "./components/AdminIcons";
import DashboardView from "./components/DashboardView";
import PendaftaranView from "./components/PendaftaranView";
import MateriView from "./components/MateriView";
import SoalView from "./components/SoalView";
import SoalEditView from "./components/SoalEditView";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [darkMode, setDarkMode] = useState(false);

  const [members] = useState(INITIAL_MEMBERS);
  const [registrations, setRegistrations] = useState<AccountRegistration[]>(
    INITIAL_REGISTRATIONS
  );
  const [materials, setMaterials] =
    useState<LearningMaterial[]>(INITIAL_MATERIALS);
  const [questions, setQuestions] = useState<QuizQuestion[]>(INITIAL_QUESTIONS);

  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(
    null
  );
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const handleUpdateRegistration = (id: string, status: RegistrationStatus) => {
    setRegistrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    if (status === "diterima") showToast("Akun anggota berhasil diterima.");
    if (status === "ditolak") showToast("Pendaftaran akun ditolak.");
  };

  const handleAddMaterial = (newMat: Omit<LearningMaterial, "id">) => {
    setMaterials((prev) => [{ ...newMat, id: `mat-${Date.now()}` }, ...prev]);
    showToast("Materi baru berhasil diunggah.");
  };

  const handleUpdateMaterial = (updated: LearningMaterial) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
    showToast("Perubahan materi disimpan.");
  };

  const handleDeleteMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    showToast("Materi berhasil dihapus.");
  };

  const handleCreateQuestion = () => {
    setIsCreatingQuestion(true);
    setEditingQuestion({
      id: `q-${Date.now()}`,
      number: questions.length + 1,
      question: "",
      topic: "PP",
      topicFull: "Pertolongan Pertama (PP)",
      type: "Pilihan bergambar",
      level: "Level 1",
      options: [
        { id: "opt-1", text: "" },
        { id: "opt-2", text: "" },
        { id: "opt-3", text: "" },
        { id: "opt-4", text: "" },
      ],
      correctOptionId: "opt-1",
      explanation: "",
    });
  };

  const handleSaveQuestion = (saved: QuizQuestion) => {
    if (isCreatingQuestion) {
      setQuestions((prev) => [...prev, saved]);
      showToast("Soal baru berhasil ditambahkan.");
    } else {
      setQuestions((prev) =>
        prev.map((q) => (q.id === saved.id ? saved : q))
      );
      showToast("Perubahan soal berhasil disimpan.");
    }
    setEditingQuestion(null);
    setIsCreatingQuestion(false);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setEditingQuestion(null);
    setIsCreatingQuestion(false);
    showToast("Soal berhasil dihapus.");
  };

  const handleSwitchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setEditingQuestion(null);
    setIsCreatingQuestion(false);
  };

  const navItems: {
    key: AdminTab;
    label: string;
    renderIcon: (active: boolean) => React.ReactNode;
  }[] = [
    {
      key: "dashboard",
      label: "DASHBOARD",
      renderIcon: (active) => <DashboardNavIcon active={active} />,
    },
    {
      key: "pendaftaran",
      label: "PENDAFTARAN",
      renderIcon: (active) => <PendaftaranNavIcon active={active} />,
    },
    {
      key: "materi",
      label: "MATERI",
      renderIcon: (active) => <MateriNavIcon active={active} />,
    },
    {
      key: "soal",
      label: "SOAL",
      renderIcon: (active) => <SoalNavIcon active={active} />,
    },
  ];

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-[#F7F9FC] dark:bg-slate-950 text-[#1E293B] dark:text-slate-100 flex flex-col md:flex-row">
        {/* DESKTOP LEFT SIDEBAR */}
        <aside className="hidden md:flex md:w-[215px] md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-[#E2E8F0] dark:border-slate-800 px-3.5 py-6 z-30">
          <div className="px-2.5 mb-7">
            <SimulaLogo />
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSwitchTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] text-[12px] font-extrabold tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#FEECEB] border-[1.5px] border-[#E5252A] text-[#E5252A]"
                      : "text-[#64748B] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-[1.5px] border-transparent"
                  }`}
                >
                  {item.renderIcon(isActive)}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN CONTENT SHELL */}
        <div className="flex-1 md:pl-[215px] flex flex-col min-h-screen pb-24 md:pb-10">
          {/* TOP HEADER BAR */}
          <header className="w-full px-4 md:px-7 pt-4 pb-3 flex items-center justify-between md:justify-end">
            {/* Logo on Mobile */}
            <div className="md:hidden">
              <SimulaLogo />
            </div>

            {/* Right Controls: Flag + Theme Toggle + Admin Pill */}
            <div className="flex items-center gap-2.5 md:gap-3">
              <IndonesiaFlagIcon />

              {/* Theme Toggle Switch */}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                aria-label="Ubah tema tampilan"
                className="bg-[#F1F5F9] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-full p-1 flex items-center gap-1 cursor-pointer"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    !darkMode
                      ? "bg-white text-[#F59E0B] shadow-2xs"
                      : "text-slate-400"
                  }`}
                >
                  <SunIcon />
                </span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    darkMode
                      ? "bg-slate-900 text-sky-400 shadow-2xs"
                      : "text-[#64748B]"
                  }`}
                >
                  <MoonIcon />
                </span>
              </button>

              {/* Admin Profile Pill */}
              <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-full pl-1.5 pr-3.5 py-1 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#FEF3C7] text-[#92400E] text-[11px] font-black flex items-center justify-center">
                  AD
                </div>
                <span className="text-[13px] font-extrabold text-[#1E293B] dark:text-white">
                  Admin
                </span>
              </div>
            </div>
          </header>

          {/* DYNAMIC VIEW CONTENT */}
          <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 md:px-7 pt-1">
            {activeTab === "dashboard" && <DashboardView members={members} />}

            {activeTab === "pendaftaran" && (
              <PendaftaranView
                registrations={registrations}
                onUpdateStatus={handleUpdateRegistration}
              />
            )}

            {activeTab === "materi" && (
              <MateriView
                materials={materials}
                onAddMaterial={handleAddMaterial}
                onUpdateMaterial={handleUpdateMaterial}
                onDeleteMaterial={handleDeleteMaterial}
              />
            )}

            {activeTab === "soal" && !editingQuestion && (
              <SoalView
                questions={questions}
                onEditQuestion={(q) => {
                  setIsCreatingQuestion(false);
                  setEditingQuestion(q);
                }}
                onCreateQuestion={handleCreateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
              />
            )}

            {activeTab === "soal" && editingQuestion && (
              <SoalEditView
                question={editingQuestion}
                isNew={isCreatingQuestion}
                onBack={() => {
                  setEditingQuestion(null);
                  setIsCreatingQuestion(false);
                }}
                onSave={handleSaveQuestion}
                onDelete={handleDeleteQuestion}
              />
            )}
          </main>
        </div>

        {/* MOBILE FIXED BOTTOM NAVIGATION BAR */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-800 px-2 py-2 flex items-center justify-around z-40">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleSwitchTab(item.key)}
                className={`flex flex-col items-center justify-center gap-1 min-w-[74px] py-1.5 px-2.5 rounded-[14px] transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#FEECEB] border-[1.5px] border-[#E5252A] text-[#E5252A]"
                    : "text-[#64748B] dark:text-slate-400 border-[1.5px] border-transparent"
                }`}
              >
                {item.renderIcon(isActive)}
                <span className="text-[9px] font-extrabold tracking-wide leading-none uppercase">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-50 bg-[#1E293B] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminTab,
  LearningMaterial,
  QuizQuestion,
  RegistrationStatus,
} from "./types";
import {api, logout} from "@/lib/api";
import { useTheme } from "@/lib/theme";
import ApiState from "@/components/ApiState";
import {mapWorkspace, type Workspace} from "./adapter";
import {
  SimulaLogo,
  IndonesiaFlagIcon,
  SunIcon,
  MoonIcon,
  DashboardNavIcon,
  PendaftaranNavIcon,
  MateriNavIcon,
  SoalNavIcon,
} from "../../components/Icons";
import DashboardView from "./components/DashboardView";
import PendaftaranView from "./components/PendaftaranView";
import MateriView from "./components/MateriView";
import SoalView from "./components/SoalView";
import SoalEditView from "./components/SoalEditView";
import LevelView from "./components/LevelView";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const { resolved, setTheme } = useTheme();
  const darkMode = resolved === "dark";
  const setDarkMode = (dark: boolean) => setTheme(dark ? "dark" : "light");

  const [data,setData] = useState<Workspace|null>(null);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const pending = useRef(false);
  const [version,setVersion] = useState(0);
  const [account,setAccount] = useState<{display_name:string}|null>(null);
  const reload = () => setVersion(v=>v+1);
  useEffect(()=>{let active=true;Promise.all([api<Workspace>("/admin/workspace"),api<{display_name:string}>("/users/me")]).then(([value,user])=>{if(active){setData(value);setAccount(user);setError("");}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[version]);
  const {members,registrations,materials,questions}=useMemo(()=>data?mapWorkspace(data):{members:[],registrations:[],materials:[],questions:[]},[data]);
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

  async function mutate(action:()=>Promise<unknown>,message:string){
    if(pending.current)throw new Error("Tunggu sampai penyimpanan selesai.");
    pending.current=true;setBusy(true);setError("");
    try{await action();showToast(message);reload();}catch(e){setError((e as Error).message);throw e;}finally{pending.current=false;setBusy(false);}
  }
  const handleUpdateRegistration=async(id:string,status:RegistrationStatus)=>{
    if(status!=="diterima"&&!window.confirm(status==="menunggu"?"Kembalikan akun ke menunggu? Akun tidak dapat login sampai disetujui kembali.":"Tolak/nonaktifkan akun ini?"))return;
    try{await mutate(()=>api(`/admin/registrations/${id}`,{method:"PATCH",body:JSON.stringify({status:status==="diterima"?"APPROVED":status==="menunggu"?"PENDING":"REJECTED"})}),"Status akun disimpan.");}catch{}
  };
  function materialPayload(m:Omit<LearningMaterial,"id">){return {title:m.title,kind:m.type==="KOMIK"?"COMIC":m.type,meta:m.size,body:m.body||"",thumbnail_key:m.thumbnailKey||null,thumbnail_url:m.thumbnailUrl||null,url:m.url||null,pages:m.type==="KOMIK"?m.pages||[]:[],video_provider:m.type==="VIDEO"?m.videoProvider||null:null,video_id:m.type==="VIDEO"?m.videoId||null:null,duration_seconds:m.type==="VIDEO"?m.durationSeconds||null:null,position:m.position||1,required:m.required??true};}
  const handleAddMaterial=async(m:Omit<LearningMaterial,"id">)=>{
    if(!m.lessonId)throw new Error("Pilih pelajaran terlebih dahulu.");
    const selected=data?.modules.find(v=>v.id===data.lessons.find(l=>l.id===m.lessonId)?.module_id);
    const withdraw=selected?.status==="PUBLISHED";
    if(withdraw&&!window.confirm("Menambahkan materi akan menarik modul terbit ke DRAFT untuk ditinjau ulang. Lanjutkan?"))throw new Error("Penyimpanan dibatalkan.");
    const position=m.position||Math.max(0,...materials.filter(v=>v.lessonId===m.lessonId).map(v=>v.position||0))+1;
    await mutate(()=>api(`/admin/lessons/${m.lessonId}/materials?withdraw=${withdraw}`,{method:"POST",body:JSON.stringify(materialPayload({...m,position}))}),"Materi tersimpan.");
  };
  const handleUpdateMaterial=async(m:LearningMaterial)=>{
    const current=materials.find(v=>v.id===m.id);
    const withdraw=current?.moduleStatus==="PUBLISHED";
    if(withdraw&&!window.confirm("Materi sudah terbit. Menyimpan revisi akan menarik seluruh modul ke DRAFT sampai ditinjau dan diterbitkan kembali. Progres siswa tetap disimpan. Lanjutkan?"))throw new Error("Penyimpanan dibatalkan.");
    await mutate(()=>api(`/admin/materials/${m.id}?withdraw=${withdraw}`,{method:"PUT",body:JSON.stringify(materialPayload(m))}),withdraw?"Revisi disimpan; modul kembali DRAFT.":"Materi diperbarui.");
  };
  const handleDeleteMaterial=async(id:string)=>{
    const m=materials.find(v=>v.id===id);const withdraw=m?.moduleStatus==="PUBLISHED";
    if(!window.confirm(withdraw?"Hapus materi ini dan tarik seluruh modul dari publikasi ke DRAFT?":"Hapus materi ini?"))return;
    try{await mutate(()=>api(`/admin/materials/${id}?withdraw=${withdraw}`,{method:"DELETE"}),"Materi dihapus.");}catch{}
  };

  const handleCreateQuestion = () => {
    setIsCreatingQuestion(true);
    setEditingQuestion({
      id: `q-${Date.now()}`,
      number: questions.length + 1,
      question: "",
      topic: "PP",
      topicFull: "Pertolongan Pertama (PP)",
      type: "Pilihan ganda",
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

  const handleSaveQuestion=async(saved:QuizQuestion)=>{
    if(!saved.quizId)throw new Error("Pilih kuis tujuan.");
    const sequence=saved.type==="Urutkan"||saved.type==="Cocokkan";
    const payload={question_type:saved.type==="Benar / salah"?"TRUE_FALSE":saved.type==="Urutkan"?"ORDERING":saved.type==="Cocokkan"?"MATCHING":saved.type==="Pilihan bergambar"?"IMAGE_CHOICE":"SINGLE_CHOICE",left_items:saved.type==="Cocokkan"?saved.options.map(o=>(o.leftText||"").trim()):[],prompt:saved.question,options:saved.options.map(o=>o.text),correct_index:sequence?0:saved.options.findIndex(o=>o.id===saved.correctOptionId),explanation:saved.explanation,image_url:saved.imageUrl||null,option_images:sequence?[]:saved.options.map(o=>o.imageUrl||null)};
    if(isCreatingQuestion&&saved.quizId<0){
      const topicId=data?.topics.find(t=>t.code===saved.topic)?.id;
      const selected=data?.modules.find(m=>m.topic_id===topicId&&m.level===Number(saved.level.replace(/[^0-9]/g,"")));
      if(!selected)throw new Error("Modul tujuan tidak ditemukan.");
      await mutate(()=>api(`/modules/${selected.id}/quizzes`,{method:"POST",body:JSON.stringify({title:`${saved.quizId===-1?"Latihan awal":"Tes akhir"} ${selected.title}`,kind:saved.quizId===-1?"PRE":"POST",pass_score:70,questions:[payload]})}),"Kuis dan soal pertama disimpan.");
    }else await mutate(()=>api(isCreatingQuestion?`/admin/quizzes/${saved.quizId}/questions`:`/admin/quizzes/${saved.quizId}/questions/${saved.id}`,{method:isCreatingQuestion?"POST":"PUT",body:JSON.stringify(payload)}),"Soal disimpan.");setEditingQuestion(null);setIsCreatingQuestion(false);
  };
  const handleDeleteQuestion=async(id:string)=>{
    if(isCreatingQuestion&&id===editingQuestion?.id){setEditingQuestion(null);setIsCreatingQuestion(false);return;}
    const q=questions.find(v=>v.id===id);if(!q?.quizId)return;
    if(!window.confirm("Arsipkan soal ini? Riwayat hasil dan sesi tes yang sudah dimulai tetap disimpan."))return;
    try{await mutate(()=>api(`/admin/quizzes/${q.quizId}/questions/${id}/active`,{method:"PATCH",body:JSON.stringify({active:false})}),"Soal diarsipkan.");setEditingQuestion(null);setIsCreatingQuestion(false);}catch{}
  };

  const handleSwitchTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setEditingQuestion(null);
    setIsCreatingQuestion(false);
  };

  const handleLogout = logout;

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
      key: "level",
      label: "LEVEL",
      renderIcon: (active) => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" aria-hidden="true">
          <path d="M4 19h4v-5H4v5Zm6 0h4V9h-4v10Zm6 0h4V4h-4v15Z" fill={active ? "#E5252A" : "currentColor"} opacity={active ? 1 : 0.7} />
        </svg>
      ),
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
      <div className="min-h-screen bg-paper-admin dark:bg-slate-950 text-navy dark:text-slate-100 flex flex-col md:flex-row">
        {/* DESKTOP LEFT SIDEBAR */}
        <aside className="hidden md:flex md:w-[225px] md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-edge-2 dark:border-slate-800 px-3.5 py-6 z-30">
          <div className="px-2.5 mb-7">
            <button type="button" aria-label="Kembali ke dashboard admin" onClick={() => handleSwitchTab("dashboard")} className="cursor-pointer"><SimulaLogo /></button>
          </div>

          <nav className="space-y-2.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSwitchTab(item.key)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-[16px] text-[12px] font-extrabold tracking-wider transition cursor-pointer ${
                    isActive
                      ? "bg-red-tint border-[1.5px] border-red-strong text-red-strong"
                      : "text-slate-muted dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-[1.5px] border-transparent"
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
        <div className="flex-1 md:pl-[225px] flex flex-col min-h-screen pb-24 md:pb-10">
          {/* TOP HEADER BAR */}
          <header className="w-full px-4 md:px-7 pt-3.5 pb-2.5 flex items-center justify-between md:justify-end">
            {/* Compact Logo on Mobile Header */}
            <div className="md:hidden">
              <button type="button" aria-label="Kembali ke dashboard admin" onClick={() => handleSwitchTab("dashboard")} className="cursor-pointer"><SimulaLogo compact /></button>
            </div>

            {/* Right Controls: Flag + Theme Toggle + Admin Pill */}
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              <span className="hidden sm:inline-flex"><IndonesiaFlagIcon /></span>

              {/* Theme Toggle Switch */}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                aria-label="Ubah tema tampilan"
                className="bg-edge-soft dark:bg-slate-800 border border-edge dark:border-slate-700 rounded-full p-0.5 flex items-center gap-0.5 cursor-pointer"
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                    !darkMode
                      ? "bg-white text-amber shadow-2xs"
                      : "text-slate-400"
                  }`}
                >
                  <SunIcon />
                </span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                    darkMode
                      ? "bg-slate-900 text-sky-400 shadow-2xs"
                      : "text-slate-muted"
                  }`}
                >
                  <MoonIcon />
                </span>
              </button>

              <button type="button" onClick={handleLogout} className="rounded-[12px] border border-edge dark:border-slate-700 px-3 py-2 text-xs font-extrabold text-red-strong hover:bg-red-tint cursor-pointer">Keluar</button>
              {/* Admin Profile Pill */}
              <div title={account?.display_name || "Admin"} className="bg-white dark:bg-slate-900 border border-edge dark:border-slate-800 rounded-full p-1 sm:pl-1 sm:pr-3 flex items-center gap-1.5">
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-amber-tint text-navy text-xs md:text-xs font-black flex items-center justify-center">
                  AD
                </div>
                <span className="hidden sm:inline max-w-[160px] truncate text-xs md:text-[13px] font-extrabold text-navy dark:text-white">
                  {account?.display_name || "Admin"}
                </span>
              </div>
            </div>
          </header>

          {/* DYNAMIC VIEW CONTENT */}
          <main aria-busy={busy} className="flex-1 w-full max-w-[1180px] mx-auto px-4 md:px-7 pt-1">
            <ApiState loading={loading} error={error} retry={reload}/>
            {busy && <p role="status">Menyimpan perubahan…</p>}
            {activeTab === "dashboard" && (
              <DashboardView
                members={members}
                onGoto={(tab) => handleSwitchTab(tab)}
                overview={data ? [
                  { label: "Siswa", value: members.length },
                  { label: "Pendaftaran menunggu", value: registrations.filter((r) => r.status === "menunggu").length, tab: "pendaftaran" },
                  { label: "Level terbit", value: data.modules.filter((m) => m.status === "PUBLISHED").length, tab: "level" },
                  { label: "Materi", value: materials.length, tab: "materi" },
                  { label: "Soal aktif", value: questions.length, tab: "soal" },
                ] : []}
              />
            )}

            {activeTab === "pendaftaran" && (
              <PendaftaranView
                registrations={registrations}
                onUpdateStatus={handleUpdateRegistration}
              />
            )}

            {activeTab === "level" && (
              <LevelView
                tree={data ?? undefined}
                materials={materials}
                questions={questions}
                run={mutate}
                onGoto={(tab) => handleSwitchTab(tab)}
              />
            )}
           {activeTab === "materi" && (
              <MateriView
                tree={data || undefined}
                onContentChange={reload}
                materials={materials}
                onAddMaterial={handleAddMaterial}
                onUpdateMaterial={handleUpdateMaterial}
                onDeleteMaterial={handleDeleteMaterial}
                onNotify={showToast}
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
                key={editingQuestion.id}
                tree={data || undefined}
                question={editingQuestion}
                isNew={isCreatingQuestion}
                onBack={() => {
                  setEditingQuestion(null);
                  setIsCreatingQuestion(false);
                }}
                onSave={handleSaveQuestion}
                onDelete={handleDeleteQuestion}
                onNotify={showToast}
              />
            )}
          </main>
        </div>

        {/* MOBILE FIXED BOTTOM NAVIGATION BAR */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-edge-2 dark:border-slate-800 px-1.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex items-center gap-1 z-40">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSwitchTab(item.key)}
                className={`flex flex-1 flex-col items-center justify-center gap-1 min-w-0 py-1.5 px-1 rounded-[16px] transition cursor-pointer ${
                  isActive
                    ? "bg-red-tint border-[1.5px] border-red-strong text-red-strong"
                    : "text-slate-muted dark:text-slate-400 border-[1.5px] border-transparent"
                }`}
              >
                {item.renderIcon(isActive)}
                <span className="max-w-full truncate text-xs font-extrabold tracking-wide leading-none uppercase">
                  {({ dashboard: "Beranda", pendaftaran: "Akun" } as Record<string, string>)[item.key] ?? item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="fixed bottom-20 md:bottom-6 right-4 md:right-8 z-50 bg-navy text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
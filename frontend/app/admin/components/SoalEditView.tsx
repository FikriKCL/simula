"use client";

import React, { useState } from "react";
import {
  ContentTree,
  QuizQuestion,
  QuestionType,
  TopicCode,
  QuestionOption,
} from "../types";
import {api,API_URL} from "@/lib/api";
import { PlusIcon, TrashIcon } from "./AdminIcons";
import { FieldError, FormErrorSummary, SaveError, errorRing, fieldProps, type FieldErrors } from "./FormErrors";

interface SoalEditViewProps {
  tree?: ContentTree;
  question: QuizQuestion;
  isNew?: boolean;
  onBack: () => void;
  onSave: (updated: QuizQuestion) => Promise<void>;
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
  "Kesehatan Remaja (KR)",
];

export default function SoalEditView({
  tree,
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
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(question.imageUrl?.split("/").pop()||null);

  const [questionImage,setQuestionImage]=useState(question.imageUrl||null);
  const [quizId,setQuizId]=useState(question.quizId||0);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [saveError,setSaveError]=useState("");
  const currentCode=topicFull.includes("ASB")?"ASB":topicFull.includes("(KR)")?"KR":"PP";
  const topicLevels=(tree?.modules||[]).filter(m=>m.topic_id===tree?.topics.find(t=>t.code===currentCode)?.id).sort((a,b)=>a.level-b.level);
  const matchingModule=tree?.modules.find(m=>m.topic_id===tree.topics.find(t=>t.code===currentCode)?.id&&m.level===Number(level.replace(/[^0-9]/g,"")));
  const availableQuizzes=tree?.quizzes.filter(q=>q.module_id===matchingModule?.id)||[];
  const selectedQuiz=availableQuizzes.find(q=>q.id===quizId)||availableQuizzes[0];
  const targetQuizId=isNew?(quizId<0?quizId:selectedQuiz?.id||(["DRAFT","REJECTED"].includes(matchingModule?.status||"")?-1:undefined)):question.quizId;

  const isOrdering=selectedType==="Urutkan";
  const isMatching=selectedType==="Cocokkan";
  const isSequence=isOrdering||isMatching;
  // Semua kesalahan dicek sekaligus; tampil setelah Simpan ditekan, lalu ikut diperbarui saat diketik
  const [attempt,setAttempt]=useState(0);
  function validate():FieldErrors{
    const e:FieldErrors={};
    if(!targetQuizId)e["soal-quiz"]=matchingModule?"Belum ada kuis untuk topik/level ini dan modulnya sudah terbit. Pilih level lain atau tarik modul ke draft.":"Modul untuk topik/level ini belum ada. Pilih level lain.";
    if(prompt.trim().length<3)e["soal-prompt"]="Pertanyaan minimal 3 karakter.";
    if(options.length<2)e["soal-options"]="Soal memerlukan minimal 2 opsi jawaban.";
    const seen=new Set<string>();
    options.forEach((o,i)=>{
      const t=o.text.trim().toLowerCase();
      const name=isOrdering?`Langkah ${i+1}`:isMatching?`Pasangan ${i+1}: sisi kanan`:`Opsi ${i+1}`;
      if(!t)e[`soal-opt-${o.id}`]=`${name} masih kosong.`;
      else if(seen.has(t))e[`soal-opt-${o.id}`]=`${name} sama dengan baris lain.`;
      seen.add(t);
    });
    if(isMatching){
      const lefts=new Set<string>();
      options.forEach((o,i)=>{
        const t=(o.leftText||"").trim().toLowerCase();
        if(!t)e[`soal-left-${o.id}`]=`Pasangan ${i+1}: sisi kiri masih kosong.`;
        else if(lefts.has(t))e[`soal-left-${o.id}`]=`Pasangan ${i+1}: sisi kiri sama dengan pasangan lain.`;
        lefts.add(t);
      });
    }
    if(!isSequence&&!options.some(o=>o.id===correctOptionId))e["soal-options"]="Pilih satu jawaban benar (klik bulatan di kiri opsi).";
    if(explanation.trim().length<3)e["soal-explanation"]="Penjelasan minimal 3 karakter.";
    return e;
  }
  const errors=attempt?validate():{};
  const bad=(id:string)=>errors[id]?` ${errorRing}`:"";
  async function uploadImage(file:File,optionId?:string){
    if(file.size>2*1024*1024){setSaveError("Gambar soal maksimal 2 MB.");return;}
    setUploading(true);setSaveError("");try{const form=new FormData();form.append("file",file);const result=await api<{path:string}>("/admin/uploads/images",{method:"POST",body:form});const url=new URL(result.path,API_URL).href;
    if(optionId)handleOptionImageAttach(optionId,url);else{setQuestionImage(url);setUploadedFileName(file.name);}}
    catch(e){setSaveError((e as Error).message);}finally{setUploading(false);}
  }

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
    if(options.length>=6)return;
    const newId = `opt-${Date.now()}`;
    setOptions((prev) => [...prev, { id: newId, text: "" }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const derivedTopic: TopicCode = topicFull.includes("ASB")
      ? "ASB"
      : topicFull.includes("(KR)")
      ? "KR"
      : "PP";

    if(saving||uploading)return;setSaveError("");
    setAttempt(n=>n+1);
    if(Object.keys(validate()).length)return;
    setSaving(true);
    try {await onSave({
      ...question,
      quizId:targetQuizId,
      imageUrl:questionImage,
      topic: derivedTopic,
      topicFull,
      level,
      type: selectedType,
      question: prompt,
      options,
      correctOptionId,
      explanation,
    });}catch(error){setSaveError((error as Error).message);}finally{setSaving(false);}
  };

  const breadcrumbTopic = topicFull
    .replace(" (PP)", "")
    .replace(" (ASB)", "")
    .replace(" (KR)", "");

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
        noValidate
        className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-[#DCE3EC] border-b-[3px] dark:border-slate-800 p-4 md:p-6 space-y-5"
      >
        <FormErrorSummary errors={errors} attempt={attempt} />
        {/* Row 1: Materi & Level */}
        <div className="grid grid-cols-2 gap-3 md:gap-5">
          <div className="relative">
            <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-1.5">
              Materi
            </label>
            <button
              type="button"
              disabled={!isNew || saving}
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
            {/* Pilih dari level yang benar-benar ada di topik ini */}
            <select
              disabled={!isNew||saving}
              value={level}
              onChange={(e) => {setLevel(e.target.value);setQuizId(0);}}
              className="w-full h-[48px] md:h-[44px] px-3.5 py-2 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white focus:outline-none cursor-pointer"
            >
              {!topicLevels.some(m=>`Level ${m.level}`===level)&&<option value={level}>{level}</option>}
              {topicLevels.map(m=><option key={m.id} value={`Level ${m.level}`}>Level {m.level}{m.status==="PUBLISHED"?"":` · ${m.status==="DRAFT"?"draf":m.status.toLowerCase()}`}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Tipe Soal */}
        <div>
          <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-2">
            Tipe soal
          </label>
          <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-2">Kuis tujuan
            <select {...fieldProps("soal-quiz",errors)} disabled={!isNew||saving} value={isNew?(quizId<0?quizId:selectedQuiz?.id||(["DRAFT","REJECTED"].includes(matchingModule?.status||"")?-1:"")):question.quizId||""} onChange={e=>setQuizId(Number(e.target.value))} className={"w-full min-h-[48px] md:min-h-[44px] px-3.5 py-2 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-left text-[13px] font-semibold text-[#1E293B] dark:text-white leading-snug cursor-pointer focus:outline-none"+bad("soal-quiz")}>
            {availableQuizzes.length===0&&!["DRAFT","REJECTED"].includes(matchingModule?.status||"")&&<option value="">Belum ada kuis pada topik/level ini</option>}
            {(isNew?availableQuizzes:tree?.quizzes.filter(q=>q.id===question.quizId)||[]).map(q=><option key={q.id} value={q.id}>{q.kind} · {q.title}</option>)}
            {isNew&&["DRAFT","REJECTED"].includes(matchingModule?.status||"")&&<><option value={-1}>Buat kuis PRE baru</option><option value={-2}>Buat kuis POST baru</option></>}
            </select>
            <FieldError id="soal-quiz" errors={errors} />
          </label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((t) => {
              const isSelected = selectedType === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const wasTrueFalse=selectedType==="Benar / salah";
                    setSelectedType(t);
                    if(t === "Benar / salah"){setOptions([{id:"opt-true",text:"Benar"},{id:"opt-false",text:"Salah"}]);setCorrectOptionId("opt-true");}
                    else if(wasTrueFalse){const fresh=[0,1,2].map(n=>({id:`opt-${Date.now()}-${n}`,text:""}));setOptions(fresh);setCorrectOptionId(fresh[0].id);}
                  }}
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
              {...fieldProps("soal-prompt",errors)}
              maxLength={2000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className={`w-full h-24 md:h-[108px] p-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#43A8F6]/30${bad("soal-prompt")}`}
            />
            <FieldError id="soal-prompt" errors={errors} />
          </div>

          <div>
            <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-1.5">
              Gambar pertanyaan (opsional)
            </label>
            <label className="w-full h-24 md:h-[108px] rounded-[14px] border-2 border-dashed border-[#43A8F6] bg-[#EAF5FF] dark:bg-sky-950/30 hover:bg-[#DCEEFF] transition-colors flex items-center justify-center px-6 text-center cursor-pointer">
              <input
                disabled={uploading||saving}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadImage(file);
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
          <div id="soal-options" tabIndex={-1} className="text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-2.5 outline-none">
            {isOrdering ? "Langkah-langkah" : isMatching ? "Pasangan" : "Opsi jawaban"}{" "}
            <span className="font-semibold text-[#64748B] text-xs">
              {isOrdering
                ? "(tulis dalam urutan BENAR dari atas; siswa akan melihatnya teracak)"
                : isMatching
                  ? "(tulis pasangan yang benar; sisi kanan akan diacak untuk siswa)"
                  : "(pilih satu jawaban benar)"}
            </span>
          </div>

          {isSequence && (
            <ol className="space-y-2.5">
              {options.map((opt, i) => (
                <li key={opt.id}>
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EAF5FF] text-xs font-black text-[#1D8CF8]">{i + 1}</span>
                    {isMatching && (
                      <>
                        <input
                          {...fieldProps(`soal-left-${opt.id}`,errors)}
                          type="text"
                          maxLength={500}
                          value={opt.leftText||""}
                          onChange={(e)=>setOptions(prev=>prev.map(o=>o.id===opt.id?{...o,leftText:e.target.value}:o))}
                          placeholder="Sisi kiri (mis. Luka bakar)"
                          className={`min-w-0 flex-1 h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white focus:outline-none${bad(`soal-left-${opt.id}`)}`}
                        />
                        <span aria-hidden className="shrink-0 font-black text-[#94A3B8]">↔</span>
                      </>
                    )}
                    <input
                      {...fieldProps(`soal-opt-${opt.id}`,errors)}
                      type="text"
                      maxLength={500}
                      value={opt.text}
                      onChange={(e)=>handleOptionTextChange(opt.id,e.target.value)}
                      placeholder={isMatching ? "Sisi kanan (mis. Siram air mengalir)" : `Langkah ${i + 1}`}
                      className={`min-w-0 flex-1 h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white focus:outline-none${bad(`soal-opt-${opt.id}`)}`}
                    />
                    {isOrdering && (
                      <>
                        <button type="button" disabled={!i||saving} aria-label={`Naikkan langkah ${i+1}`} onClick={()=>setOptions(prev=>{const n=[...prev];[n[i-1],n[i]]=[n[i],n[i-1]];return n;})} className="shrink-0 w-8 h-11 rounded-[12px] border border-[#DCE3EC] dark:border-slate-700 text-[#334155] dark:text-slate-300 disabled:opacity-30 cursor-pointer">↑</button>
                        <button type="button" disabled={i===options.length-1||saving} aria-label={`Turunkan langkah ${i+1}`} onClick={()=>setOptions(prev=>{const n=[...prev];[n[i+1],n[i]]=[n[i],n[i+1]];return n;})} className="shrink-0 w-8 h-11 rounded-[12px] border border-[#DCE3EC] dark:border-slate-700 text-[#334155] dark:text-slate-300 disabled:opacity-30 cursor-pointer">↓</button>
                      </>
                    )}
                    {options.length>2&&(
                      <button type="button" disabled={saving} onClick={()=>setOptions(prev=>prev.filter(o=>o.id!==opt.id))} aria-label={`Hapus baris ${i+1}`} title="Hapus" className="shrink-0 w-9 h-11 rounded-[12px] border border-[#DCE3EC] dark:border-slate-700 text-[#E5252A] hover:bg-[#FEECEB] inline-flex items-center justify-center cursor-pointer">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <FieldError id={`soal-left-${opt.id}`} errors={errors} />
                  <FieldError id={`soal-opt-${opt.id}`} errors={errors} />
                </li>
              ))}
            </ol>
          )}

          {!isSequence && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-x-5 md:gap-y-3">
            {options.map((opt) => {
              const isCorrect = opt.id === correctOptionId;
              return (
                <div key={opt.id}>
                <div className="flex items-center gap-2.5">
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
                    {...fieldProps(`soal-opt-${opt.id}`,errors)}
                    type="text"
                    maxLength={500}
                    readOnly={selectedType==="Benar / salah"}
                    value={opt.text}
                    onChange={(e) =>
                      handleOptionTextChange(opt.id, e.target.value)
                    }
                    placeholder="Tulis opsi jawaban..."
                    className={`min-w-0 flex-1 h-11 px-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white focus:outline-none${bad(`soal-opt-${opt.id}`)}`}
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
                      disabled={uploading||saving}
                type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadImage(file,opt.id);
                      }}
                    />
                  </label>
                  {options.length>2&&selectedType!=="Benar / salah"&&(
                    <button
                      type="button"
                      disabled={saving||uploading}
                      onClick={()=>{setOptions(prev=>prev.filter(o=>o.id!==opt.id));if(isCorrect)setCorrectOptionId("");}}
                      aria-label={`Hapus opsi ${opt.text||"kosong"}`}
                      title="Hapus opsi"
                      className="shrink-0 w-9 h-11 rounded-[12px] border border-[#DCE3EC] dark:border-slate-700 text-[#E5252A] hover:bg-[#FEECEB] inline-flex items-center justify-center cursor-pointer"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <FieldError id={`soal-opt-${opt.id}`} errors={errors} />
                </div>
              );
            })}
          </div>
          )}

          <button
            type="button"
            disabled={options.length>=6 || saving || uploading || selectedType==="Benar / salah"}
            onClick={handleAddOption}
            className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#E5252A] hover:underline cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>{isOrdering ? "Tambah langkah" : isMatching ? "Tambah pasangan" : "Tambah opsi"}</span>
          </button>
          <FieldError id="soal-options" errors={errors} />
        </div>

        {/* Row 5: Penjelasan setelah menjawab */}
        <div>
          <label className="block text-xs md:text-[13px] font-extrabold text-[#1E293B] dark:text-slate-200 mb-1.5">
            Penjelasan setelah menjawab
          </label>
          <textarea
            {...fieldProps("soal-explanation",errors)}
            maxLength={2000}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={2}
            className={`w-full h-20 md:h-[72px] p-3.5 rounded-[14px] border-[1.5px] border-[#1E293B] dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-[#1E293B] dark:text-white resize-none focus:outline-none${bad("soal-explanation")}`}
          />
          <FieldError id="soal-explanation" errors={errors} />
        </div>

        {uploading&&<p role="status" className="text-xs font-bold text-[#1D8CF8]">Mengunggah gambar…</p>}
        <SaveError message={saveError} />
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
            disabled={saving||uploading}
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
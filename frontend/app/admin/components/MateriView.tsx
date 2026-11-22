"use client";

import React, { useState, useMemo } from "react";
import { LearningMaterial, MaterialType, TopicCode, ContentTree } from "../types";
import ModuleDialog from "./ModuleDialog";
import MaterialContentFields from "./MaterialContentFields";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MaterialTypeBadgeIcon,
} from "./AdminIcons";

interface MateriViewProps {
  tree?: ContentTree;
  onContentChange: () => void;
  materials: LearningMaterial[];
  onAddMaterial: (newMat: Omit<LearningMaterial, "id">) => Promise<void>;
  onUpdateMaterial: (updated: LearningMaterial) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
}

type MaterialTabFilter = "SEMUA" | "ARTICLE" | "PDF" | "VIDEO" | "KOMIK";

export default function MateriView({
  tree, onContentChange,
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
}: MateriViewProps) {
  const [activeTab, setActiveTab] = useState<MaterialTabFilter>("SEMUA");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LearningMaterial | null>(null);

  // State form materi
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MaterialType>("ARTICLE");
  const [topic, setTopic] = useState<TopicCode>("PP");
  const [size, setSize] = useState("");
  const [draft,setDraft]=useState<Partial<LearningMaterial>>({});
  const [setupOpen,setSetupOpen]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");

  const filteredMaterials = useMemo(() => {
    if (activeTab === "SEMUA") return materials;
    return materials.filter((m) => m.type === activeTab);
  }, [materials, activeTab]);

  const openCreateEditor = () => {
    setEditingItem(null);
    setTitle("");
    setType("ARTICLE");
    setTopic("PP");
    setSize("");
    setDraft({body:"",pages:[],required:true});
    setSaveError("");
    setIsEditorOpen(true);
  };

  const openEditEditor = (item: LearningMaterial) => {
    setEditingItem(item);
    setDraft(item);
    setSaveError("");
    setTitle(item.title);
    setType(item.type);
    setTopic(item.topic);
    setSize(item.size);
    setIsEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();if(saving||uploading)return;setSaveError("");setSaving(true);
    try{
      if(type==="KOMIK"&&!draft.pages?.length)throw new Error("Komik memerlukan halaman.");
      const payload={...draft,title:title.trim(),type,topic,size:size.trim()} as Omit<LearningMaterial,"id">;
      if(editingItem)await onUpdateMaterial({...payload,id:editingItem.id});else await onAddMaterial(payload);
      setIsEditorOpen(false);
    }catch(error){setSaveError((error as Error).message);}finally{setSaving(false);}
  };

  const pageCount=Math.max(1,Math.ceil(filteredMaterials.length/10));
  const page=Math.min(currentPage,pageCount);
  const pageItems=filteredMaterials.slice((page-1)*10,page*10);
  const pageButtons=Array.from(new Set([1,...[page-1,page,page+1].filter(n=>n>1&&n<pageCount)])).sort((a,b)=>a-b);

  if (isEditorOpen) return (
    <div className="space-y-4">
      <div className="bg-[#43A8F6] border-b-[4px] border-[#2589D8] rounded-[20px] px-5 py-4 md:px-7 md:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-black text-[#1E293B] tracking-tight leading-tight">{editingItem ? "Ubah Materi" : "Tambah Materi"}</h1>
          <p className="text-xs md:text-[13px] font-bold text-[#1E293B]/90 mt-0.5">Materi › {topic} › {type}</p>
        </div>
        <button type="button" disabled={saving||uploading} onClick={()=>setIsEditorOpen(false)} className="shrink-0 bg-white hover:bg-slate-50 text-[#1E293B] font-extrabold text-xs md:text-[13px] px-4 py-2 md:px-4 md:py-2.5 rounded-[14px] border-[1.5px] border-[#1E293B] border-b-[3px] transition-transform active:translate-y-0.5 cursor-pointer">Kembali ke daftar</button>
      </div>
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-[#DCE3EC] border-b-[3px] dark:border-slate-800 p-4 md:p-6 space-y-5"
          >
            <h2 className="text-lg font-black text-[#1E293B] dark:text-white">
              {editingItem ? "Ubah Materi" : "Unggah Materi Baru"}
            </h2>

            <div>
              <label className="block text-xs font-extrabold text-[#1E293B] dark:text-slate-200 mb-1">
                Judul Materi
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pertolongan Luka Bakar"
                className="w-full h-10 px-3.5 rounded-[12px] border-[1.5px] border-[#1E293B] text-sm font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-[#1E293B] dark:text-slate-200 mb-1">
                  Tipe
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MaterialType)}
                  className="w-full h-10 px-3 rounded-[12px] border-[1.5px] border-[#1E293B] text-sm font-bold"
                >
                  <option value="ARTICLE">ARTIKEL</option>
                  {editingItem?.type === "PDF" && <option value="PDF">PDF lama</option>}
                  <option value="VIDEO">VIDEO</option>
                  <option value="KOMIK">KOMIK</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-[#1E293B] dark:text-slate-200 mb-1">
                  Kategori Materi
                </label>
                <select
                  value={topic}
                  disabled={!!editingItem}
                  onChange={(e) => {setTopic(e.target.value as TopicCode);setDraft(v=>({...v,lessonId:undefined}));}}
                  className="w-full h-10 px-3 rounded-[12px] border-[1.5px] border-[#1E293B] text-sm font-bold"
                >
                  <option value="PP">PP</option>
                  <option value="ASB">ASB</option>
                  <option value="KR">KR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#1E293B] dark:text-slate-200 mb-1">
                Ukuran / Durasi
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Contoh: 8 halaman atau 4 menit"
                className="w-full h-10 px-3.5 rounded-[12px] border-[1.5px] border-[#1E293B] text-sm font-semibold"
              />
            </div>

            <MaterialContentFields value={draft} onChange={setDraft} tree={tree} topic={topic} type={type} editing={!!editingItem} onUploadingChange={setUploading} onManage={()=>setSetupOpen(true)}/>
            {saveError && <p role="alert">{saveError}</p>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={saving||uploading}
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-[12px] border border-[#DCE3EC] text-xs font-extrabold text-[#64748B] cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={saving||uploading}
                type="submit"
                className="px-4 py-2 rounded-[12px] bg-[#E5252A] text-white text-xs font-extrabold border-b-[3px] border-[#991B1B] cursor-pointer"
              >
                Simpan Materi
              </button>
            </div>
          </form>
      {setupOpen && tree && <ModuleDialog tree={tree} onChange={onContentChange} onClose={()=>setSetupOpen(false)}/>}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Blue Hero Banner with Tactile Bottom Border */}
      <div className="bg-[#43A8F6] border-b-[4px] border-[#2589D8] rounded-[20px] px-5 py-4 md:px-7 md:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-black text-[#1E293B] tracking-tight leading-tight">
            Kelola Materi
          </h1>
          <p className="text-xs md:text-[13px] font-bold text-[#1E293B]/90 mt-0.5">
            Komik, artikel, dan video pembelajaran
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateEditor}
          className="shrink-0 bg-white hover:bg-slate-50 text-[#1E293B] font-extrabold text-xs md:text-[13px] px-3.5 py-2 md:px-4 md:py-2.5 rounded-[14px] border-[1.5px] border-[#1E293B] border-b-[3px] inline-flex items-center gap-1.5 transition-transform active:translate-y-0.5 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="md:hidden">Unggah</span>
          <span className="hidden md:inline">Unggah materi</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-[#DCE3EC] border-b-[3px] dark:border-slate-800 p-4 md:p-6">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 md:gap-2 border-b border-[#E2E8F0] dark:border-slate-800 mb-5 overflow-x-auto">
          {(
            [
              { key: "SEMUA", label: "SEMUA" },
              { key: "ARTICLE", label: "ARTIKEL" },
              { key: "VIDEO", label: "VIDEO" },
              { key: "KOMIK", label: "KOMIK" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-[1px] px-3.5 md:px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-[12px] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? "bg-[#FEECEB] text-[#E5252A] border-b-[3px] border-[#E5252A]"
                  : "text-[#64748B] hover:text-[#1E293B] dark:text-slate-400 border-b-[3px] border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EEF2F6] dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-[#94A3B8]">
                <th className="pb-3 pr-4">JUDUL</th>
                <th className="pb-3 px-4">TIPE</th>
                <th className="pb-3 px-4">MATERI</th>
                <th className="pb-3 px-4">UKURAN</th>
                <th className="pb-3 pl-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF2F6] dark:divide-slate-800 text-[13px]">
              {pageItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3.5">
                      <MaterialTypeBadgeIcon type={item.type} />
                      <span className="font-extrabold text-[#1E293B] dark:text-slate-100">
                        {item.title}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-block bg-[#E5252A] text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      {item.type}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-bold text-[#334155] dark:text-slate-300">
                    {item.topic}
                  </td>

                  <td className="py-3 px-4 font-semibold text-[#334155] dark:text-slate-300">
                    {item.size}
                  </td>

                  <td className="py-3 pl-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditEditor(item)}
                        title="Ubah materi"
                        className="w-8 h-8 rounded-[10px] border border-[#DCE3EC] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-[#334155] dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMaterial(item.id)}
                        title="Hapus materi"
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

        {/* MOBILE LIST VIEW */}
        <div className="md:hidden divide-y divide-[#EEF2F6] dark:divide-slate-800">
          {pageItems.map((item) => (
            <div
              key={item.id}
              className="py-3.5 first:pt-1 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MaterialTypeBadgeIcon type={item.type} />
                <div className="min-w-0">
                  <div className="font-extrabold text-[14px] text-[#1E293B] dark:text-white truncate">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-block bg-[#E5252A] text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {item.type}
                    </span>
                    <span className="text-xs font-semibold text-[#64748B]">
                      {item.topic} · {item.size}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditEditor(item)}
                  aria-label="Ubah materi"
                  className="w-8 h-8 rounded-[10px] border border-[#DCE3EC] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#334155] flex items-center justify-center"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteMaterial(item.id)}
                  aria-label="Hapus materi"
                  className="w-8 h-8 rounded-[10px] border border-[#DCE3EC] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#E5252A] flex items-center justify-center"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredMaterials.length === 0 && (
          <div className="py-10 text-center text-sm font-bold text-slate-400">
            Tidak ada materi pada kategori ini.
          </div>
        )}

        {/* Pagination Footer */}
        <div className="mt-5 pt-4 border-t border-[#EEF2F6] dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs font-bold text-[#64748B]">
            Menampilkan {filteredMaterials.length ? (page-1)*10+1 : 0}–{Math.min(page*10,filteredMaterials.length)} dari {filteredMaterials.length} materi
          </p>

          <div className="flex items-center gap-1.5">
            {pageButtons.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-[10px] text-xs font-extrabold transition-colors cursor-pointer ${
                  Math.min(currentPage,pageCount) === page
                    ? "bg-[#FEECEB] border-[1.5px] border-[#E5252A] text-[#E5252A]"
                    : "bg-white dark:bg-slate-800 border border-[#DCE3EC] dark:border-slate-700 text-[#475569] dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>

      {setupOpen && tree && <ModuleDialog tree={tree} onChange={onContentChange} onClose={()=>{setSetupOpen(false);setIsEditorOpen(true);}}/>}
    </div>
  );
}

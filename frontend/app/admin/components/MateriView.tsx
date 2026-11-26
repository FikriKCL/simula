"use client";

import React, { useState, useMemo } from "react";
import { LearningMaterial, MaterialType, TopicCode, ContentTree } from "../types";
import { KIND_LABEL } from "@/lib/kinds";
import ModuleDialog from "./ModuleDialog";
import MaterialContentFields, { validateMaterial } from "./MaterialContentFields";
import { FieldError, FormErrorSummary, SaveError, errorRing, fieldProps } from "./FormErrors";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MaterialTypeBadgeIcon,
  SearchIcon,
} from "./AdminIcons";
import { DateSortSelect, compareByDate, type DateSort } from "./Shared";

const CATEGORIES: { key: "SEMUA" | TopicCode; label: string; full: string }[] = [
  { key: "SEMUA", label: "Semua", full: "Semua kategori" },
  { key: "PP", label: "PP", full: "Pertolongan Pertama" },
  { key: "ASB", label: "ASB", full: "Ayo Siaga Bencana" },
  { key: "KR", label: "KR", full: "Kesehatan Remaja" },
];
const categoryName = (code: TopicCode) => CATEGORIES.find((c) => c.key === code)?.full ?? code;

interface MateriViewProps {
  tree?: ContentTree;
  onContentChange: () => void;
  materials: LearningMaterial[];
  onAddMaterial: (newMat: Omit<LearningMaterial, "id">) => Promise<void>;
  onUpdateMaterial: (updated: LearningMaterial) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
}

type MaterialTabFilter = "SEMUA" | "DOKUMEN" | "VIDEO" | "KOMIK";

// Artikel dan buku PDF sama-sama bacaan, jadi satu kategori "Dokumen" (sama seperti katalog siswa)
const tabOf = (type: MaterialType): MaterialTabFilter =>
  type === "VIDEO" ? "VIDEO" : type === "KOMIK" ? "KOMIK" : "DOKUMEN";
const TYPE_LABEL: Record<MaterialType, string> = { ARTICLE: KIND_LABEL.ARTICLE, PDF: KIND_LABEL.PDF, VIDEO: KIND_LABEL.VIDEO, KOMIK: KIND_LABEL.COMIC };

export default function MateriView({
  tree, onContentChange,
  materials,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
}: MateriViewProps) {
  const [activeTab, setActiveTab] = useState<MaterialTabFilter>("SEMUA");
  const [category, setCategory] = useState<"SEMUA" | TopicCode>("SEMUA");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<DateSort>("newest");
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
  // Kesalahan isian baru ditampilkan setelah tombol Simpan ditekan, lalu ikut diperbarui saat diketik
  const [attempt,setAttempt]=useState(0);
  const errors=attempt?validateMaterial(title,type,draft):{};
  const bad=(id:string)=>errors[id]?` ${errorRing}`:"";

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { SEMUA: 0 };
    for (const m of materials) {
      if (category !== "SEMUA" && m.topic !== category) continue;
      counts.SEMUA += 1;
      counts[tabOf(m.type)] = (counts[tabOf(m.type)] || 0) + 1;
    }
    return counts;
  }, [materials, category]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { SEMUA: materials.length };
    for (const m of materials) counts[m.topic] = (counts[m.topic] || 0) + 1;
    return counts;
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials
      .filter((m) => category === "SEMUA" || m.topic === category)
      .filter((m) => activeTab === "SEMUA" || tabOf(m.type) === activeTab)
      .filter((m) => !q || m.title.toLowerCase().includes(q))
      .sort((a, b) => compareByDate(sort, a, b));
  }, [materials, activeTab, category, search, sort]);

  const openCreateEditor = () => {
    setEditingItem(null);
    setTitle("");
    setType("ARTICLE");
    setTopic("PP");
    setSize("");
    setDraft({body:"",pages:[],required:true});
    setSaveError("");
    setAttempt(0);
    setIsEditorOpen(true);
  };

  const openEditEditor = (item: LearningMaterial) => {
    setEditingItem(item);
    setDraft(item);
    setSaveError("");
    setAttempt(0);
    setTitle(item.title);
    setType(item.type);
    setTopic(item.topic);
    setSize(item.size);
    setIsEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();if(saving||uploading)return;setSaveError("");
    setAttempt(n=>n+1);
    if(Object.keys(validateMaterial(title,type,draft)).length)return;
    setSaving(true);
    try{
      const payload={...draft,title:title.trim(),type,topic,size:size.trim()} as Omit<LearningMaterial,"id">;
      if(editingItem)await onUpdateMaterial({...payload,id:editingItem.id});else await onAddMaterial(payload);
      setIsEditorOpen(false);
    }catch(error){const m=(error as Error).message;if(m!=="Penyimpanan dibatalkan.")setSaveError(m);}finally{setSaving(false);}
  };

  const pageCount=Math.max(1,Math.ceil(filteredMaterials.length/10));
  const page=Math.min(currentPage,pageCount);
  const pageItems=filteredMaterials.slice((page-1)*10,page*10);
  const pageButtons=Array.from(new Set([1,...[page-1,page,page+1].filter(n=>n>1&&n<pageCount)])).sort((a,b)=>a-b);

  if (isEditorOpen) return (
    <div className="space-y-4">
      <div className="bg-admin-sky border-b-[4px] border-admin-sky-edge rounded-[20px] px-5 py-4 md:px-7 md:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-black text-navy tracking-tight leading-tight">{editingItem ? "Ubah Materi" : "Tambah Materi"}</h1>
          <p className="text-xs md:text-[13px] font-bold text-navy/90 mt-0.5">Materi › {topic} › {type}</p>
        </div>
        <button type="button" disabled={saving||uploading} onClick={()=>setIsEditorOpen(false)} className="shrink-0 bg-white hover:bg-slate-50 text-navy font-extrabold text-xs md:text-[13px] px-4 py-2 md:px-4 md:py-2.5 rounded-[14px] border-[1.5px] border-navy border-b-[3px] transition-transform active:translate-y-0.5 cursor-pointer">Kembali ke daftar</button>
      </div>
          <form
            onSubmit={handleSave}
            noValidate
            className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-edge border-b-[3px] dark:border-slate-800 p-4 md:p-6 space-y-5"
          >
            <h2 className="text-lg font-black text-navy dark:text-white">
              {editingItem ? "Ubah Materi" : "Unggah Materi Baru"}
            </h2>
            <FormErrorSummary errors={errors} attempt={attempt} />

            <div>
              <label htmlFor="mat-title" className="block text-xs font-extrabold text-navy dark:text-slate-200 mb-1">
                Judul Materi
              </label>
              <input
                {...fieldProps("mat-title", errors)}
                type="text"
                value={title}
                maxLength={200}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pertolongan Luka Bakar"
                className={"w-full h-10 px-3.5 rounded-[12px] border-[1.5px] border-navy text-sm font-semibold"+bad("mat-title")}
              />
              <FieldError id="mat-title" errors={errors} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-navy dark:text-slate-200 mb-1">
                  Tipe
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MaterialType)}
                  className="w-full h-10 px-3 rounded-[12px] border-[1.5px] border-navy text-sm font-bold"
                >
                  <option value="ARTICLE">ARTIKEL</option>
                  {editingItem?.type === "PDF" && <option value="PDF">PDF lama</option>}
                  <option value="VIDEO">VIDEO</option>
                  <option value="KOMIK">KOMIK</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-navy dark:text-slate-200 mb-1">
                  Kategori Materi
                </label>
                <select
                  value={topic}
                  disabled={!!editingItem}
                  onChange={(e) => {setTopic(e.target.value as TopicCode);setDraft(v=>({...v,lessonId:undefined}));}}
                  className="w-full h-10 px-3 rounded-[12px] border-[1.5px] border-navy text-sm font-bold"
                >
                  <option value="PP">Pertolongan Pertama (PP)</option>
                  <option value="ASB">Ayo Siaga Bencana (ASB)</option>
                  <option value="KR">Kesehatan Remaja (KR)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-navy dark:text-slate-200 mb-1">
                Ukuran / Durasi
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Contoh: 8 halaman atau 4 menit"
                className="w-full h-10 px-3.5 rounded-[12px] border-[1.5px] border-navy text-sm font-semibold"
              />
            </div>

            <MaterialContentFields value={draft} onChange={setDraft} tree={tree} topic={topic} type={type} editing={!!editingItem} onUploadingChange={setUploading} onManage={()=>setSetupOpen(true)} errors={errors}/>
            <SaveError message={saveError} />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={saving||uploading}
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 rounded-[12px] border border-edge text-xs font-extrabold text-slate-muted cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={saving||uploading}
                type="submit"
                className="px-4 py-2 rounded-[12px] bg-red-strong text-white text-xs font-extrabold border-b-[3px] border-red-deep cursor-pointer"
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
      <div className="bg-admin-sky border-b-[4px] border-admin-sky-edge rounded-[20px] px-5 py-4 md:px-7 md:py-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-black text-navy tracking-tight leading-tight">
            Kelola Materi
          </h1>
          <p className="text-xs md:text-[13px] font-bold text-navy/90 mt-0.5">
            Komik, artikel, dan video pembelajaran
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateEditor}
          className="shrink-0 bg-white hover:bg-slate-50 text-navy font-extrabold text-xs md:text-[13px] px-3.5 py-2 md:px-4 md:py-2.5 rounded-[14px] border-[1.5px] border-navy border-b-[3px] inline-flex items-center gap-1.5 transition-transform active:translate-y-0.5 cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="md:hidden">Unggah</span>
          <span className="hidden md:inline">Unggah materi</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[20px] border-[1.5px] border-edge border-b-[3px] dark:border-slate-800 p-4 md:p-6">
        {/* Kategori (topik) */}
        <div role="tablist" aria-label="Kategori materi" className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={category === c.key}
              title={c.full}
              onClick={() => {setCategory(c.key);setCurrentPage(1);}}
              className={`inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-extrabold transition-colors cursor-pointer ${
                category === c.key
                  ? "border-red-strong bg-red-tint text-red-strong"
                  : "border-edge dark:border-slate-700 text-slate-mid dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {c.key === "SEMUA" ? c.full : `${c.full} (${c.label})`}
              <span className="rounded-full bg-white/80 dark:bg-slate-900/60 px-1.5 text-xs">{categoryCounts[c.key] || 0}</span>
            </button>
          ))}
        </div>

        {/* Cari + urutkan */}
        <div className="flex flex-col md:flex-row gap-2.5 md:gap-3 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon className="w-4 h-4 text-slate-muted" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => {setSearch(e.target.value);setCurrentPage(1);}}
              placeholder="Cari judul materi..."
              aria-label="Cari judul materi"
              className="w-full h-11 pl-10 pr-4 rounded-[14px] border-[1.5px] border-navy dark:border-slate-600 bg-white dark:bg-slate-800 text-[13px] font-semibold text-navy dark:text-white placeholder:text-slate-faint focus:outline-none focus:ring-2 focus:ring-admin-sky/30"
            />
          </div>
          <DateSortSelect value={sort} onChange={(v)=>{setSort(v);setCurrentPage(1);}} />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 md:gap-2 border-b border-edge-2 dark:border-slate-800 mb-5 overflow-x-auto">
          {(
            [
              { key: "SEMUA", label: "SEMUA" },
              { key: "DOKUMEN", label: "DOKUMEN" },
              { key: "VIDEO", label: "VIDEO" },
              { key: "KOMIK", label: "KOMIK" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {setActiveTab(tab.key);setCurrentPage(1);}}
              className={`-mb-[1px] px-3.5 md:px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-t-[12px] transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? "bg-red-tint text-red-strong border-b-[3px] border-red-strong"
                  : "text-slate-muted hover:text-navy dark:text-slate-400 border-b-[3px] border-transparent"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 rounded-full bg-black/5 dark:bg-white/10 px-1.5 text-xs">{tabCounts[tab.key] || 0}</span>
            </button>
          ))}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-edge-soft dark:border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-faint">
                <th className="pb-3 pr-4">JUDUL</th>
                <th className="pb-3 px-4">TIPE</th>
                <th className="pb-3 px-4">KATEGORI</th>
                <th className="pb-3 px-4">UKURAN</th>
                <th className="pb-3 pl-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-soft dark:divide-slate-800 text-[13px]">
              {pageItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3.5">
                      <MaterialTypeBadgeIcon type={item.type} />
                      <span className="font-extrabold text-navy dark:text-slate-100">
                        {item.title}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-block bg-red-strong text-white text-xs font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                      {TYPE_LABEL[item.type] || item.type}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-bold text-slate-ink dark:text-slate-300" title={categoryName(item.topic)}>
                    {item.topic}
                    <span className="block text-xs font-semibold text-slate-faint">{categoryName(item.topic)}</span>
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-ink dark:text-slate-300">
                    {item.size}
                  </td>

                  <td className="py-3 pl-4 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditEditor(item)}
                        title="Ubah materi"
                        className="w-8 h-8 rounded-[10px] border border-edge dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-ink dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMaterial(item.id)}
                        title="Hapus materi"
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

        {/* MOBILE LIST VIEW */}
        <div className="md:hidden divide-y divide-edge-soft dark:divide-slate-800">
          {pageItems.map((item) => (
            <div
              key={item.id}
              className="py-3.5 first:pt-1 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <MaterialTypeBadgeIcon type={item.type} />
                <div className="min-w-0">
                  <div className="font-extrabold text-[14px] text-navy dark:text-white truncate">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-block bg-red-strong text-white text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {TYPE_LABEL[item.type] || item.type}
                    </span>
                    <span className="text-xs font-semibold text-slate-muted">
                      {item.topic}, {item.size}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditEditor(item)}
                  aria-label="Ubah materi"
                  className="w-8 h-8 rounded-[10px] border border-edge dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-ink flex items-center justify-center"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteMaterial(item.id)}
                  aria-label="Hapus materi"
                  className="w-8 h-8 rounded-[10px] border border-edge dark:border-slate-700 bg-white dark:bg-slate-800 text-red-strong flex items-center justify-center"
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
            {search.trim() ? "Tidak ada materi yang cocok dengan pencarian." : activeTab === "VIDEO" ? "Belum ada video. Tekan “Unggah materi” lalu pilih tipe VIDEO." : "Tidak ada materi pada kategori ini."}
          </div>
        )}

        {/* Pagination Footer */}
        <div className="mt-5 pt-4 border-t border-edge-soft dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs font-bold text-slate-muted">
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
                    ? "bg-red-tint border-[1.5px] border-red-strong text-red-strong"
                    : "bg-white dark:bg-slate-800 border border-edge dark:border-slate-700 text-slate-mid dark:text-slate-300 hover:bg-slate-50"
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

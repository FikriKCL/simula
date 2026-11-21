"use client";
import {useState} from "react";
import type {ContentTree} from "../types";
import ContentSetup from "./ContentSetup";
export default function ModuleDialog({tree,onChange,onClose}:{tree:ContentTree;onChange:()=>void;onClose:()=>void}){
 const [id,setId]=useState(0);const selected=tree.modules.find(m=>m.id===id)||tree.modules[0];
 return <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4"><div style={{maxHeight:"90vh",overflowY:"auto"}} className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[20px] border-2 border-[#1E293B] border-b-[4px] p-5 space-y-4 shadow-xl"><h2 className="text-lg font-black text-[#1E293B] dark:text-white">Modul dan pelajaran</h2><label className="block text-xs font-extrabold text-[#1E293B] dark:text-slate-200 mb-1">Modul<select className="w-full h-10 px-3 rounded-[12px] border-[1.5px] border-[#1E293B] text-sm font-bold" value={selected?.id||""} onChange={e=>setId(Number(e.target.value))}>{tree.modules.map(m=><option key={m.id} value={m.id}>{m.title} · {m.status}</option>)}</select></label><ContentSetup tree={tree} selectedModule={selected} onChange={onChange}/><button type="button" className="px-4 py-2 rounded-[12px] border border-[#DCE3EC] text-xs font-extrabold text-[#64748B] cursor-pointer" onClick={onClose}>Kembali</button></div></div>;
}

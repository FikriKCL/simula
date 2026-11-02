import { STARTERS } from "@/lib/chat/constants";
import { SimulaLogo } from "./icons";

export default function EmptyState({ onPick, disabled }: { onPick: (prompt: string) => void; disabled: boolean }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center px-4 py-10">
      <SimulaLogo className="h-14 w-14 rounded-2xl text-2xl" />
      <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
        Halo! Ada yang bisa SIMULA bantu?
      </h1>
      <p className="mt-2 max-w-lg text-center text-[15px] leading-6 text-slate-500 dark:text-slate-400">
        Tanyakan materi Palang Merah Remaja. Jawaban disusun dari 18 modul resmi PMI, lengkap dengan rujukannya.
      </p>

      <div className="mt-8 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
        {STARTERS.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onPick(s.prompt)}
            disabled={disabled}
            className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-red-200 hover:bg-red-50/60 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-red-900/70 dark:hover:bg-red-950/20"
          >
            <span className="text-xl leading-none" aria-hidden="true">
              {s.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">{s.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300">
                {s.prompt}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

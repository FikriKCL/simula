import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import { PikoMascot } from "@/components/PikoMascot";
import { Cross } from "@/components/Icons";
import { ComicIcon, PdfIcon, VideoIcon } from "@/components/MateriIcons";
import { BadgeIcon, BookCrossIcon, StarIcon, type BadgeKind } from "@/components/ProfilIcons";

// Data contoh: ganti dengan data dari API / database Anda
const user = {
  name: "Raka",
  joined: "Oktober 2026",
  rank: "Level 3 · Sahabat PMI Cilik",
};

const stats = [
  { value: "5", label: "Level selesai", icon: <Cross size={38} />, soft: false },
  { value: "1 (PP)", label: "Materi", icon: <BookCrossIcon size={34} />, soft: true },
  { value: "10", label: "Materi dibuka", icon: <PdfIcon size={40} />, soft: false },
];

const lencana: { kind: BadgeKind; label: string; earned: boolean }[] = [
  { kind: "plester", label: "Plester Pertama", earned: true },
  { kind: "termometer", label: "Cek Suhu", earned: true },
  { kind: "hati", label: "Penolong Baik", earned: true },
  { kind: "salib", label: "Sahabat PMI", earned: true },
  { kind: "perban", label: "Perban Rapi", earned: false },
  { kind: "kotak", label: "Ahli P3K", earned: false },
  { kind: "tangan", label: "Tangan Bersih", earned: false },
  { kind: "apel", label: "Makan Sehat", earned: false },
];

const progres = [
  { label: "Dokumen/PDF", done: 5, total: 9, icon: <PdfIcon size={26} /> },
  { label: "Video", done: 3, total: 9, icon: <VideoIcon size={26} /> },
  { label: "Komik", done: 2, total: 9, icon: <ComicIcon size={26} /> },
];

const panel = "rounded-[22px] border-2 border-line bg-surface shadow-pop";

export default function ProfilPage() {
  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="profil" />

      <main className="relative overflow-hidden pb-30 pt-6">
        <div className="mx-auto flex w-[min(800px,calc(100%-48px))] flex-col gap-4">
          {/* Banner */}
          <div className="flex items-center justify-between rounded-[20px] bg-sky px-[26px] py-[18px] text-[#1c2b3d] shadow-[0_5px_0_var(--blue-edge)] dark:text-white">
            <div>
              <h1 className="font-heading text-[22px] font-extrabold">Profil Saya</h1>
              <p className="mt-0.5 text-[13px] font-bold">Lihat semua perjalanan belajarmu</p>
            </div>
            <button className="cursor-pointer rounded-[14px] border-[3px] border-[#1c2b3d] bg-white px-6 py-2.5 font-heading text-sm font-extrabold text-[#1c2b3d] shadow-[0_3px_0_#1c2b3d] transition active:translate-y-[3px] active:shadow-none">
              Ubah Profil
            </button>
          </div>

          {/* Kartu profil */}
          <section
            className={`${panel} flex items-center gap-[26px] py-6 pl-7 pr-6 max-[560px]:flex-col max-[560px]:text-center`}
          >
            <div className="relative m-2 size-[118px] shrink-0 overflow-hidden rounded-full bg-sky-soft shadow-[0_0_0_7px_var(--red-soft)]">
              {/* Potong maskot supaya hanya kepala yang tampak */}
              <PikoMascot className="absolute -left-9 -top-3.5 h-auto w-[190px]" />
            </div>
            <div>
              <h2 className="font-heading text-4xl font-extrabold leading-[1.1]">{user.name}</h2>
              <p className="mt-1 text-[17px] font-semibold text-muted">Bergabung sejak {user.joined}</p>
              <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 font-heading text-sm font-extrabold text-brand">
                <StarIcon size={16} />
                {user.rank}
              </span>
            </div>
          </section>

          {/* Statistik */}
          <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
            {stats.map((s) => (
              <div key={s.label} className={`${panel} flex items-center gap-3.5 rounded-[18px] px-[18px] py-4`}>
                <div
                  className={`grid size-[42px] shrink-0 place-items-center ${
                    s.soft ? "rounded-full bg-sky-soft" : ""
                  }`}
                >
                  {s.icon}
                </div>
                <div>
                  <strong className="block font-heading text-2xl font-extrabold leading-[1.1]">{s.value}</strong>
                  <span className="text-sm font-semibold text-muted">{s.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Lencana + Progres */}
          <div className="grid grid-cols-2 items-stretch gap-3.5 max-[900px]:grid-cols-1">
            <section className={`${panel} p-5`}>
              <h3 className="mb-3.5 font-heading text-xl font-extrabold">Lencana Saya</h3>
              <div className="grid grid-cols-4 gap-x-1.5 gap-y-3">
                {lencana.map((b) => (
                  <div
                    key={b.label}
                    className={`flex flex-col items-center gap-1.5 text-center text-xs font-extrabold leading-tight ${
                      b.earned ? "" : "text-muted"
                    }`}
                  >
                    <div
                      className={`mb-1 grid size-[58px] place-items-center rounded-full ${
                        b.earned
                          ? "bg-gold-soft shadow-[0_4px_0_var(--gold)]"
                          : "bg-lock shadow-[0_4px_0_var(--lock-edge)] [&_svg]:opacity-55 [&_svg]:grayscale"
                      }`}
                    >
                      <BadgeIcon kind={b.kind} size={32} />
                    </div>
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={`${panel} p-5`}>
              <h3 className="mb-3.5 font-heading text-xl font-extrabold">Progres Materi</h3>
              <div className="flex flex-col gap-[18px]">
                {progres.map((p) => (
                  <div key={p.label}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2.5 font-heading text-[17px] font-extrabold">
                        {p.icon}
                        {p.label}
                      </span>
                      <span className="text-[13px] font-bold text-muted">
                        {p.done} dari {p.total}
                      </span>
                    </div>
                    <div
                      className="h-3 overflow-hidden rounded-full bg-line"
                      role="progressbar"
                      aria-label={p.label}
                      aria-valuemin={0}
                      aria-valuemax={p.total}
                      aria-valuenow={p.done}
                    >
                      <div
                        className="h-full rounded-full bg-sky-dark transition-[width] duration-500"
                        style={{ width: `${(p.done / p.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      <RightPanel />
    </div>
  );
}
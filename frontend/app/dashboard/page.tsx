import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import LevelPath from "@/components/LevelPath";
import { banner, btnOutline, column } from "@/components/ui";

function Cloud({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-0 h-[34px] w-[90px] rounded-full ${className}`}
    >
      <span className="absolute -top-5 left-3.5 size-11 rounded-full bg-inherit" />
      <span className="absolute -top-3 left-11 size-[34px] rounded-full bg-inherit" />
    </span>
  );
}

const clouds = [
  "top-[240px] left-10 bg-cloud-blue",
  "top-[840px] right-5 bg-cloud-pink",
  "top-[1450px] left-[60px] bg-cloud-yellow",
];

const sparkles: { char: string; cls: string }[] = [
  { char: "✚", cls: "top-[380px] left-[100px] text-[#f4a6ab]" },
  { char: "✦", cls: "top-[560px] right-[110px] text-[#ffc933]" },
  { char: "✚", cls: "top-[815px] right-[120px] text-[#f4a6ab]" },
  { char: "✦", cls: "top-[985px] left-[140px] text-[#ffc933]" },
  { char: "✚", cls: "top-[1250px] left-[100px] text-[#f4a6ab]" },
  { char: "✦", cls: "top-[1410px] right-[110px] text-[#ffc933]" },
  { char: "✚", cls: "top-[1680px] right-[90px] text-[#f4a6ab]" },
];

export default function Page() {
  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="pembelajaran" />

      <main className="relative overflow-hidden pb-[120px] pt-6">
        <div
          className={`${column} ${banner} relative z-[2] px-[26px] py-[18px]`}
        >
          <div>
            <h1 className="font-heading text-[22px] font-extrabold">
              Pembelajaran Simula
            </h1>
            <p className="mt-0.5 text-[13px] font-bold">
              Pilih modul yang tersedia untuk mulai belajar
            </p>
          </div>
          <Link href="/materi" className={btnOutline}>
            Buku Materi
          </Link>
        </div>

        <p className="mt-[18px] text-center font-heading text-sm font-extrabold text-muted">
          Ayo mulai petualangan sehat!
        </p>

        {/* Dekorasi latar */}
        {clouds.map((cls) => (
          <Cloud key={cls} className={cls} />
        ))}
        {sparkles.map((s) => (
          <span
            key={s.cls}
            aria-hidden
            className={`pointer-events-none absolute z-0 text-xl leading-none ${s.cls}`}
          >
            {s.char}
          </span>
        ))}

        <LevelPath />
      </main>

      <RightPanel />
    </div>
  );
}

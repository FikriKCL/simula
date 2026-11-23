/** Lingkaran berputar. Warnanya mengikuti tema (garis netral + putaran merah). */
export function Spinner({ size = 40, label = "Memuat…" }: { size?: number; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex">
      <span
        aria-hidden="true"
        className="inline-block animate-spin rounded-full border-line border-t-brand motion-reduce:[animation-duration:2s]"
        style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 8)) }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Spinner + teks di tengah. Pakai untuk bagian halaman yang sedang memuat data. */
export function LoadingBlock({ label = "Memuat…", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 text-muted ${className}`}>
      <Spinner />
      <p className="font-heading text-sm font-extrabold" aria-hidden="true">
        {label}
      </p>
    </div>
  );
}

/** Layar penuh. Dipakai di app/loading.tsx saat pindah halaman. */
export function LoadingScreen({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-page">
      <LoadingBlock label={label} />
    </div>
  );
}

/** Kotak kerangka berdenyut: gantikan elemen yang datanya belum datang. */
/** Kotak kerangka berdenyut: gantikan elemen yang datanya belum datang. */
export function Skeleton({ className = "" }: { className?: string }) {
  const radius = /(^|\s)rounded/.test(className) ? "" : "rounded-[14px]";
  return <div aria-hidden="true" className={`animate-pulse bg-line ${radius} ${className}`} />;
}

const pathOffsets = [0, 40, 70, 40, 0]; // zig-zag sama dengan LevelPath

/** Kerangka jalur level untuk halaman Pembelajaran. */
export function LevelPathSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="relative z-[1] mx-auto mt-2 flex w-[min(800px,calc(100%-48px))] flex-col items-center"
    >
      <span className="sr-only">Memuat jalur belajar…</span>
      {pathOffsets.map((offset, i) => (
        <div
          key={i}
          className="flex h-52 w-[160px] flex-col items-center"
          style={{ transform: `translateX(${offset}px)` }}
        >
          <Skeleton className="size-[100px] rounded-full" />
          <Skeleton className="mt-3.5 h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Kerangka kartu materi (cocok dengan kartu di halaman Materi). */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[18px] border-2 border-line bg-surface shadow-pop">
      <Skeleton className="h-[122px] rounded-none" />
      <div className="grid gap-2.5 px-4 pb-4 pt-3.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
    </div>
  );
}

const panelBase = "border-2 border-line bg-surface shadow-pop";

/** Kerangka isi halaman Profil (di bawah banner). */
export function ProfilSkeleton() {
  return (
    <>
      <span role="status" className="sr-only">
        Memuat profil…
      </span>

      {/* Kartu profil */}
      <section
        aria-hidden="true"
        className={`${panelBase} flex items-center gap-[26px] rounded-[22px] py-6 pl-7 pr-6 max-[560px]:flex-col`}
      >
        <Skeleton className="m-2 size-[118px] shrink-0 rounded-full" />
        <div className="grid gap-3 max-[560px]:justify-items-center">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-8 w-44 rounded-full" />
        </div>
      </section>

      {/* Statistik */}
      <div aria-hidden="true" className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${panelBase} flex items-center gap-3.5 rounded-[18px] px-[18px] py-4`}>
            <Skeleton className="size-[42px] shrink-0 rounded-full" />
            <div className="grid gap-2">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Sertifikat */}
      <section aria-hidden="true" className={`${panelBase} rounded-[22px] p-5`}>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-4 w-3/4" />
      </section>

      {/* Lencana + Progres */}
      <div aria-hidden="true" className="grid grid-cols-2 items-stretch gap-3.5 max-[900px]:grid-cols-1">
        <section className={`${panelBase} rounded-[22px] p-5`}>
          <Skeleton className="mb-3.5 h-6 w-36" />
          <div className="grid grid-cols-4 gap-x-1.5 gap-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Skeleton className="size-[58px] rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </section>

        <section className={`${panelBase} rounded-[22px] p-5`}>
          <Skeleton className="mb-3.5 h-6 w-36" />
          <div className="flex flex-col gap-[18px]">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <div className="mb-2 flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
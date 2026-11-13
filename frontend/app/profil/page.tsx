"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, downloadCertificate, type Profile } from "@/lib/api";
import ApiState, { useApiData } from "@/components/ApiState";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import { PikoMascot } from "@/components/PikoMascot";
import { Cross } from "@/components/Icons";
import { ComicIcon, PdfIcon, VideoIcon } from "@/components/MateriIcons";
import {
  BadgeIcon,
  BookCrossIcon,
  StarIcon,
  type BadgeKind,
} from "@/components/ProfilIcons";

/* -------------------------------------------------------------------------- */
/*  Konstanta & tipe                                                          */
/* -------------------------------------------------------------------------- */

const panel = "rounded-[22px] border-2 border-line bg-surface shadow-pop";

const btnSecondary =
  "cursor-pointer rounded-[14px] border-2 border-line bg-surface px-5 py-2.5 font-heading text-sm font-extrabold text-muted shadow-[0_4px_0_var(--border)] transition hover:bg-sky-soft active:translate-y-1 active:shadow-none";

const btnPrimary =
  "cursor-pointer rounded-[14px] bg-brand px-5 py-2.5 font-heading text-sm font-extrabold text-white shadow-[0_4px_0_#b71c1c] transition active:translate-y-1 active:shadow-none";

const BADGE_KINDS: BadgeKind[] = [
  "plester",
  "termometer",
  "hati",
  "salib",
  "perban",
  "kotak",
  "tangan",
  "apel",
];

const TOKEN_KEY = "simula-token";

type Certificate = {
  id: number;
  code: string;
  module_title: string;
  score: number;
};

/* -------------------------------------------------------------------------- */
/*  Helper kecil                                                              */
/* -------------------------------------------------------------------------- */

function materialLabel(kind: string) {
  if (kind === "ARTICLE") return "Artikel";
  if (kind === "COMIC") return "Komik";
  return kind;
}

function materialIcon(kind: string) {
  if (kind === "VIDEO") return <VideoIcon size={26} />;
  if (kind === "COMIC") return <ComicIcon size={26} />;
  return <PdfIcon size={26} />;
}

function formatJoined(date?: string) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/*  Komponen bagian halaman                                                   */
/* -------------------------------------------------------------------------- */

function Banner({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-[20px] bg-sky px-[26px] py-[18px] text-[#1c2b3d] shadow-[0_5px_0_var(--blue-edge)] dark:text-white">
      <div>
        <h1 className="font-heading text-[22px] font-extrabold">Profil Saya</h1>
        <p className="mt-0.5 text-[13px] font-bold">
          Lihat semua perjalanan belajarmu
        </p>
      </div>
      <button
        onClick={onEdit}
        className="cursor-pointer rounded-[14px] border-[3px] border-[#1c2b3d] bg-white px-6 py-2.5 font-heading text-sm font-extrabold text-[#1c2b3d] shadow-[0_3px_0_#1c2b3d] transition active:translate-y-[3px] active:shadow-none"
      >
        Ubah Profil
      </button>
    </div>
  );
}

function EditForm({
  name,
  onNameChange,
  onSubmit,
  onCancel,
  saving,
  error,
}: {
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
}) {
  return (
    <form onSubmit={onSubmit} className={`${panel} grid gap-3.5 p-5`}>
      <label className="grid gap-1.5 font-heading text-sm font-extrabold">
        Nama tampilan
        <input
          minLength={2}
          maxLength={100}
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="rounded-[14px] border-2 border-line bg-page px-3.5 py-2.5 text-[15px] font-semibold text-ink outline-none transition focus:border-sky-dark focus:ring-4 focus:ring-sky-soft"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-[14px] bg-brand-soft px-3.5 py-2.5 text-sm font-bold text-brand"
        >
          {error}
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={saving}
          className={`${btnPrimary} flex-1 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondary}>
          Batal
        </button>
      </div>
    </form>
  );
}

function LogoutDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-6"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-desc"
        onClick={(e) => e.stopPropagation()}
        className={`${panel} w-[min(420px,100%)] animate-pop-in p-6 text-center motion-reduce:animate-none`}
      >
        <div className="mx-auto mb-3.5 grid size-[60px] place-items-center rounded-full bg-brand-soft text-brand">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2
          id="logout-title"
          className="font-heading text-[22px] font-extrabold"
        >
          Yakin ingin keluar?
        </h2>
        <p id="logout-desc" className="mt-1.5 text-[15px] font-semibold text-muted">
          Kamu perlu masuk lagi untuk melanjutkan belajar.
        </p>

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className={`${btnSecondary} flex-1`}
          >
            Batal
          </button>
          <button type="button" onClick={onConfirm} className={`${btnPrimary} flex-1`}>
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({
  name,
  joined,
  rank,
}: {
  name: string;
  joined: string;
  rank: string;
}) {
  return (
    <section
      className={`${panel} flex items-center gap-[26px] py-6 pl-7 pr-6 max-[560px]:flex-col max-[560px]:text-center`}
    >
      <div className="relative m-2 size-[118px] shrink-0 overflow-hidden rounded-full bg-sky-soft shadow-[0_0_0_7px_var(--red-soft)]">
        {/* Maskot dipotong supaya hanya kepala yang tampak */}
        <PikoMascot className="absolute top-4 h-auto w-[190px]" />
      </div>
      <div>
        <h2 className="font-heading text-4xl font-extrabold leading-[1.1]">
          {name}
        </h2>
        <p className="mt-1 text-[17px] font-semibold text-muted">
          Bergabung sejak {joined}
        </p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 font-heading text-sm font-extrabold text-brand">
          <StarIcon size={16} />
          {rank}
        </span>
      </div>
    </section>
  );
}

type Stat = { value: number; label: string; icon: ReactNode; soft: boolean };

function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`${panel} flex items-center gap-3.5 rounded-[18px] px-[18px] py-4`}
        >
          <div
            className={`grid size-[42px] shrink-0 place-items-center ${
              s.soft ? "rounded-full bg-sky-soft" : ""
            }`}
          >
            {s.icon}
          </div>
          <div>
            <strong className="block font-heading text-2xl font-extrabold leading-[1.1]">
              {s.value}
            </strong>
            <span className="text-sm font-semibold text-muted">{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CertificatesSection() {
  const certificates = useApiData<Certificate[]>("/certificates");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function download(id: number, code: string) {
    setBusyId(id);
    setError("");
    try {
      await downloadCertificate(id, code);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className={`${panel} p-5`}>
      <h2 className="text-xl font-bold">Sertifikat Saya</h2>

      <ApiState
        loading={certificates.loading}
        error={certificates.error}
        retry={certificates.reload}
      />

      {certificates.data?.length === 0 && (
        <p className="mt-3 text-muted">
          Selesaikan tes akhir untuk mendapatkan sertifikat.
        </p>
      )}

      {certificates.data?.map((c) => (
        <div key={c.id} className="mt-3 flex justify-between gap-3">
          <span>
            {c.module_title} · Nilai {c.score}
          </span>
          <button
            disabled={busyId !== null}
            onClick={() => download(c.id, c.code)}
            className="text-brand underline"
          >
            {busyId === c.id ? "Mengunduh…" : "Unduh"}
          </button>
        </div>
      ))}

      {error && <p role="alert">{error}</p>}
    </section>
  );
}

type Badge = { kind: BadgeKind; label: string; earned: boolean };

function BadgesSection({ badges }: { badges: Badge[] }) {
  return (
    <section className={`${panel} p-5`}>
      <h3 className="mb-3.5 font-heading text-xl font-extrabold">
        Lencana Saya
      </h3>
      <div className="grid grid-cols-4 gap-x-1.5 gap-y-3">
        {badges.map((b) => (
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
  );
}

type Progress = { label: string; done: number; total: number; icon: ReactNode };

function ProgressSection({ items }: { items: Progress[] }) {
  return (
    <section className={`${panel} p-5`}>
      <h3 className="mb-3.5 font-heading text-xl font-extrabold">
        Progres Materi
      </h3>
      <div className="flex flex-col gap-[18px]">
        {items.map((p) => (
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
                style={{ width: `${(p.total ? p.done / p.total : 0) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Halaman utama                                                             */
/* -------------------------------------------------------------------------- */

export default function ProfilPage() {
  const router = useRouter();
  const source = useApiData<Profile>("/users/me/summary");
  const data = source.data;

  // State: ubah profil
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // State: dialog keluar
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Tutup dialog keluar dengan tombol Esc
  useEffect(() => {
    if (!confirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  function openEdit() {
    setName(data?.user.display_name || "");
    setEditing(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setSaveError("");
    try {
      await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          display_name: name,
          avatar_url: data.user.avatar_url,
          locale: data.user.locale,
          theme: data.user.theme,
        }),
      });
      setEditing(false);
      source.reload();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event("simula-auth-expired"));
    router.push("/login");
  }

  // Semua hook sudah dipanggil di atas, jadi return awal ini aman
  if (source.loading || source.error) {
    return (
      <ApiState
        loading={source.loading}
        error={source.error}
        retry={source.reload}
      />
    );
  }

  // Data turunan untuk ditampilkan
  const stats: Stat[] = [
    {
      value: data?.completed_levels || 0,
      label: "Level selesai",
      icon: <Cross size={38} />,
      soft: false,
    },
    {
      value: data?.total_levels || 0,
      label: "Total level",
      icon: <BookCrossIcon size={34} />,
      soft: true,
    },
    {
      value: data?.opened_materials || 0,
      label: "Materi dibuka",
      icon: <PdfIcon size={40} />,
      soft: false,
    },
  ];

  const badges: Badge[] = (data?.badges || []).map((b, i) => ({
    kind: BADGE_KINDS[i % BADGE_KINDS.length],
    label: b.name,
    earned: b.earned,
  }));

  const progress: Progress[] = (data?.material_progress || []).map((p) => ({
    label: materialLabel(p.kind),
    done: p.completed,
    total: p.total,
    icon: materialIcon(p.kind),
  }));

  return (
    <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)_320px] max-[1100px]:grid-cols-[200px_minmax(0,1fr)] max-[720px]:grid-cols-1">
      <Sidebar active="profil" />

      <main className="relative overflow-hidden pb-30 pt-6">
        <div className="mx-auto flex w-[min(800px,calc(100%-48px))] flex-col gap-4">
          <Banner onEdit={openEdit} />

          <button
            type="button"
            className="self-end cursor-pointer rounded-full border-2 border-brand px-4 py-1.5 font-heading text-sm font-extrabold text-brand transition-colors hover:bg-brand-soft"
            onClick={() => setConfirmOpen(true)}
          >
            Keluar
          </button>

          {editing && (
            <EditForm
              name={name}
              onNameChange={setName}
              onSubmit={save}
              onCancel={() => setEditing(false)}
              saving={saving}
              error={saveError}
            />
          )}

          {confirmOpen && (
            <LogoutDialog
              onCancel={() => setConfirmOpen(false)}
              onConfirm={logout}
            />
          )}

          <ProfileCard
            name={data?.user.display_name || ""}
            joined={formatJoined(data?.user.created_at)}
            rank={`${data?.user.xp || 0} XP · ${data?.earned_badges || 0} lencana`}
          />

          <StatsGrid stats={stats} />

          <CertificatesSection />

          <div className="grid grid-cols-2 items-stretch gap-3.5 max-[900px]:grid-cols-1">
            <BadgesSection badges={badges} />
            <ProgressSection items={progress} />
          </div>
        </div>
      </main>

      <RightPanel />
    </div>
  );
}

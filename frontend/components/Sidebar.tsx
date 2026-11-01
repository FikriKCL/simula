import Link from "next/link";
import { BooksIcon, Cross, ProfileIcon } from "./Icons";

export type NavKey = "pembelajaran" | "materi" | "profil";

const items: { key: NavKey; href: string; label: string; icon: React.ReactNode }[] = [
  { key: "pembelajaran", href: "/", label: "Pembelajaran", icon: <Cross size={34} color="currentColor" dot="var(--bg)" /> },
  { key: "materi", href: "/materi", label: "Materi", icon: <BooksIcon size={38} /> },
  { key: "profil", href: "/profil", label: "Profil", icon: <ProfileIcon size={44} /> },
];

export default function Sidebar({ active }: { active: NavKey }) {
  return (
    <aside
      className="sticky top-0 flex h-screen flex-col gap-3 border-r-2 border-line px-4 py-7
        max-[720px]:fixed max-[720px]:inset-x-0 max-[720px]:bottom-0 max-[720px]:top-auto max-[720px]:z-30
        max-[720px]:h-auto max-[720px]:flex-row max-[720px]:justify-around max-[720px]:border-r-0
        max-[720px]:border-t-2 max-[720px]:bg-page max-[720px]:p-2"
    >
      <div className="flex items-center gap-2 px-3 pb-5 font-heading text-[34px] font-black tracking-[-1px] text-brand max-[720px]:hidden">
        <Cross size={30} />
        simula
      </div>

      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-4 rounded-[14px] border-2 px-4 py-3.5 font-heading text-sm font-extrabold uppercase tracking-[0.8px] transition-colors [&_svg]:shrink-0 [&_svg]:text-ink ${
              isActive
                ? "border-brand bg-brand-soft text-brand"
                : "border-transparent text-muted hover:bg-sky-soft"
            }`}
          >
            {item.icon}
            <span className="max-[720px]:hidden">{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
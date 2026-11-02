import { PikoMascot } from "./PikoMascot";

/** Avatar bulat yang memotong maskot Piko menjadi bentuk kepala. */
export function PikoAvatar({ size = 38, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-full bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute block"
        style={{ width: size * 1.61, left: -size * 0.305, top: -size * 0.12 }}
      >
        <PikoMascot className="h-auto w-full" />
      </span>
    </span>
  );
}
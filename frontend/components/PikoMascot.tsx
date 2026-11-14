import Image from "next/image";
import piko from "../app/src/piko.png"; // sesuaikan nama file PNG Anda

/** Maskot Dokter Piko (gambar PNG). */
export function PikoMascot({ className }: { className?: string }) {
  return <Image src={piko} alt="Dokter Piko" className={className} draggable={false} />;
}
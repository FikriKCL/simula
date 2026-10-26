import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIMULA - Asisten Edukasi PMR & PMI",
  description: "Platform Asisten Belajar RAG Kepalangmerahan Palang Merah Remaja (PMR Mula) & PMI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full w-full m-0 p-0 bg-slate-50 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}

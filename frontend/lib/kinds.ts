/** Satu nama per jenis materi, dipakai siswa dan admin. */
export const KIND_LABEL = {
  ARTICLE: "Artikel",
  PDF: "Buku materi",
  VIDEO: "Video",
  COMIC: "Komik",
} as const;

export type MaterialKind = keyof typeof KIND_LABEL;

/** Kategori tab: artikel + buku = Dokumen. */
export const DOC_TAB_LABEL = "Dokumen";

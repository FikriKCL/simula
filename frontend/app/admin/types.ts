export type AdminTab = "dashboard" | "pendaftaran" | "materi" | "soal";

export interface MemberProgress {
  id: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  name: string;
  pp: number;
  asb: number;
  prs: number;
  total: number;
  lastActive: string;
  lastActiveAt?: number;
}

export type RegistrationStatus = "menunggu" | "diterima" | "ditolak";

export interface AccountRegistration {
  id: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  name: string;
  email: string;
  registeredAt: string;
  status: RegistrationStatus;
}

export type MaterialType = "ARTICLE" | "PDF" | "VIDEO" | "KOMIK";
export type TopicCode = "PP" | "ASB" | "KR";

export interface LearningMaterial {
  id: string;
  title: string;
  type: MaterialType;
  topic: TopicCode;
  size: string;
  lessonId?: number;
  moduleId?: number;
  moduleStatus?: string;
  body?: string;
  thumbnailKey?: string | null;
  thumbnailUrl?: string | null;
  url?: string | null;
  pages?: {image_url:string;alt:string;text:string}[];
  videoProvider?: "youtube"|"vimeo"|null;
  videoId?: string|null;
  durationSeconds?: number|null;
  position?: number;
  required?: boolean;
}

export type QuestionType =
  | "Pilihan ganda"
  | "Pilihan bergambar"
  | "Benar / salah"
  | "Cocokkan"
  | "Urutkan";

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface QuizQuestion {
  id: string;
  number: number;
  question: string;
  topic: TopicCode;
  topicFull: string;
  type: QuestionType;
  level: string;
  options: QuestionOption[];
  quizId?: number;
  imageUrl?: string | null;
  correctOptionId: string;
  explanation: string;
}
// Backend fields extend the original view models; presentation fields remain local.
export type {ContentTree, Module, Lesson, Material, Page, BankQuestion, QuestionDraft} from "./backend-types";

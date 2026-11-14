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

export type MaterialType = "PDF" | "VIDEO" | "KOMIK";
export type TopicCode = "PP" | "ASB" | "PRS";

export interface LearningMaterial {
  id: string;
  title: string;
  type: MaterialType;
  topic: TopicCode;
  size: string;
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
  correctOptionId: string;
  explanation: string;
}
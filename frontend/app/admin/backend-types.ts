export type AdminTab = "dashboard" | "pendaftaran" | "materi" | "soal";
export type Topic = { id: number; code: string; name: string };
export type Module = {
  id: number;
  topic_id: number;
  title: string;
  level: number;
  status: string;
  created_by: number;
  description: string;
};
export type Lesson = {
  id: number;
  module_id: number;
  title: string;
  position: number;
};
export type Quiz = {
  id: number;
  module_id: number;
  title: string;
  kind: "PRE" | "POST";
  pass_score: number;
};
export type ContentTree = {
  topics: Topic[];
  modules: Module[];
  lessons: Lesson[];
  quizzes: Quiz[];
};
export type Account = {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  active: boolean;
  registration_status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  xp: number;
};
export type Member = Account & {
  progress: Record<string, number>;
  total_progress: number;
  last_learning_at: string | null;
};
export type Page<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
export type BankQuestion = {
  question_type?: "SINGLE_CHOICE"|"IMAGE_CHOICE"|"TRUE_FALSE"|"ORDERING"|"MATCHING";
  left_items?: string[];
  image_url: string | null;
  option_images: (string|null)[];
  id: number;
  quiz_id: number;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
  active: boolean;
};
export type QuestionDraft = {
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
};
export type Material = {
  meta: string;
  id: number;
  lesson_id: number;
  title: string;
  kind: "ARTICLE" | "COMIC" | "VIDEO" | "PDF";
  body: string;
  url: string | null;
  thumbnail_url: string | null;
  thumbnail_key: string | null;
  pages: { image_url: string; alt: string; text: string }[];
  video_provider: "youtube" | "vimeo" | null;
  video_id: string | null;
  page_count: number | null;
  duration_seconds: number | null;
  position: number;
  required: boolean;
};

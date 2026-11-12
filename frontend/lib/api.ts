export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token =
    typeof window === "undefined"
      ? null
      : sessionStorage.getItem("simula-token");
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Backend tidak dapat dihubungi. Pastikan server API berjalan.",
      0,
    );
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && token) {
      sessionStorage.removeItem("simula-token");
      window.dispatchEvent(new Event("simula-auth-expired"));
    }
    throw new ApiError(
      typeof data.detail === "string"
        ? data.detail
        : "Permintaan gagal. Periksa isian dan coba lagi.",
      response.status,
    );
  }
  return response;
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await request(path, init);
  if (response.status === 204) return undefined as T;
  return response.json();
}
export async function downloadCertificate(id: number, code: string) {
  const response = await request(`/certificates/${id}/download`);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `${code}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export type Kind = "ARTICLE" | "VIDEO" | "COMIC" | "PDF";
export type MaterialCard = {
  id: number;
  lesson_id: number;
  module_id: number;
  title: string;
  kind: Kind;
  thumbnail_key: string | null;
  locked: boolean;
  completed: boolean;
  page_count: number | null;
  duration_seconds: number | null;
};
export type Material = MaterialCard & {
  body: string;
  url: string | null;
  video_provider: "youtube" | "vimeo" | null;
  video_id: string | null;
  pages: { image_url: string; alt: string; text: string }[];
};
export type PathTopic = {
  id: number;
  name: string;
  levels: {
    id: number;
    title: string;
    level: number;
    status: "COMPLETED" | "AVAILABLE" | "LOCKED";
  }[];
};
export type Profile = {
  user: {
    display_name: string;
    username: string;
    created_at: string;
    avatar_url: string | null;
    locale: "id" | "en";
    theme: "light" | "dark" | "system";
    xp: number;
  };
  completed_levels: number;
  total_levels: number;
  current_level: number | null;
  earned_badges: number;
  opened_materials: number;
  badges: { id: number; name: string; earned: boolean }[];
  material_progress: {
    kind: Kind;
    total: number;
    opened: number;
    completed: number;
  }[];
};
export type ModuleDetail = {
  id: number;
  title: string;
  description: string;
  lessons: { id: number; title: string; body: string }[];
  quizzes: { id: number; title: string; kind: string }[];
};
export type QuizRun = {
  id: number;
  quiz_id: number;
  expires_at: string;
  pass_score: number;
  questions: { id: number; prompt: string; options: string[] }[];
};
export type QuizResult = {
  score: number;
  passed: boolean;
  xp_awarded: number;
  certificate_id: number | null;
  feedback: { question_id: number; correct: boolean; explanation: string }[];
};

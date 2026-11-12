export interface Source {
  doc_title?: string;
  section_title?: string;
  similarity?: number;
  title?: string;
}

export type MessageStatus = "streaming" | "done" | "stopped" | "error";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  status: MessageStatus;
  mode?: string;
  sources?: Source[];
  suggestions?: string[];
  isEmergency?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export const MAX_INPUT_CHARS = 2000; // matches ChatInput.message max_length in the backend

// How many past Q&A messages are sent back as context (backend accepts up to 20)
export const HISTORY_WINDOW = 6;
export const HISTORY_TEXT_LIMIT = 4000;

// Backend replies that are failures rather than answers: shown with a retry button
export const ERROR_MODES = new Set(["rag_error", "rag_unavailable"]);

// Replies that must never be sent back to the model as conversation context
export const NON_CONTEXT_MODES = new Set([
  ...ERROR_MODES,
  "network_error",
  "backend_offline",
  "connection_error",
  "rate_limited",
  "invalid_input",
  "empty_reply",
]);

export const STARTERS = [
  {
    icon: "🚑",
    title: "Pertolongan Pertama",
    prompt: "Bagaimana langkah pertolongan pertama pada luka bakar melepuh?",
  },
  {
    icon: "🌋",
    title: "Siaga Bencana",
    prompt: "Apa yang harus dilakukan saat terjadi gempa bumi di dalam gedung?",
  },
  {
    icon: "🌐",
    title: "Gerakan Palang Merah",
    prompt: "Sebutkan dan jelaskan 7 Prinsip Dasar Gerakan Palang Merah!",
  },
  {
    icon: "🩸",
    title: "Donor Darah",
    prompt: "Apa saja syarat-syarat untuk menjadi pendonor darah sukarela?",
  },
  {
    icon: "🩺",
    title: "Kesehatan Remaja",
    prompt: "Bagaimana peran PMR dalam pendidikan kesehatan remaja sebaya?",
  },
  {
    icon: "🧭",
    title: "Kepemimpinan PMR",
    prompt: "Apa saja sikap yang harus dimiliki seorang pemimpin di PMR?",
  },
];

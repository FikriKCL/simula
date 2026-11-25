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

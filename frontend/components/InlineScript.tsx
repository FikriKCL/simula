"use client";

// Runs during HTML parsing on the server render; on the client it is inert text, which keeps
// React from warning about rendering <script> tags (see Next docs: preventing-flash-before-hydration)
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

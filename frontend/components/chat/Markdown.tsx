import type { ReactNode } from "react";

// The model sometimes answers with LaTeX ($100\text{ mm Hg}$); show it as plain text
const MATH_SYMBOLS: [RegExp, string][] = [
  [/\^\{?\\circ\}?|\\degree/g, "°"],
  [/\\times/g, "×"],
  [/\\cdot/g, "·"],
  [/\\pm/g, "±"],
  [/\\geq?(?![a-z])/g, "≥"],
  [/\\leq?(?![a-z])/g, "≤"],
  [/\\neq?(?![a-z])/g, "≠"],
  [/\\(?:rightarrow|to)(?![a-z])/g, "→"],
  [/\\%/g, "%"],
  [/\\[,;: ]/g, " "],
  [/\^\{?2\}?/g, "²"],
  [/\^\{?3\}?/g, "³"],
];

function cleanMath(expr: string) {
  let s = expr.replace(/\\(?:text|mathrm|textbf|mathbf|operatorname)\{([^}]*)\}/g, "$1");
  for (const [pattern, replacement] of MATH_SYMBOLS) s = s.replace(pattern, replacement);
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2").replace(/[{}]/g, "");
  return s.replace(/\s+/g, " ").trim();
}

export function normalizeMath(text: string) {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr: string) => cleanMath(expr))
    .replace(/\$([^$\n]+?)\$/g, (match, expr: string) =>
      /[\\^_{}]|^[\d\s.,+\-–=<>/%]+$/.test(expr) ? cleanMath(expr) : match
    );
}

// **bold**, `code`, [link](https://...), bare URLs and *italic*
const INLINE_PATTERN =
  /(\*\*[^*\n]+?\*\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]|\*[^*\s](?:[^*\n]*[^*\s])?\*)/g;

const linkClass =
  "font-medium text-red-700 underline decoration-red-300 underline-offset-2 hover:text-red-800 dark:text-red-300 dark:decoration-red-700";

export function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_PATTERN).map((part, index) => {
    if (!part) return null;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      return (
        <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {link[1]}
        </a>
      );
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className={`${linkClass} break-all`}>
          {part}
        </a>
      );
    }
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-slate-900 dark:text-white">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-red-700 dark:bg-slate-800 dark:text-red-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

const LIST_ITEM = /^(\s*)([-*+•]|\d+[.)])\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const WARNING = /^(perhatian|peringatan|penting|awas|jangan sekali-kali)\b/i;

function isTableRow(line: string) {
  const t = line.trim();
  return t.startsWith("|") && t.length > 1;
}

function splitRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function startsBlock(line: string) {
  const t = line.trim();
  return (
    !t ||
    t.startsWith("```") ||
    t.startsWith(">") ||
    HEADING.test(t) ||
    LIST_ITEM.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(t) ||
    isTableRow(line)
  );
}

export default function Markdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const lines = normalizeMath(text).replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const key = `b-${i}`;

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block (may still be open while streaming)
    if (trimmed.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre
          key={key}
          className="overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100 dark:bg-black/50"
        >
          <code>{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Table: header row, optional |---| separator, body rows
    if (isTableRow(line) && i + 1 < lines.length && isTableRow(lines[i + 1])) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        if (!/^\|?[\s\-:|]+\|?$/.test(lines[i].trim())) rows.push(splitRow(lines[i]));
        i++;
      }
      const [header, ...body] = rows;
      blocks.push(
        <div key={key} className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr>
                {header.map((cell, c) => (
                  <th key={c} className="border-b border-slate-200 px-3 py-2 font-semibold dark:border-slate-700">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="px-3 py-2 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={key} className="border-slate-200 dark:border-slate-800" />);
      i++;
      continue;
    }

    const heading = trimmed.match(HEADING);
    if (heading) {
      const level = heading[1].length;
      const cls =
        level <= 2
          ? "text-base font-bold text-slate-900 dark:text-white"
          : "text-[15px] font-semibold text-slate-900 dark:text-white";
      blocks.push(
        <p key={key} role="heading" aria-level={Math.min(level + 2, 6)} className={`pt-1 ${cls}`}>
          {renderInline(heading[2].replace(/#+$/, "").trim())}
        </p>
      );
      i++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key}
          className="space-y-1 rounded-r-lg border-l-4 border-red-300 bg-red-50/50 py-2 pl-3 pr-2 text-slate-700 dark:border-red-800 dark:bg-red-950/20 dark:text-slate-300"
        >
          {quote.filter(Boolean).map((q, k) => (
            <p key={k}>{renderInline(q)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Lists: consecutive items (blank lines between items keep the list together)
    if (LIST_ITEM.test(line)) {
      const items: { level: number; marker: string; ordered: boolean; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_ITEM);
        if (m) {
          const ordered = /\d/.test(m[2]);
          items.push({
            level: Math.min(Math.floor(m[1].replace(/\t/g, "  ").length / 2), 3),
            marker: ordered ? m[2].replace(")", ".") : "",
            ordered,
            text: m[3],
          });
          i++;
        } else if (!lines[i].trim() && i + 1 < lines.length && LIST_ITEM.test(lines[i + 1])) {
          i++;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          // Indented continuation of the previous item
          items[items.length - 1].text += ` ${lines[i].trim()}`;
          i++;
        } else {
          break;
        }
      }
      blocks.push(
        <ul key={key} className="space-y-1.5">
          {items.map((item, k) => (
            <li key={k} className="flex gap-2.5" style={{ paddingLeft: `${item.level * 1.25}rem` }}>
              {item.ordered ? (
                <span className="min-w-5 shrink-0 font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {item.marker}
                </span>
              ) : (
                <span
                  className={`mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full ${
                    item.level ? "border border-red-500" : "bg-red-500"
                  }`}
                />
              )}
              <span className="min-w-0 flex-1">{renderInline(item.text)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Paragraph: join consecutive plain lines
    const para: string[] = [];
    while (i < lines.length && (para.length === 0 || !startsBlock(lines[i]))) {
      para.push(lines[i].trim());
      i++;
    }
    const plain = para.join(" ").replace(/\*\*/g, "");
    if (WARNING.test(plain)) {
      blocks.push(
        <div
          key={key}
          className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <span aria-hidden="true">⚠️</span>
          <p className="min-w-0">{renderInline(para.join(" "))}</p>
        </div>
      );
    } else {
      blocks.push(
        <p key={key}>
          {para.map((p, k) => (
            <span key={k}>
              {k > 0 && <br />}
              {renderInline(p)}
            </span>
          ))}
        </p>
      );
    }
  }

  return (
    <div className="space-y-3 break-words text-[15px] leading-7 text-slate-800 dark:text-slate-200">
      {blocks}
      {streaming && (
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse rounded-sm bg-red-500"
        />
      )}
    </div>
  );
}

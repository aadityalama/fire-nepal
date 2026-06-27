"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useFireTheme } from "@/contexts/FireThemeContext";

type FireAiChatMarkdownProps = {
  content: string;
  isUser?: boolean;
};

function CodeBlock({ code, language, light }: { code: string; language?: string; light: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, [code]);

  return (
    <div className="group relative my-2 overflow-hidden rounded-xl">
      {language ? (
        <div
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
            light ? "bg-slate-100 text-slate-500" : "bg-emerald-950/80 text-emerald-400/70"
          }`}
        >
          {language}
        </div>
      ) : null}
      <pre
        className={`overflow-x-auto p-3 text-xs leading-relaxed ${
          light ? "bg-slate-50 text-slate-800" : "bg-black/30 text-emerald-50"
        }`}
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={() => void copy()}
        className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg opacity-0 transition group-hover:opacity-100 ${
          light ? "bg-white text-slate-600 shadow-sm" : "bg-emerald-950/80 text-emerald-200"
        }`}
        aria-label="Copy code"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export function FireAiChatMarkdown({ content, isUser }: FireAiChatMarkdownProps) {
  const light = useFireTheme().resolvedTheme === "light";

  if (isUser) {
    return <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{content}</p>;
  }

  return (
    <div
      className={`fire-ai-markdown text-sm font-medium leading-relaxed ${
        light ? "text-slate-800" : "text-emerald-50"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-black">{children}</strong>,
          h1: ({ children }) => <h3 className="mb-2 mt-3 text-base font-black first:mt-0">{children}</h3>,
          h2: ({ children }) => <h4 className="mb-2 mt-3 text-sm font-black first:mt-0">{children}</h4>,
          h3: ({ children }) => <h5 className="mb-1 mt-2 text-sm font-bold first:mt-0">{children}</h5>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-bold underline underline-offset-2 ${light ? "text-emerald-700" : "text-emerald-300"}`}
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const text = String(children).replace(/\n$/, "");
            const match = /language-(\w+)/.exec(className ?? "");
            const isBlock = className?.includes("language-") || text.includes("\n");
            if (isBlock) {
              return <CodeBlock code={text} language={match?.[1]} light={light} />;
            }
            return (
              <code
                className={`rounded px-1 py-0.5 text-xs font-semibold ${
                  light ? "bg-emerald-50 text-emerald-800" : "bg-emerald-900/50 text-emerald-200"
                }`}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          blockquote: ({ children }) => (
            <blockquote
              className={`my-2 border-l-2 pl-3 italic ${
                light ? "border-emerald-300 text-slate-600" : "border-emerald-500/40 text-emerald-200/80"
              }`}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="min-w-full text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className={`border px-2 py-1 text-left font-bold ${
                light ? "border-emerald-100 bg-emerald-50" : "border-emerald-400/20 bg-emerald-950/50"
              }`}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className={`border px-2 py-1 ${light ? "border-emerald-100" : "border-emerald-400/15"}`}>
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

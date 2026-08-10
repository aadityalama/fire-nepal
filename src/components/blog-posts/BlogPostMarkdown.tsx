import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  return /^https?:\/\//i.test(href) || href.startsWith("//");
}

export function BlogPostMarkdown({ content }: { content: string }) {
  return (
    <div className="blog-prose space-y-4 text-base font-medium leading-relaxed text-emerald-950/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="pt-2 text-2xl font-black tracking-tight text-emerald-950">{children}</h2>
          ),
          h2: ({ children }) => (
            <h2 className="pt-2 text-xl font-black tracking-tight text-emerald-950">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="pt-1 text-lg font-black text-emerald-900">{children}</h3>
          ),
          p: ({ children }) => <p className="text-[15px] leading-relaxed text-slate-700">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-slate-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-slate-700">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-black text-emerald-950">{children}</strong>,
          hr: () => <hr className="border-emerald-100" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-300/80 pl-4 text-[15px] italic text-slate-600">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="-mx-1 overflow-x-auto sm:mx-0">
              <table className="min-w-full border-collapse text-left text-[13px] sm:text-[14px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-emerald-50/80 text-emerald-950">{children}</thead>,
          tbody: ({ children }) => <tbody className="text-slate-700">{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-emerald-100/80 last:border-b-0">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="whitespace-nowrap px-3 py-2.5 text-[11px] font-black uppercase tracking-wide text-emerald-900 sm:px-3.5">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2.5 align-top leading-relaxed sm:px-3.5">{children}</td>
          ),
          a: ({ href, children }) => {
            const external = isExternalHref(href);
            return (
              <a
                href={href}
                className="font-bold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

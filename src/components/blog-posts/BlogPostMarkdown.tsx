import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-bold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

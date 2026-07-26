"use client";

import { ArrowLeft, Bot, CornerDownLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { answerMarketQuestion, type AssistantAnswer } from "@/lib/market/nepse-assistant";
import { useRealtimeMarket } from "@/providers/realtime-provider";

const SUGGESTIONS = [
  "Show today's strongest sector",
  "Top gainers",
  "Top turnover",
  "Market overview",
  "Analyze NABIL",
];

type Exchange = { question: string; answer: AssistantAnswer };

export function NepseAssistantPage() {
  const { snapshot } = useRealtimeMarket();
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    const answer = answerMarketQuestion(trimmed, snapshot);
    setHistory((current) => [{ question: trimmed, answer }, ...current].slice(0, 12));
    setQuery("");
  };

  return (
    <main className="min-h-screen bg-[#f4f8f6] px-3 py-4 text-slate-950 dark:bg-[#030a08] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-center gap-3">
          <Link href="/market" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300" aria-label="Back to NEPSE Hub">
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">FIRE Nepal · NEPSE Hub</p>
            <h1 className="text-xl font-black tracking-tight sm:text-2xl">Market AI Assistant</h1>
          </div>
        </header>

        <section className="rounded-[1.75rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_4%_0%,rgba(52,211,153,0.2),transparent_35%),linear-gradient(145deg,#063126,#06120f)] p-5 text-white sm:p-6">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-emerald-300" aria-hidden />
            <h2 className="text-base font-black">Ask the live market</h2>
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-50/60">
            Deterministic answers computed from the live NEPSE snapshot — sectors, leaders, company briefs. No fabricated data, no buy/sell calls.
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              ask(query);
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='e.g. "Why did SHIVM fall today?"'
              aria-label="Ask a market question"
              className="h-12 min-w-0 flex-1 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white placeholder:text-emerald-50/40 outline-none transition focus:border-emerald-300/60"
            />
            <button type="submit" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-emerald-950 transition hover:brightness-105" aria-label="Ask">
              <CornerDownLeft size={18} />
            </button>
          </form>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => ask(suggestion)}
                className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-emerald-50/80 transition hover:border-emerald-300/50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-4 space-y-3">
          {history.map((exchange, index) => (
            <article key={`${exchange.question}-${index}`} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
              <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-600">You asked</p>
              <p className="mt-0.5 text-sm font-extrabold">{exchange.question}</p>
              <div className="mt-3 rounded-2xl bg-emerald-500/[0.06] p-3.5 dark:bg-emerald-400/[0.05]">
                <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">{exchange.answer.title}</p>
                <ul className="mt-2 space-y-1.5">
                  {exchange.answer.lines.map((line) => (
                    <li key={line} className="text-xs font-semibold leading-relaxed text-slate-700 dark:text-zinc-300">{line}</li>
                  ))}
                </ul>
                {exchange.answer.symbols.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {exchange.answer.symbols.map((symbol) => (
                      <Link key={symbol} href={`/market/company/${encodeURIComponent(symbol)}`} className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black text-emerald-800 transition hover:bg-emerald-500/25 dark:text-emerald-300">
                        Open {symbol}
                      </Link>
                    ))}
                  </div>
                ) : null}
                {exchange.answer.deferToFireAi ? (
                  <Link href="/fire-ai/chat?context=nepse" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                    <Sparkles size={12} /> Continue in FIRE AI chat
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
          {!history.length ? (
            <p className="px-2 pt-4 text-center text-xs font-medium text-slate-400 dark:text-zinc-600">
              Answers appear here. Everything is computed from the same live feed that powers the hub.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

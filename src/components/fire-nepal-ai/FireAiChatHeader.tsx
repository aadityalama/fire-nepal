"use client";

import { ArrowLeft, MessageSquarePlus, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import type { FireAiConversationSummary } from "@/lib/fire-nepal-ai/types";

type FireAiChatHeaderProps = {
  title: string;
  conversations: FireAiConversationSummary[];
  currentConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  loadingConversations?: boolean;
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function FireAiChatHeader({
  title,
  conversations,
  currentConversationId,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  loadingConversations,
}: FireAiChatHeaderProps) {
  const light = useFireTheme().resolvedTheme === "light";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(title);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRenameValue(title);
  }, [title]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const handleRename = useCallback(async () => {
    if (!currentConversationId || !renameValue.trim()) return;
    await onRenameConversation(currentConversationId, renameValue.trim());
    setRenaming(false);
    setMenuOpen(false);
  }, [currentConversationId, renameValue, onRenameConversation]);

  const handleDelete = useCallback(async () => {
    if (!currentConversationId) return;
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    await onDeleteConversation(currentConversationId);
    setMenuOpen(false);
    setDrawerOpen(false);
  }, [currentConversationId, onDeleteConversation]);

  return (
    <>
      <header
        className={`sticky top-0 z-40 shrink-0 border-b backdrop-blur-xl ${
          light ? "border-emerald-200/60 bg-white/90" : "border-emerald-400/10 bg-[#04140f]/95"
        }`}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-3">
          <Link
            href="/fire-ai"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition active:scale-95 ${
              light ? "text-emerald-800 hover:bg-emerald-50" : "text-emerald-200 hover:bg-white/10"
            }`}
            aria-label="Back to FIRE AI home"
          >
            <ArrowLeft size={20} />
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`min-w-0 flex-1 truncate rounded-xl px-2 py-1.5 text-left text-sm font-black transition active:scale-[0.99] ${
              light ? "text-slate-900 hover:bg-emerald-50/80" : "text-white hover:bg-white/5"
            }`}
          >
            {title}
          </button>

          <button
            type="button"
            onClick={onNewChat}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition active:scale-95 ${
              light ? "text-emerald-800 hover:bg-emerald-50" : "text-emerald-200 hover:bg-white/10"
            }`}
            aria-label="New chat"
          >
            <MessageSquarePlus size={20} />
          </button>

          {currentConversationId ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition active:scale-95 ${
                  light ? "text-emerald-800 hover:bg-emerald-50" : "text-emerald-200 hover:bg-white/10"
                }`}
                aria-label="Conversation options"
              >
                <MoreHorizontal size={20} />
              </button>
              {menuOpen ? (
                <div
                  className={`absolute right-0 top-11 z-50 min-w-[160px] overflow-hidden rounded-2xl border shadow-xl ${
                    light ? "border-emerald-100 bg-white" : "border-emerald-400/20 bg-[#04140f]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(true);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full min-h-[44px] items-center gap-2 px-4 text-sm font-bold ${
                      light ? "text-slate-700 hover:bg-emerald-50" : "text-emerald-100 hover:bg-white/5"
                    }`}
                  >
                    <Pencil size={15} />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    className={`flex w-full min-h-[44px] items-center gap-2 px-4 text-sm font-bold ${
                      light ? "text-red-600 hover:bg-red-50" : "text-red-300 hover:bg-red-950/30"
                    }`}
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="w-10 shrink-0" />
          )}
        </div>
      </header>

      {renaming ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div
            className={`w-full max-w-sm rounded-2xl border p-4 shadow-2xl ${
              light ? "border-emerald-100 bg-white" : "border-emerald-400/20 bg-[#04140f]"
            }`}
            role="dialog"
            aria-label="Rename conversation"
          >
            <h3 className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>Rename chat</h3>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className={`mt-3 w-full rounded-xl border px-3 py-2.5 text-sm font-medium outline-none focus:ring-2 ${
                light
                  ? "border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100"
                  : "border-emerald-400/20 bg-emerald-950/50 text-white focus:ring-emerald-500/20"
              }`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleRename();
              }}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setRenaming(false)}
                className={`min-h-[44px] flex-1 rounded-xl text-sm font-bold ${
                  light ? "bg-slate-100 text-slate-700" : "bg-white/10 text-emerald-100"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRename()}
                className="min-h-[44px] flex-1 rounded-xl bg-emerald-700 text-sm font-bold text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close conversation history"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className={`relative ml-auto flex h-full w-[min(100%,320px)] flex-col shadow-2xl ${
              light ? "bg-white" : "bg-[#04140f]"
            }`}
          >
            <div
              className={`flex items-center justify-between border-b px-4 py-4 ${
                light ? "border-emerald-100" : "border-emerald-400/10"
              }`}
            >
              <h2 className={`text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>Conversations</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className={`grid h-9 w-9 place-items-center rounded-xl ${
                  light ? "hover:bg-emerald-50" : "hover:bg-white/10"
                }`}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {loadingConversations ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`h-14 animate-pulse rounded-2xl ${light ? "bg-emerald-50" : "bg-emerald-950/40"}`} />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <p className={`py-8 text-center text-sm font-semibold ${light ? "text-slate-500" : "text-emerald-200/60"}`}>
                  No conversations yet
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {conversations.map((conv) => (
                    <li key={conv.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectConversation(conv.id);
                          setDrawerOpen(false);
                        }}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99] ${
                          conv.id === currentConversationId
                            ? light
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-emerald-400/40 bg-emerald-950/60"
                            : light
                              ? "border-emerald-100 bg-white hover:bg-emerald-50/50"
                              : "border-emerald-400/10 bg-emerald-950/30 hover:bg-emerald-950/50"
                        }`}
                      >
                        <p className={`truncate text-sm font-bold ${light ? "text-slate-900" : "text-white"}`}>
                          {conv.title}
                        </p>
                        <p className={`mt-0.5 truncate text-xs font-medium ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
                          {conv.preview || "No messages yet"}
                        </p>
                        <p className={`mt-1 text-[10px] font-bold ${light ? "text-slate-400" : "text-emerald-300/50"}`}>
                          {formatRelativeTime(conv.updatedAt)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className={`border-t p-3 ${light ? "border-emerald-100" : "border-emerald-400/10"}`}>
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  setDrawerOpen(false);
                }}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-sm font-bold text-white"
              >
                <MessageSquarePlus size={18} />
                New chat
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

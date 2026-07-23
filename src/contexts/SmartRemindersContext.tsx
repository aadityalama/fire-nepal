"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useLocalStorageJsonState } from "@/hooks/useLocalStorageJsonState";
import { createDefaultSmartRemindersStore } from "@/lib/smart-reminders/default-state";
import {
  buildDedupeKey,
  draftNotificationsForDay,
  makeHistoryEntry,
  nextDueAfterPaid,
  reminderHasEmailNotifications,
  reminderPriority,
  rollForwardDueDateIfNeeded,
} from "@/lib/smart-reminders/reminder-engine";
import { sanitizeSmartRemindersStore } from "@/lib/smart-reminders/sanitize";
import type { InAppNotification, Reminder, SmartRemindersStore } from "@/lib/smart-reminders/types";
import { formatYmd, startOfLocalDay } from "@/lib/smart-reminders/date-utils";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT } from "@/lib/fire-nepal/workspace-data-reset";

const STORAGE_KEY = "fire_nepal_smart_reminders_v1";

type SmartRemindersContextValue = {
  hydrated: boolean;
  store: SmartRemindersStore;
  setStore: React.Dispatch<React.SetStateAction<SmartRemindersStore>>;
  reminders: Reminder[];
  remindersSource: "local" | "cloud";
  cloudSyncing: boolean;
  refreshCloudReminders: () => Promise<void>;
  unreadNotificationCount: number;
  overdueCount: number;
  upcomingSoonCount: number;
  markReminderPaid: (id: string) => Promise<void>;
  addReminder: (input: Omit<Reminder, "id" | "createdAt">) => Promise<void>;
  updateReminder: (id: string, patch: Partial<Omit<Reminder, "id" | "createdAt">>) => void;
  deleteReminder: (id: string) => Promise<void>;
  dismissNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setEmailNotificationsEnabled: (enabled: boolean) => void;
  setUpcomingWithinDays: (days: number) => void;
  pushFamilyShareNotice: (title: string) => void;
};

const SmartRemindersContext = createContext<SmartRemindersContextValue | null>(null);

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

function dedupeSetFromNotifications(notifications: InAppNotification[]): Set<string> {
  const s = new Set<string>();
  for (const n of notifications) {
    if (!n.reminderId) continue;
    const day = formatYmd(startOfLocalDay(new Date(n.createdAt)));
    s.add(buildDedupeKey(n.reminderId, n.kind, day));
  }
  return s;
}

async function fetchCloudReminders(): Promise<Reminder[]> {
  const r = await fetch("/api/scheduled-reminders", { credentials: "include", cache: "no-store" });
  let msg: string | undefined;
  try {
    const j = (await r.json()) as { reminders?: Reminder[]; error?: string; ok?: boolean };
    msg = typeof j.error === "string" ? j.error : undefined;
    if (r.ok) return j.reminders ?? [];
  } catch {
    msg = undefined;
  }
  throw new Error(msg ?? `Could not load cloud reminders (${r.status}).`);
}

export function SmartRemindersProvider({ children }: { children: ReactNode }) {
  const { user, authMode } = useProductAuth();
  const cloudEnabled = isSupabaseConfigured() && authMode === "supabase" && Boolean(user);

  const [store, setStore, hydrated] = useLocalStorageJsonState<SmartRemindersStore>({
    storageKey: STORAGE_KEY,
    getDefault: () => createDefaultSmartRemindersStore(),
    sanitize: sanitizeSmartRemindersStore,
  });

  const [cloudReminders, setCloudReminders] = useState<Reminder[] | null>(null);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);

  const refreshCloudReminders = useCallback(async () => {
    if (!cloudEnabled) return;
    setCloudSyncing(true);
    try {
      const list = await fetchCloudReminders();
      setCloudReminders(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sync reminders from Supabase.");
    } finally {
      setCloudSyncing(false);
      setCloudLoaded(true);
    }
  }, [cloudEnabled]);

  useEffect(() => {
    if (!cloudEnabled) return;
    const t = window.setTimeout(() => {
      void refreshCloudReminders();
    }, 0);
    return () => window.clearTimeout(t);
  }, [cloudEnabled, user?.id, refreshCloudReminders]);

  useEffect(() => {
    const onGlobalReset = () => {
      setStore((prev) => ({
        ...createDefaultSmartRemindersStore(),
        settings: { ...prev.settings },
      }));
      void refreshCloudReminders();
    };
    window.addEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobalReset);
    return () => window.removeEventListener(FIRE_NEPAL_GLOBAL_WORKSPACE_RESET_EVENT, onGlobalReset);
  }, [setStore, refreshCloudReminders]);

  const reminders = useMemo(() => {
    if (cloudEnabled && cloudLoaded) return cloudReminders ?? [];
    return store.reminders;
  }, [cloudEnabled, cloudLoaded, cloudReminders, store.reminders]);

  const remindersSource: "local" | "cloud" = cloudEnabled && cloudLoaded ? "cloud" : "local";

  const [clockTick, setClockTick] = useState(0);

  const syncEngine = useCallback(() => {
    const now = new Date();
    setStore((prev) => {
      const existingKeys = dedupeSetFromNotifications(prev.notifications);
      const drafts = draftNotificationsForDay({
        reminders: cloudEnabled && cloudLoaded ? (cloudReminders ?? []) : prev.reminders,
        now,
        existingDedupeKeys: existingKeys,
        emailNotificationsEnabled: prev.settings.emailNotificationsEnabled,
      });

      if (!drafts.length) return prev;

      const appended: InAppNotification[] = [];
      for (const d of drafts) {
        appended.push({
          id: d.id,
          reminderId: d.reminderId,
          kind: d.kind,
          title: d.title,
          body: d.body,
          createdAt: d.createdAt,
          read: false,
        });
        existingKeys.add(d.dedupeKey);
      }

      let next = { ...prev, notifications: [...appended, ...prev.notifications] };

      const reminderList = cloudEnabled && cloudLoaded ? (cloudReminders ?? []) : prev.reminders;

      if (prev.settings.emailNotificationsEnabled && !cloudEnabled) {
        const extra: InAppNotification[] = [];
        const todayYmd = formatYmd(startOfLocalDay(now));
        for (const d of drafts) {
          const r = reminderList.find((x) => x.id === d.reminderId);
          if (!r || !reminderHasEmailNotifications(r)) continue;

          const emailedAlreadyToday = prev.notifications.some((n) => {
            if (n.reminderId !== r.id || n.kind !== "email_sent") return false;
            return formatYmd(startOfLocalDay(new Date(n.createdAt))) === todayYmd;
          });
          if (emailedAlreadyToday) continue;

          toast.message("FIRE Nepal · Email reminder (demo)", {
            description: `${r.title} — ${d.title}`,
          });

          extra.push({
            id: newId("emailn"),
            reminderId: r.id,
            kind: "email_sent",
            title: "Email notification sent",
            body: `Demo send for “${r.title}”. Sign in with Supabase for real Resend delivery via cron.`,
            createdAt: now.toISOString(),
            read: false,
          });
        }
        if (extra.length) next = { ...next, notifications: [...extra, ...next.notifications] };
      }

      return next;
    });
  }, [setStore, cloudEnabled, cloudLoaded, cloudReminders]);

  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      setClockTick((x) => x + 1);
      syncEngine();
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [hydrated, syncEngine]);

  const markReminderPaid = useCallback(
    async (id: string) => {
      if (cloudEnabled && cloudLoaded) {
        setCloudSyncing(true);
        try {
          const old = (cloudReminders ?? []).find((x) => x.id === id);
          const r = await fetch(`/api/scheduled-reminders/${id}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markPaid: true }),
          });
          const j = (await r.json()) as { ok?: boolean; reminder?: Reminder; error?: string };
          if (!r.ok || !j.ok || !j.reminder) {
            toast.error(j.error ?? "Could not update reminder.");
            return;
          }
          setCloudReminders((prev) => (prev ?? []).map((x) => (x.id === id ? j.reminder! : x)));
          const now = new Date();
          setStore((prev) => {
            const paidSnapshot = old ?? j.reminder!;
            const entry = makeHistoryEntry(paidSnapshot, now);
            return { ...prev, history: [entry, ...prev.history].slice(0, 400) };
          });
          toast.success("Marked paid", { description: "Updated in Supabase." });
        } finally {
          setCloudSyncing(false);
        }
        return;
      }

      const now = new Date();
      setStore((prev) => {
        const r = prev.reminders.find((x) => x.id === id);
        if (!r) return prev;
        const entry = makeHistoryEntry(r, now);

        if (r.repeatFrequency === "once") {
          return {
            ...prev,
            reminders: prev.reminders.filter((x) => x.id !== id),
            history: [entry, ...prev.history].slice(0, 400),
          };
        }

        const nextDue = rollForwardDueDateIfNeeded(nextDueAfterPaid(r.dueDate, r.repeatFrequency), r.repeatFrequency, now);
        const updated: Reminder = { ...r, dueDate: nextDue };
        return {
          ...prev,
          reminders: prev.reminders.map((x) => (x.id === id ? updated : x)),
          history: [entry, ...prev.history].slice(0, 400),
        };
      });
      toast.success("Marked paid", { description: "Moved to reminder history and updated the next due date." });
    },
    [setStore, cloudEnabled, cloudLoaded, cloudReminders],
  );

  const addReminder = useCallback(
    async (input: Omit<Reminder, "id" | "createdAt">) => {
      if (cloudEnabled) {
        setCloudSyncing(true);
        try {
          const r = await fetch("/api/scheduled-reminders", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: input.title,
              amountNpr: input.amountNpr,
              dueDate: input.dueDate,
              dueTime: input.dueTime,
              timezone: input.timezone,
              email: input.email,
              repeatFrequency: input.repeatFrequency,
              notify7DaysBefore: input.notify7DaysBefore,
              notify3DaysBefore: input.notify3DaysBefore,
              notify1DayBefore: input.notify1DayBefore,
              notifyAtDueTime: input.notifyAtDueTime,
              notifyOverdue: input.notifyOverdue,
              reminderType: input.reminderType,
              notes: input.notes,
              sharedWithFamily: input.sharedWithFamily,
            }),
          });
          const j = (await r.json()) as { ok?: boolean; reminder?: Reminder; error?: string };
          if (!r.ok || !j.ok || !j.reminder) {
            toast.error(j.error ?? "Could not save reminder.");
            return;
          }
          setCloudReminders((prev) => [j.reminder!, ...(prev ?? [])]);
          setCloudLoaded(true);
          const now = new Date();
          if (input.sharedWithFamily) {
            setStore((prev) => ({
              ...prev,
              notifications: [
                {
                  id: newId("fam"),
                  reminderId: j.reminder!.id,
                  kind: "family_shared",
                  title: "Shared with family",
                  body: `“${input.title}” is visible on the family reminder board.`,
                  createdAt: now.toISOString(),
                  read: false,
                },
                ...prev.notifications,
              ],
            }));
          }
          toast.success("Reminder saved", { description: "Stored in Supabase." });
        } finally {
          setCloudSyncing(false);
        }
        return;
      }

      const now = new Date();
      const r: Reminder = {
        ...input,
        id: newId("r"),
        createdAt: now.toISOString(),
      };
      setStore((prev) => {
        let notifications = prev.notifications;
        if (r.sharedWithFamily) {
          notifications = [
            {
              id: newId("fam"),
              reminderId: r.id,
              kind: "family_shared",
              title: "Shared with family",
              body: `“${r.title}” is visible on the family reminder board.`,
              createdAt: now.toISOString(),
              read: false,
            },
            ...notifications,
          ];
        }
        return { ...prev, reminders: [r, ...prev.reminders], notifications };
      });
    },
    [setStore, cloudEnabled],
  );

  const updateReminder = useCallback(
    (id: string, patch: Partial<Omit<Reminder, "id" | "createdAt">>) => {
      setStore((prev) => ({
        ...prev,
        reminders: prev.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }));

      if (cloudEnabled && cloudLoaded) {
        setCloudReminders((prev) => (prev ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
        void (async () => {
          try {
            const r = await fetch(`/api/scheduled-reminders/${id}`, {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(patch),
            });
            const j = (await r.json()) as { ok?: boolean; reminder?: Reminder; error?: string };
            if (!r.ok || !j.ok || !j.reminder) {
              toast.error(j.error ?? "Could not update reminder in cloud.");
              await refreshCloudReminders();
              return;
            }
            setCloudReminders((prev) => (prev ?? []).map((x) => (x.id === id ? j.reminder! : x)));
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not update reminder.");
            await refreshCloudReminders();
          }
        })();
      }
    },
    [setStore, cloudEnabled, cloudLoaded, refreshCloudReminders],
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      if (cloudEnabled && cloudLoaded) {
        setCloudSyncing(true);
        try {
          const r = await fetch(`/api/scheduled-reminders/${id}`, { method: "DELETE", credentials: "include" });
          const j = (await r.json()) as { ok?: boolean; error?: string };
          if (!r.ok || !j.ok) {
            toast.error(j.error ?? "Could not delete.");
            return;
          }
          setCloudReminders((prev) => (prev ?? []).filter((x) => x.id !== id));
          setStore((prev) => ({
            ...prev,
            notifications: prev.notifications.filter((n) => n.reminderId !== id),
          }));
          toast.success("Deleted");
        } finally {
          setCloudSyncing(false);
        }
        return;
      }
      setStore((prev) => ({
        ...prev,
        reminders: prev.reminders.filter((r) => r.id !== id),
        notifications: prev.notifications.filter((n) => n.reminderId !== id),
      }));
    },
    [setStore, cloudEnabled, cloudLoaded],
  );

  const dismissNotification = useCallback((id: string) => {
    setStore((prev) => ({ ...prev, notifications: prev.notifications.filter((n) => n.id !== id) }));
  }, [setStore]);

  const markNotificationRead = useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, [setStore]);

  const markAllNotificationsRead = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, [setStore]);

  const setEmailNotificationsEnabled = useCallback((enabled: boolean) => {
    setStore((prev) => ({ ...prev, settings: { ...prev.settings, emailNotificationsEnabled: enabled } }));
  }, [setStore]);

  const setUpcomingWithinDays = useCallback((days: number) => {
    setStore((prev) => ({
      ...prev,
      settings: { ...prev.settings, upcomingWithinDays: Math.min(60, Math.max(1, Math.round(days))) },
    }));
  }, [setStore]);

  const pushFamilyShareNotice = useCallback(
    (title: string) => {
      const now = new Date();
      setStore((prev) => ({
        ...prev,
        notifications: [
          {
            id: newId("fam"),
            reminderId: null,
            kind: "family_shared",
            title: "Family workspace",
            body: title,
            createdAt: now.toISOString(),
            read: false,
          },
          ...prev.notifications,
        ],
      }));
    },
    [setStore],
  );

  const unreadNotificationCount = useMemo(() => store.notifications.filter((n) => !n.read).length, [store.notifications]);

  const overdueCount = useMemo(() => {
    void clockTick;
    const now = new Date();
    return reminders.filter((r) => reminderPriority(r, now, store.settings.upcomingWithinDays) === "overdue").length;
  }, [clockTick, reminders, store.settings.upcomingWithinDays]);

  const upcomingSoonCount = useMemo(() => {
    void clockTick;
    const now = new Date();
    return reminders.filter((r) => reminderPriority(r, now, store.settings.upcomingWithinDays) === "upcoming").length;
  }, [clockTick, reminders, store.settings.upcomingWithinDays]);

  const value = useMemo<SmartRemindersContextValue>(
    () => ({
      hydrated: hydrated && (!cloudEnabled || cloudLoaded),
      store,
      setStore,
      reminders,
      remindersSource,
      cloudSyncing,
      refreshCloudReminders,
      unreadNotificationCount,
      overdueCount,
      upcomingSoonCount,
      markReminderPaid,
      addReminder,
      updateReminder,
      deleteReminder,
      dismissNotification,
      markNotificationRead,
      markAllNotificationsRead,
      setEmailNotificationsEnabled,
      setUpcomingWithinDays,
      pushFamilyShareNotice,
    }),
    [
      hydrated,
      cloudEnabled,
      cloudLoaded,
      store,
      setStore,
      reminders,
      remindersSource,
      cloudSyncing,
      refreshCloudReminders,
      unreadNotificationCount,
      overdueCount,
      upcomingSoonCount,
      markReminderPaid,
      addReminder,
      updateReminder,
      deleteReminder,
      dismissNotification,
      markNotificationRead,
      markAllNotificationsRead,
      setEmailNotificationsEnabled,
      setUpcomingWithinDays,
      pushFamilyShareNotice,
    ],
  );

  return <SmartRemindersContext.Provider value={value}>{children}</SmartRemindersContext.Provider>;
}

export function useSmartReminders(): SmartRemindersContextValue {
  const ctx = useContext(SmartRemindersContext);
  if (!ctx) throw new Error("useSmartReminders must be used within SmartRemindersProvider");
  return ctx;
}

export function useSmartRemindersOptional(): SmartRemindersContextValue | null {
  return useContext(SmartRemindersContext);
}

// Re-export helpers for UI
export { parseYmd, formatYmd } from "@/lib/smart-reminders/date-utils";
export { reminderPriority, isBillishReminderType, isEducationReminderType } from "@/lib/smart-reminders/reminder-engine";

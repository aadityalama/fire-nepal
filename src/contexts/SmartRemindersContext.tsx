"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocalStorageJsonState } from "@/hooks/useLocalStorageJsonState";
import { createDefaultSmartRemindersStore } from "@/lib/smart-reminders/default-state";
import {
  buildDedupeKey,
  draftNotificationsForDay,
  makeHistoryEntry,
  nextDueAfterPaid,
  reminderPriority,
  rollForwardDueDateIfNeeded,
} from "@/lib/smart-reminders/reminder-engine";
import { sanitizeSmartRemindersStore } from "@/lib/smart-reminders/sanitize";
import type { InAppNotification, Reminder, SmartRemindersStore } from "@/lib/smart-reminders/types";
import { formatYmd, startOfLocalDay } from "@/lib/smart-reminders/date-utils";

const STORAGE_KEY = "fire_nepal_smart_reminders_v1";

type SmartRemindersContextValue = {
  hydrated: boolean;
  store: SmartRemindersStore;
  setStore: React.Dispatch<React.SetStateAction<SmartRemindersStore>>;
  reminders: Reminder[];
  unreadNotificationCount: number;
  overdueCount: number;
  upcomingSoonCount: number;
  markReminderPaid: (id: string) => void;
  addReminder: (input: Omit<Reminder, "id" | "createdAt">) => void;
  updateReminder: (id: string, patch: Partial<Omit<Reminder, "id" | "createdAt">>) => void;
  deleteReminder: (id: string) => void;
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

export function SmartRemindersProvider({ children }: { children: ReactNode }) {
  const [store, setStore, hydrated] = useLocalStorageJsonState<SmartRemindersStore>({
    storageKey: STORAGE_KEY,
    getDefault: () => createDefaultSmartRemindersStore(),
    sanitize: sanitizeSmartRemindersStore,
  });

  const [clockTick, setClockTick] = useState(0);

  const syncEngine = useCallback(() => {
    const now = new Date();
    setStore((prev) => {
      const existingKeys = dedupeSetFromNotifications(prev.notifications);
      const drafts = draftNotificationsForDay({
        reminders: prev.reminders,
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

      // Demo email channel: toast + in-app "email_sent" row (one per reminder per local day)
      if (prev.settings.emailNotificationsEnabled) {
        const extra: InAppNotification[] = [];
        const todayYmd = formatYmd(startOfLocalDay(now));
        for (const d of drafts) {
          const r = prev.reminders.find((x) => x.id === d.reminderId);
          if (!r?.emailNotify) continue;

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
            body: `Demo send for “${r.title}”. Connect SMTP later for real delivery.`,
            createdAt: now.toISOString(),
            read: false,
          });
        }
        if (extra.length) next = { ...next, notifications: [...extra, ...next.notifications] };
      }

      return next;
    });
  }, [setStore]);

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
    (id: string) => {
      const now = new Date();
      setStore((prev) => {
        const r = prev.reminders.find((x) => x.id === id);
        if (!r) return prev;
        const entry = makeHistoryEntry(r, now);

        if (r.recurrence === "once") {
          return {
            ...prev,
            reminders: prev.reminders.filter((x) => x.id !== id),
            history: [entry, ...prev.history].slice(0, 400),
          };
        }

        const nextDue = rollForwardDueDateIfNeeded(nextDueAfterPaid(r.dueDate, r.recurrence), r.recurrence, now);
        const updated: Reminder = { ...r, dueDate: nextDue };
        return {
          ...prev,
          reminders: prev.reminders.map((x) => (x.id === id ? updated : x)),
          history: [entry, ...prev.history].slice(0, 400),
        };
      });
      toast.success("Marked paid", { description: "Moved to reminder history and updated the next due date." });
    },
    [setStore],
  );

  const addReminder = useCallback(
    (input: Omit<Reminder, "id" | "createdAt">) => {
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
    [setStore],
  );

  const updateReminder = useCallback((id: string, patch: Partial<Omit<Reminder, "id" | "createdAt">>) => {
    setStore((prev) => ({
      ...prev,
      reminders: prev.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, [setStore]);

  const deleteReminder = useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
      notifications: prev.notifications.filter((n) => n.reminderId !== id),
    }));
  }, [setStore]);

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
    return store.reminders.filter((r) => reminderPriority(r, now, store.settings.upcomingWithinDays) === "overdue").length;
  }, [clockTick, store.reminders, store.settings.upcomingWithinDays]);

  const upcomingSoonCount = useMemo(() => {
    void clockTick;
    const now = new Date();
    return store.reminders.filter((r) => reminderPriority(r, now, store.settings.upcomingWithinDays) === "upcoming").length;
  }, [clockTick, store.reminders, store.settings.upcomingWithinDays]);

  const value = useMemo<SmartRemindersContextValue>(
    () => ({
      hydrated,
      store,
      setStore,
      reminders: store.reminders,
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
      store,
      setStore,
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

import { fetchJson } from "@/lib/api/fetch-json";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { getDividendHistoryBySymbol } from "@/services/market/nepse-fundamentals-provider";
import type { CalendarEventType, MarketCalendarEvent } from "@/types/market/nepse-professional-terminal";

const IPO_URL = "https://shubhamnpk.github.io/yonepse/data/upcoming_ipo.json";

function parseLooseDate(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const iso = raw.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function pushEvent(events: MarketCalendarEvent[], event: MarketCalendarEvent) {
  events.push(event);
}

/** Market calendar from real dividend/IPO/action/filing dates — never invented. */
export async function loadMarketCalendar(limit = 120): Promise<{ events: MarketCalendarEvent[]; loadedAt: string }> {
  const events: MarketCalendarEvent[] = [];
  const sb = createMarketDataServiceClient();

  const [dividendsBySymbol, ipoRes, actionsRes, filingsRes] = await Promise.all([
    getDividendHistoryBySymbol().catch(() => new Map()),
    fetchJson<Record<string, unknown>[]>(IPO_URL, { timeoutMs: 12_000, retries: 0 }).catch(() => []),
    sb
      ? sb
          .from("nepse_company_actions")
          .select("id, symbol, action_type, title, action_date, details, source")
          .order("action_date", { ascending: false, nullsFirst: false })
          .limit(80)
      : Promise.resolve({ data: null }),
    sb
      ? sb
          .from("nepse_company_valuation")
          .select("symbol, as_of_date, source")
          .not("as_of_date", "is", null)
          .order("as_of_date", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: null }),
  ]);

  for (const [symbol, rows] of dividendsBySymbol) {
    for (const row of rows.slice(0, 3)) {
      if (row.bookCloseDate) {
        pushEvent(events, {
          id: `bc-${symbol}-${row.fiscalYear}`,
          type: "book_closure",
          title: `${symbol} book closure`,
          symbol,
          date: parseLooseDate(row.bookCloseDate),
          detail: `FY ${row.fiscalYear}${row.cashPct != null ? ` · cash ${row.cashPct}%` : ""}${row.bonusPct != null ? ` · bonus ${row.bonusPct}%` : ""}`,
          source: "NEPSE dividend announcements",
        });
      }
      if (row.announcementDate) {
        const type: CalendarEventType = (row.bonusPct ?? 0) > 0 && !(row.cashPct && row.cashPct > 0) ? "bonus" : "dividend";
        pushEvent(events, {
          id: `div-${symbol}-${row.fiscalYear}`,
          type,
          title: `${symbol} ${type === "bonus" ? "bonus" : "dividend"} announcement`,
          symbol,
          date: parseLooseDate(row.announcementDate),
          detail: `FY ${row.fiscalYear} · cash ${row.cashPct ?? "—"}% · bonus ${row.bonusPct ?? "—"}%`,
          source: "NEPSE dividend announcements",
        });
      }
    }
  }

  for (const row of Array.isArray(ipoRes) ? ipoRes : []) {
    const company = typeof row.company === "string" ? row.company : "Upcoming IPO";
    const announce = typeof row.announcement_date === "string" ? row.announcement_date : "";
    pushEvent(events, {
      id: `ipo-${company}-${announce}`.toLowerCase().replace(/\s+/g, "-").slice(0, 120),
      type: "ipo",
      title: `${company} IPO`,
      symbol: null,
      date: parseLooseDate(announce || null),
      detail: typeof row.full_text === "string" ? row.full_text.slice(0, 220) : typeof row.date_range === "string" ? row.date_range : null,
      source: "Yonepse upcoming IPO",
    });
  }

  for (const row of ((actionsRes as { data: Record<string, unknown>[] | null }).data ?? [])) {
    const actionType = typeof row.action_type === "string" ? row.action_type : "";
    const mapped: CalendarEventType | null =
      actionType === "agm"
        ? "agm"
        : actionType === "book_close"
          ? "book_closure"
          : actionType === "dividend"
            ? "dividend"
            : actionType === "bonus"
              ? "bonus"
              : actionType === "rights"
                ? "rights"
                : actionType === "ipo"
                  ? "ipo"
                  : actionType === "fpo"
                    ? "fpo"
                    : null;
    if (!mapped) continue;
    pushEvent(events, {
      id: `action-${row.id}`,
      type: mapped,
      title: typeof row.title === "string" ? row.title : `${row.symbol} ${mapped}`,
      symbol: typeof row.symbol === "string" ? row.symbol : null,
      date: parseLooseDate(typeof row.action_date === "string" ? row.action_date : null),
      detail: typeof row.details === "string" ? row.details : null,
      source: typeof row.source === "string" ? row.source : "nepse_company_actions",
    });
  }

  for (const row of ((filingsRes as { data: Record<string, unknown>[] | null }).data ?? [])) {
    pushEvent(events, {
      id: `filing-${row.symbol}-${row.as_of_date}`,
      type: "financial_report",
      title: `${row.symbol} financial report`,
      symbol: typeof row.symbol === "string" ? String(row.symbol) : null,
      date: parseLooseDate(typeof row.as_of_date === "string" ? row.as_of_date : null),
      detail: typeof row.source === "string" ? row.source : "Published filing date",
      source: "Company filings",
    });
  }

  // Auction + trading holidays: no configured free JSON feed is wired — omit rather than invent.
  // UI surfaces these types as "Data unavailable" when the filter is selected and no rows exist.

  events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  return { events: events.slice(0, limit), loadedAt: new Date().toISOString() };
}

#!/usr/bin/env node
/**
 * Hamro Patro–backed Nepali festival regression tests.
 * Run: npx tsx --test scripts/smart-nepal-festival-dates.test.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  buildHamroPatroDateUrl,
  clearDayInfoCache,
  formatBsDateCompact,
  getSmartNepalInfoBarCopy,
  HAMRO_PATRO_WIDGETS_PAGE,
  parseHamroPatroEventJsonLd,
  parseHamroPatroTitleLabels,
  resolveBarStatus,
  resolveSmartNepalDayInfo,
  resolveSmartNepalDayInfoBase,
} from "../src/lib/smart-nepal-info/index.ts";
import {
  buildFestivalLabelFromHamroPatroPages,
  fetchHamroPatroDayFestival,
} from "../src/lib/smart-nepal-info/hamro-patro/client.ts";
import { AD_CALENDAR_EVENTS } from "../src/lib/smart-nepal-info/holidays-data.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(__dirname, "fixtures/hamro-patro", name), "utf8");

/** Nepal-local noon for a civil AD date (avoids UTC day-boundary skew). */
function nepalNoon(adYmd) {
  return new Date(`${adYmd}T12:00:00+05:45`);
}

function fixtureFetch(map) {
  return async (url) => {
    const body = map[url];
    if (body == null) {
      return new Response("not found", { status: 404 });
    }
    return new Response(body, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };
}

function syntheticEventHtml({ en, np, startDate }) {
  const title = `${en} | ${np} | Test Day — Hamro Patro`;
  const event = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Event",
    name: en,
    startDate,
    endDate: startDate,
  });
  return `<title>${title}</title><script type="application/ld+json">${event}</script>`;
}

describe("Hamro Patro permitted integration surface", () => {
  it("documents official widgets page and stable public date URLs across years", () => {
    assert.equal(HAMRO_PATRO_WIDGETS_PAGE, "https://www.hamropatro.com/widgets/");
    assert.equal(buildHamroPatroDateUrl(2083, 5, 1, "en"), "https://www.hamropatro.com/en/date/2083-5-1");
    assert.equal(buildHamroPatroDateUrl(2083, 6, 25, "np"), "https://www.hamropatro.com/date/2083-6-25");
    assert.equal(buildHamroPatroDateUrl(2082, 1, 1, "en"), "https://www.hamropatro.com/en/date/2082-1-1");
    assert.equal(buildHamroPatroDateUrl(2084, 12, 30, "np"), "https://www.hamropatro.com/date/2084-12-30");
  });

  it("parses schema.org Event JSON-LD from Hamro Patro public date HTML", () => {
    const events = parseHamroPatroEventJsonLd(fixture("2083-5-1-en.html"));
    assert.equal(events.length, 1);
    assert.match(events[0].name, /Nag Panchami/i);
    assert.equal(events[0].startDate, "2026-08-17");

    const labels = parseHamroPatroTitleLabels(fixture("2083-5-1-en.html"));
    assert.match(labels?.en ?? "", /Nag Panchami/i);
    assert.match(labels?.np ?? "", /नाग पञ्चमी/);
  });
});

describe("Nepali festival dates via Hamro Patro (2083 BS)", () => {
  it("2026-08-17 → Bhadra 1, 2083 → Nag Panchami (not Ghatasthapana)", async () => {
    clearDayInfoCache();
    const enUrl = buildHamroPatroDateUrl(2083, 5, 1, "en");
    const npUrl = buildHamroPatroDateUrl(2083, 5, 1, "np");
    const info = await resolveSmartNepalDayInfo(nepalNoon("2026-08-17"), {
      fetchImpl: fixtureFetch({
        [enUrl]: fixture("2083-5-1-en.html"),
        [npUrl]: fixture("2083-5-1-np.html"),
      }),
    });

    assert.equal(info.dateKey, "2026-08-17");
    assert.equal(info.bsDate.year, 2083);
    assert.equal(info.bsDate.month, 5);
    assert.equal(info.bsDate.day, 1);
    assert.equal(info.festivalSource, "hamro-patro");
    assert.ok(info.festival, "expected a festival on Bhadra 1, 2083");
    assert.match(info.festival.en, /Nag Panchami/i);
    assert.match(info.festival.np, /नाग पञ्चमी/);
    assert.doesNotMatch(info.festival.en, /Ghatasthapana|Ghatasthaapana/i);

    const bar = resolveBarStatus(info, { noFestivalToday: "None", publicHolidayStatus: "Holiday" }, "en");
    assert.match(bar.text, /Nag Panchami/i);
    assert.equal(bar.kind, "festival");

    const compact = formatBsDateCompact(info, "en");
    assert.match(compact, /2083/);
    assert.match(compact, /Bhadra|Bhadau/i);
  });

  it("2026-10-11 → Ashoj 25, 2083 → Ghatasthapana", async () => {
    clearDayInfoCache();
    const enUrl = buildHamroPatroDateUrl(2083, 6, 25, "en");
    const npUrl = buildHamroPatroDateUrl(2083, 6, 25, "np");
    const info = await resolveSmartNepalDayInfo(nepalNoon("2026-10-11"), {
      fetchImpl: fixtureFetch({
        [enUrl]: fixture("2083-6-25-en.html"),
        [npUrl]: fixture("2083-6-25-np.html"),
      }),
    });

    assert.equal(info.dateKey, "2026-10-11");
    assert.equal(info.bsDate.year, 2083);
    assert.equal(info.bsDate.month, 6);
    assert.equal(info.bsDate.day, 25);
    assert.equal(info.festivalSource, "hamro-patro");
    assert.ok(info.festival, "expected Ghatasthapana on Ashoj 25, 2083");
    assert.match(info.festival.en, /Ghatasthapana|Ghatasthaapana/i);
    assert.match(info.festival.np, /घटस्थापना/);
    assert.doesNotMatch(info.festival.en, /Nag Panchami/i);

    const bar = resolveBarStatus(info, { noFestivalToday: "None", publicHolidayStatus: "Holiday" }, "en");
    assert.match(bar.text, /Ghatasthapana|Ghatasthaapana/i);
    assert.equal(bar.kind, "festival");

    const compact = formatBsDateCompact(info, "en");
    assert.match(compact, /2083/);
    assert.match(compact, /Ashoj|Ashwin|Aswin|Asoj/i);
  });

  it("does not hardcode Ghatasthapana onto Bhadra 1 (or any BS month/day table)", () => {
    const base = resolveSmartNepalDayInfoBase(nepalNoon("2026-08-17"));
    assert.equal(base.bsDate.month, 5);
    assert.equal(base.bsDate.day, 1);
    assert.equal(base.festivalSource, null);
    assert.equal(base.festival, null);

    // Local AD observances must not invent Dashain on Aug 17.
    const augustObservances = AD_CALENDAR_EVENTS.filter((e) => e.month === 8 && e.day === 17);
    assert.equal(augustObservances.length, 0);

    const fromFixture = buildFestivalLabelFromHamroPatroPages({
      enHtml: fixture("2083-5-1-en.html"),
      npHtml: fixture("2083-5-1-np.html"),
    });
    assert.ok(fromFixture);
    assert.doesNotMatch(fromFixture.festival.en, /Ghatasthapana|Ghatasthaapana/i);
    assert.match(fromFixture.festival.en, /Nag Panchami/i);
  });

  it("schema.org startDate stays aligned with the Nepal-local AD date under test", () => {
    const nag = buildFestivalLabelFromHamroPatroPages({
      enHtml: fixture("2083-5-1-en.html"),
      npHtml: fixture("2083-5-1-np.html"),
    });
    const ghat = buildFestivalLabelFromHamroPatroPages({
      enHtml: fixture("2083-6-25-en.html"),
      npHtml: fixture("2083-6-25-np.html"),
    });
    assert.equal(nag?.startDate, "2026-08-17");
    assert.equal(ghat?.startDate, "2026-10-11");
  });
});

describe("Hamro Patro multi-date / multi-year resolution", () => {
  it("resolves distinct festivals for different BS years via date URLs", async () => {
    clearDayInfoCache();
    const cases = [
      {
        ad: "2025-04-14",
        bsYear: 2082,
        bsMonth: 1,
        bsDay: 1,
        en: "Nepali New Year",
        np: "नेपाली नयाँ वर्ष",
      },
      {
        ad: "2026-08-17",
        bsYear: 2083,
        bsMonth: 5,
        bsDay: 1,
        en: "Nag Panchami Vrata",
        np: "नाग पञ्चमी व्रत",
      },
      {
        ad: "2027-01-15",
        bsYear: 2083,
        bsMonth: 10,
        bsDay: 1,
        en: "Maghe Sankranti",
        np: "माघे सङ्क्रान्ति",
      },
    ];

    for (const sample of cases) {
      const base = resolveSmartNepalDayInfoBase(nepalNoon(sample.ad));
      assert.equal(base.bsDate.year, sample.bsYear);
      assert.equal(base.bsDate.month, sample.bsMonth);
      assert.equal(base.bsDate.day, sample.bsDay);

      const enUrl = buildHamroPatroDateUrl(sample.bsYear, sample.bsMonth, sample.bsDay, "en");
      const npUrl = buildHamroPatroDateUrl(sample.bsYear, sample.bsMonth, sample.bsDay, "np");
      const html = syntheticEventHtml({
        en: sample.en,
        np: sample.np,
        startDate: sample.ad,
      });

      const info = await resolveSmartNepalDayInfo(nepalNoon(sample.ad), {
        fetchImpl: fixtureFetch({ [enUrl]: html, [npUrl]: html }),
      });
      assert.equal(info.festivalSource, "hamro-patro");
      assert.equal(info.festival?.en, sample.en);
      assert.equal(info.festival?.np, sample.np);
    }
  });
});

describe("Hamro Patro network failure / neutral fallback", () => {
  it("returns safe empty festival when Hamro Patro fetch throws", async () => {
    clearDayInfoCache();
    const info = await resolveSmartNepalDayInfo(nepalNoon("2026-08-17"), {
      fetchImpl: async () => {
        throw new Error("network down");
      },
    });

    assert.equal(info.dateKey, "2026-08-17");
    assert.equal(info.bsDate.year, 2083);
    assert.equal(info.bsDate.month, 5);
    assert.equal(info.bsDate.day, 1);
    assert.equal(info.festival, null);
    assert.equal(info.festivalSource, null);
    assert.equal(info.festivalSourceUrl, null);

    const copy = getSmartNepalInfoBarCopy("en");
    const bar = resolveBarStatus(info, copy, "en");
    assert.equal(bar.kind, "regular");
    assert.equal(bar.text, "Regular Day");
    assert.doesNotMatch(bar.text, /Ghatasthapana|Nag Panchami/i);
  });

  it("returns null from fetchHamroPatroDayFestival on 404 / empty body", async () => {
    const result = await fetchHamroPatroDayFestival(2083, 5, 1, async () => new Response("", { status: 404 }));
    assert.equal(result, null);
  });

  it("returns null on malformed HTML without inventing festivals", async () => {
    const result = await fetchHamroPatroDayFestival(
      2083,
      5,
      1,
      async () =>
        new Response("<html><title>Broken</title><script type='application/ld+json'>{not-json}</script></html>", {
          status: 200,
        }),
    );
    assert.equal(result, null);
  });

  it("treats ordinary days without Event JSON-LD as neutral (no festival)", async () => {
    clearDayInfoCache();
    const enUrl = buildHamroPatroDateUrl(2083, 5, 2, "en");
    const npUrl = buildHamroPatroDateUrl(2083, 5, 2, "np");
    const ordinary = `<title>2083 Bhadra 2 | २०८३ भदौ २ — Aaja Kati Gate? | Hamro Patro</title>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[]}</script>`;

    const info = await resolveSmartNepalDayInfo(nepalNoon("2026-08-18"), {
      fetchImpl: fixtureFetch({ [enUrl]: ordinary, [npUrl]: ordinary }),
    });
    assert.equal(info.bsDate.month, 5);
    assert.equal(info.bsDate.day, 2);
    assert.equal(info.festival, null);
    assert.equal(info.festivalSource, null);

    const copy = getSmartNepalInfoBarCopy("en");
    const bar = resolveBarStatus(info, copy, "en");
    assert.equal(bar.kind, "regular");
    assert.equal(bar.text, copy.noFestivalToday);
  });

  it("survives AbortError / timeout-style failures without throwing", async () => {
    clearDayInfoCache();
    const info = await resolveSmartNepalDayInfo(nepalNoon("2026-10-11"), {
      fetchImpl: async (_url, init) => {
        if (init?.signal?.aborted) {
          throw new DOMException("The operation was aborted.", "AbortError");
        }
        // Simulate abort mid-flight.
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      },
      hamroPatroTimeoutMs: 250,
    });

    assert.equal(info.dateKey, "2026-10-11");
    assert.equal(info.bsDate.year, 2083);
    assert.equal(info.bsDate.month, 6);
    assert.equal(info.bsDate.day, 25);
    assert.equal(info.festival, null);
    assert.equal(info.festivalSource, null);
  });

  it("keeps BS date formatting available when Hamro Patro is skipped", async () => {
    clearDayInfoCache();
    const info = await resolveSmartNepalDayInfo(nepalNoon("2026-08-17"), { skipHamroPatro: true });
    assert.equal(info.festival, null);
    assert.match(formatBsDateCompact(info, "en"), /2083/);
    assert.match(formatBsDateCompact(info, "en"), /Bhadra|Bhadau/i);
  });
});

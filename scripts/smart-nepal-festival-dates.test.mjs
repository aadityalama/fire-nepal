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
  HAMRO_PATRO_WIDGETS_PAGE,
  parseHamroPatroEventJsonLd,
  parseHamroPatroTitleLabels,
  resolveBarStatus,
  resolveSmartNepalDayInfo,
  resolveSmartNepalDayInfoBase,
} from "../src/lib/smart-nepal-info/index.ts";
import { buildFestivalLabelFromHamroPatroPages } from "../src/lib/smart-nepal-info/hamro-patro/client.ts";
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

describe("Hamro Patro permitted integration surface", () => {
  it("documents official widgets page and stable public date URLs", () => {
    assert.equal(HAMRO_PATRO_WIDGETS_PAGE, "https://www.hamropatro.com/widgets/");
    assert.equal(buildHamroPatroDateUrl(2083, 5, 1, "en"), "https://www.hamropatro.com/en/date/2083-5-1");
    assert.equal(buildHamroPatroDateUrl(2083, 6, 25, "np"), "https://www.hamropatro.com/date/2083-6-25");
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

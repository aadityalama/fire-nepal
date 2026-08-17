#!/usr/bin/env node
/**
 * Smart Nepal Info — Nepali festival / BS date regression tests.
 * Run: npx tsx --test scripts/smart-nepal-festival-dates.test.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clearDayInfoCache,
  formatBsDateCompact,
  getSmartNepalDayInfo,
  resolveBarStatus,
  resolveSmartNepalDayInfo,
} from "../src/lib/smart-nepal-info/index.ts";
import { lookupBsEvent } from "../src/lib/smart-nepal-info/holidays-data.ts";

/** Nepal-local noon for a civil AD date (avoids UTC day-boundary skew). */
function nepalNoon(adYmd) {
  return new Date(`${adYmd}T12:00:00+05:45`);
}

describe("Nepali festival date mapping (2083 BS)", () => {
  it("2026-08-17 → Bhadra 1, 2083 → Nag Panchami (not Ghatasthapana)", () => {
    clearDayInfoCache();
    const info = resolveSmartNepalDayInfo(nepalNoon("2026-08-17"));

    assert.equal(info.dateKey, "2026-08-17");
    assert.equal(info.bsDate.year, 2083);
    assert.equal(info.bsDate.month, 5);
    assert.equal(info.bsDate.day, 1);
    assert.ok(info.festival, "expected a festival on Bhadra 1, 2083");
    assert.match(info.festival.en, /Nag Panchami/i);
    assert.match(info.festival.np, /नाग पञ्चमी/);
    assert.doesNotMatch(info.festival.en, /Ghatasthapana/i);

    const bar = resolveBarStatus(info, { noFestivalToday: "None", publicHolidayStatus: "Holiday" }, "en");
    assert.match(bar.text, /Nag Panchami/i);
    assert.equal(bar.kind, "festival");

    const compact = formatBsDateCompact(info, "en");
    assert.match(compact, /2083/);
    assert.match(compact, /Bhadra|Bhadau/i);
  });

  it("2026-10-11 → Ashoj 25, 2083 → Ghatasthapana", () => {
    clearDayInfoCache();
    const info = resolveSmartNepalDayInfo(nepalNoon("2026-10-11"));

    assert.equal(info.dateKey, "2026-10-11");
    assert.equal(info.bsDate.year, 2083);
    assert.equal(info.bsDate.month, 6);
    assert.equal(info.bsDate.day, 25);
    assert.ok(info.festival, "expected Ghatasthapana on Ashoj 25, 2083");
    assert.match(info.festival.en, /Ghatasthapana/i);
    assert.match(info.festival.np, /घटस्थापना/);
    assert.doesNotMatch(info.festival.en, /Nag Panchami/i);

    const bar = resolveBarStatus(info, { noFestivalToday: "None", publicHolidayStatus: "Holiday" }, "en");
    assert.match(bar.text, /Ghatasthapana/i);
    assert.equal(bar.kind, "festival");

    const compact = formatBsDateCompact(info, "en");
    assert.match(compact, /2083/);
    assert.match(compact, /Ashoj|Ashwin|Aswin|Asoj/i);
  });

  it("does not map Ghatasthapana onto Bhadra 1 in the BS festival table", () => {
    const bhadra1 = lookupBsEvent(5, 1);
    assert.ok(bhadra1);
    assert.match(bhadra1.festival.en, /Nag Panchami/i);
    assert.doesNotMatch(bhadra1.festival.en, /Ghatasthapana/i);

    const ashoj25 = lookupBsEvent(6, 25);
    assert.ok(ashoj25);
    assert.match(ashoj25.festival.en, /Ghatasthapana/i);
  });

  it("uses Nepal local date for today resolution (cached path)", () => {
    clearDayInfoCache();
    const a = getSmartNepalDayInfo(nepalNoon("2026-08-17"));
    const b = getSmartNepalDayInfo(nepalNoon("2026-08-17"));
    assert.equal(a.festival?.en, b.festival?.en);
    assert.match(a.festival?.en ?? "", /Nag Panchami/i);

    clearDayInfoCache();
    const c = getSmartNepalDayInfo(nepalNoon("2026-10-11"));
    assert.match(c.festival?.en ?? "", /Ghatasthapana/i);
  });
});

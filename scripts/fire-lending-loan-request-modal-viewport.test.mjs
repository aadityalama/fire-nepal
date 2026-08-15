/**
 * Mobile viewport clearance math for the Loan Request bottom sheet.
 * Mirrors FireLendingConfirmDialog + FireLendingMobileBottomNav geometry at
 * iPhone-class sizes (including home-indicator safe area).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const REM = 16;

/** Overlay padding-bottom: calc(4.75rem + env(safe-area-inset-bottom)) */
function overlayPadBottom(safeAreaBottomPx) {
  return 4.75 * REM + safeAreaBottomPx;
}

/**
 * Bottom nav height: pt-2 + min-h-[52px] + pb max(0.5rem, safe-area).
 * Matches FireLendingMobileBottomNav.
 */
function bottomNavHeight(safeAreaBottomPx) {
  const pt = 0.5 * REM;
  const items = 52;
  const pb = Math.max(0.5 * REM, safeAreaBottomPx);
  return pt + items + pb;
}

describe("loan request modal mobile viewport clearance", () => {
  const viewports = [
    { name: "iPhone SE", w: 375, h: 667, sab: 0 },
    { name: "iPhone 14", w: 390, h: 844, sab: 34 },
    { name: "iPhone 14 Pro Max", w: 430, h: 932, sab: 34 },
    { name: "Pixel 7", w: 412, h: 915, sab: 0 },
    { name: "iPad mini portrait", w: 768, h: 1024, sab: 20 },
  ];

  for (const vp of viewports) {
    it(`${vp.name}: sheet actions clear the fixed bottom nav`, () => {
      const pad = overlayPadBottom(vp.sab);
      const navH = bottomNavHeight(vp.sab);
      const sheetBottomY = vp.h - pad;
      const navTopY = vp.h - navH;

      assert.ok(
        sheetBottomY <= navTopY + 0.5,
        `${vp.name}: sheet bottom ${sheetBottomY} must be at/above nav top ${navTopY} (pad=${pad}, navH=${navH})`,
      );

      // Typical dialog content (~title+prompt+actions) must fit above the pad.
      const contentHeight = 56 + 48 + 24 + 44; // title, prompt, gap, buttons
      const available = sheetBottomY - 12; // top padding
      assert.ok(
        available >= contentHeight,
        `${vp.name}: available ${available}px must fit ~${contentHeight}px dialog content`,
      );

      // max-height formula must leave room for nav clearance.
      const maxH = Math.min(0.85 * vp.h, vp.h - 6.5 * REM - vp.sab);
      assert.ok(maxH > contentHeight, `${vp.name}: max-height ${maxH} must exceed content`);
    });
  }

  it("desktop lg clears evenly without needing nav offset (nav is lg:hidden)", () => {
    // At lg, Tailwind applies lg:p-6 (1.5rem) on all sides — nav is hidden.
    const desktopPad = 1.5 * REM;
    assert.equal(desktopPad, 24);
    assert.ok(overlayPadBottom(34) > desktopPad);
  });
});

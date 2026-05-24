


import type { FireResolvedTheme } from "@/contexts/FireThemeContext";
import { premiumTooltip, wealthChartFonts } from "@/components/portfolio/wealth-premium-charts";

/** Chart.js + canvas colors that track FIRE dashboard light/dark mode */
export function getWealthChartUi(theme: FireResolvedTheme) {
  const light = theme === "light";
  return {
    light,
    tick: light ? "#475569" : "#d1fae5",
    tickMuted: light ? "#64748b" : "rgba(167, 243, 208, 0.72)",
    legend: light ? "#0f172a" : "#f4f4f5",
    gridPrimary: light ? "rgba(15, 23, 42, 0.07)" : "rgba(52, 211, 153, 0.06)",
    gridStrong: light ? "rgba(15, 23, 42, 0.1)" : "rgba(52, 211, 153, 0.1)",
    violetTick: light ? "#6d28d9" : "#c4b5fd",
    violetGrid: light ? "rgba(109, 40, 217, 0.12)" : "rgba(139, 92, 246, 0.08)",
    tealTick: light ? "#0f766e" : "#99f6e4",
    tealGrid: light ? "rgba(15, 118, 110, 0.12)" : "rgba(45, 212, 191, 0.08)",
    dualAxisTitleLeft: light ? "rgba(71, 85, 105, 0.95)" : "rgba(167,243,208,0.55)",
    dualAxisTitleRight: light ? "rgba(91, 33, 182, 0.85)" : "rgba(196,181,253,0.65)",
    legendStroke: light ? "rgba(15, 23, 42, 0.12)" : "rgba(255,255,255,0.14)",
    fireDonutTrack: light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255,0.06)",
    fireDonutBorder: light ? "rgba(15, 23, 42, 0.12)" : "rgba(255,255,255,0.08)",
    pieBorder: light ? "rgba(15, 23, 42, 0.14)" : "rgba(6, 78, 59, 0.5)",
    neonUnderlay: light ? "rgba(5, 150, 105, 0.2)" : "rgba(52, 211, 153, 0.28)",
    ringTrack: light ? "rgba(15, 23, 42, 0.1)" : "rgba(255,255,255,0.07)",
    barTrack: light ? "rgba(15, 23, 42, 0.06)" : "rgba(0,0,0,0.35)",
    segment: light ? "rgba(226, 232, 240, 0.95)" : "rgba(226, 232, 240, 0.25)",
    pointFill: light ? "#ffffff" : "rgba(250, 250, 250, 0.98)",
    pointStroke: light ? "#047857" : "rgba(16, 185, 129, 0.95)",
    neonLineUnderlay: light ? "rgba(5, 150, 105, 0.22)" : "rgba(52, 211, 153, 0.32)",
    pieHoverBorder: light ? "rgba(15, 23, 42, 0.4)" : "rgba(250, 250, 250, 0.85)",
  };
}

export function wealthChartFontsForTheme(theme: FireResolvedTheme) {
  const ui = getWealthChartUi(theme);
  const { tick, tickSm, legend, legendSm, tooltipTitle, tooltipBody } = wealthChartFonts;
  return {
    tick: { ...tick, color: ui.tick },
    tickSm: { ...tickSm, color: ui.tick },
    legend: { ...legend, color: ui.legend },
    legendSm: { ...legendSm, color: ui.legend },
    tooltipTitle: { ...tooltipTitle, color: lightTitle(theme) },
    tooltipBody: { ...tooltipBody, color: lightBody(theme) },
  };
}

function lightTitle(theme: FireResolvedTheme) {
  return theme === "light" ? "#0f172a" : wealthChartFonts.tooltipTitle.color;
}

function lightBody(theme: FireResolvedTheme) {
  return theme === "light" ? "#334155" : wealthChartFonts.tooltipBody.color;
}

export function premiumTooltipForTheme(theme: FireResolvedTheme) {
  if (theme === "dark") return { ...premiumTooltip };
  return {
    ...premiumTooltip,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    titleColor: "#0f172a",
    bodyColor: "#334155",
    borderColor: "rgba(16, 185, 129, 0.38)",
    titleFont: { ...wealthChartFonts.tooltipTitle, color: "#0f172a" },
    bodyFont: { ...wealthChartFonts.tooltipBody, color: "#334155" },
  };
}

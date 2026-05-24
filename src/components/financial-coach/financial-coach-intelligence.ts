import type {
  BehavioralAnalytics,
  CoachInsight,
  CoachNotification,
  CoachRecommendation,
  FinancialCoachModel,
  FinancialCoachSnapshot,
} from "@/components/financial-coach/types";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

function sortNotifs(a: CoachNotification, b: CoachNotification): number {
  return b.priority - a.priority;
}

function insightSeverityOrder(s: CoachInsight["severity"]): number {
  if (s === "critical") return 0;
  if (s === "warning") return 1;
  if (s === "success") return 2;
  return 3;
}

/**
 * Deterministic AI Financial Coach — rules only, no network calls.
 */
export function buildFinancialCoachModel(snapshot: FinancialCoachSnapshot): FinancialCoachModel {
  const notifications: CoachNotification[] = [];
  const insights: CoachInsight[] = [];
  const recommendations: CoachRecommendation[] = [];

  if (!snapshot.hydrated) {
    return {
      insights: [
        {
          id: "boot",
          title: "Coach is lining up signals",
          body: "Once your dashboard hydrates, we will align savings, runway, and desk FIRE reads to your data.",
          severity: "info",
          category: "behavior",
          badge: "Standby",
        },
      ],
      notifications: [{ id: "n-boot", label: "Coach standby", tone: "neutral", priority: 0 }],
      recommendations: [],
      behavioral: {
        savingsDisciplineScore: 0,
        investmentDisciplineScore: 0,
        portfolioMomentumVs12m: "unknown",
        diningPressure: "unknown",
        habitSummary: "Open this panel after your balances load for behavioral analytics.",
      },
    };
  }

  const sr = snapshot.savingsRatePct;
  const burn = snapshot.monthlyBurnNpr;
  const inc = snapshot.totalIncomeNpr;
  const food = snapshot.foodExpenseNpr;
  const foodShare = burn > 0 ? food / burn : 0;
  const last = snapshot.lastNwDeltaNpr;
  const avg = snapshot.avgNwDeltaNpr;
  const cov = snapshot.coverageMonths;
  const icf = snapshot.investableCashflowNpr;

  let momentum: BehavioralAnalytics["portfolioMomentumVs12m"] = "unknown";
  if (last != null && avg != null && avg !== 0) {
    if (last > avg * 1.12) momentum = "up";
    else if (last < avg * 0.88) momentum = "down";
    else momentum = "flat";
  } else if (last != null && snapshot.monthDeltaNpr != null) {
    if (snapshot.monthDeltaNpr > 0) momentum = "up";
    else if (snapshot.monthDeltaNpr < 0) momentum = "down";
    else momentum = "flat";
  }

  let dining: BehavioralAnalytics["diningPressure"] = "unknown";
  if (burn > 0 && food > 0) {
    if (foodShare > 0.28) dining = "high";
    else if (foodShare > 0.18) dining = "moderate";
    else dining = "low";
  }

  const savingsDisciplineScore = Math.round(
    clamp((sr ?? 0) * 0.85 + (cov == null ? 0 : Math.min(cov, 12)) * 2.2 + (icf > 0 ? 8 : icf < 0 ? -12 : 0), 0, 100),
  );
  const nw = snapshot.netWorthNpr;
  const mom = snapshot.monthDeltaNpr;
  const investmentDisciplineScore = Math.round(
    clamp(snapshot.fireScore * 0.52 + (nw > 0 && mom != null ? clamp((mom / nw) * 220, -18, 42) : 0), 0, 100),
  );

  // --- Notifications
  if (inc > 0 && burn > inc * 0.92) {
    notifications.push({
      id: "n-burn",
      label: "Burn alert",
      detail: "Monthly obligations are eating most of declared income.",
      tone: "alert",
      priority: 92,
    });
  }
  if (sr != null && sr < 10 && inc > 0) {
    notifications.push({
      id: "n-sr",
      label: "Savings pressure",
      detail: `Savings rate is ${sr.toFixed(1)}% — consider a burn review.`,
      tone: "alert",
      priority: 88,
    });
  }
  if (cov != null && cov < 3.5 && burn > 0) {
    notifications.push({
      id: "n-runway",
      label: "Runway watch",
      detail: `Emergency coverage ≈ ${cov.toFixed(1)} mo at current burn.`,
      tone: "alert",
      priority: 80,
    });
  }
  if (momentum === "up" && (avg ?? 0) > 0) {
    notifications.push({
      id: "n-momo",
      label: "Momentum milestone",
      detail: "You are ahead of your recent average wealth pace.",
      tone: "milestone",
      priority: 55,
    });
  }
  if (snapshot.payslipGrossMoM_pct != null && snapshot.payslipGrossMoM_pct <= -4) {
    notifications.push({
      id: "n-pay",
      label: "Salary trend",
      detail: "Imported payslips show a softer gross trajectory — re-check cashflow salary.",
      tone: "alert",
      priority: 62,
    });
  }
  const streakMo = Math.max(0, Math.min(12, Math.floor((sr ?? 0) / 7)));
  if (streakMo >= 4 && (sr ?? 0) >= 28) {
    notifications.push({
      id: "n-streak",
      label: "Savings streak",
      detail: `Desk read: ~${streakMo} mo of healthy surplus posture at current inputs.`,
      tone: "positive",
      priority: 40,
    });
  }
  if (snapshot.portfolioResilienceScore >= 78) {
    notifications.push({
      id: "n-res",
      label: "Resilience improving",
      detail: "Shock-read resilience is elevated vs typical balances.",
      tone: "positive",
      priority: 35,
    });
  }
  if (!notifications.length) {
    notifications.push({ id: "n-ok", label: "All quiet", detail: "No urgent coach flags on this snapshot.", tone: "neutral", priority: 0 });
  }

  // --- Insights (coaching cards)
  if (sr != null && sr < 32 && (snapshot.monthDeltaNpr ?? 0) < 0) {
    insights.push({
      id: "i-sr-drop",
      title: "Savings rate under pressure",
      body: `Your modeled savings rate is near ${sr.toFixed(1)}% while net worth momentum slipped this cycle — tighten discretionary buckets before trimming long-term investing.`,
      severity: "warning",
      category: "savings",
      badge: "Cashflow",
    });
  }
  if (snapshot.yearsSavedByInvestKrw800k != null && snapshot.yearsSavedByInvestKrw800k >= 0.35) {
    const y = snapshot.yearsSavedByInvestKrw800k.toFixed(1);
    insights.push({
      id: "i-krw",
      title: "Higher invest pace moves the FI clock",
      body: `Desk model: adding ~₩800k/mo (converted) could shave ~${y} years off modeled years-to-target, holding other assumptions steady.`,
      severity: "info",
      category: "fire",
      badge: "Scenario",
    });
  }
  if (foodShare > 0.21 && burn > 0) {
    const pct = (foodShare * 100).toFixed(0);
    insights.push({
      id: "i-food",
      title: "Food spend is carrying more of the burn",
      body: `Food categories are ~${pct}% of modeled monthly burn — a 10–15% trim there often funds extra NPR contributions without lifestyle shock.`,
      severity: foodShare > 0.28 ? "warning" : "info",
      category: "spending",
      badge: "Habits",
    });
  }
  if (snapshot.portfolioResilienceScore >= 74) {
    insights.push({
      id: "i-res",
      title: "Portfolio resilience is improving",
      body: `Shock-read resilience score ${snapshot.portfolioResilienceScore}/100 — liquidity and leverage posture are helping buffer narratives.`,
      severity: "success",
      category: "portfolio",
      badge: "Risk",
    });
  }
  if (momentum === "up") {
    insights.push({
      id: "i-outperf",
      title: "Outperforming your recent average",
      body: "Latest net worth step is ahead of the trailing average move — keep recurring contributions visible so the habit sticks.",
      severity: "success",
      category: "portfolio",
      badge: "Trend",
    });
  }
  if (snapshot.passiveMonthlyNpr > 0 && snapshot.dividendNpr > 0) {
    insights.push({
      id: "i-pasv",
      title: "Passive stack is diversifying income",
      body: `Modeled passive ~${fmt(snapshot.passiveMonthlyNpr)} NPR/mo with dividends logged — compounding this lane accelerates independence dates.`,
      severity: "success",
      category: "passive",
      badge: "Income",
    });
  }
  if (snapshot.fireYearsToFi != null && snapshot.fireYearsToFi <= 18 && snapshot.fireScore >= 62) {
    insights.push({
      id: "i-fire-desk",
      title: "FIRE desk read looks constructive",
      body: `Modeled horizon ~${snapshot.fireYearsToFi.toFixed(1)} yrs with readiness ${snapshot.fireScore}/100 — stress-test spend if currency mix shifts.`,
      severity: "info",
      category: "fire",
      badge: "FI",
    });
  }
  if (insights.length < 3) {
    insights.push({
      id: "i-default",
      title: "Steady-as-she-goes posture",
      body: "No dramatic swings detected — keep updating cashflow after each payslip import to tighten forecasts.",
      severity: "info",
      category: "behavior",
      badge: "Rhythm",
    });
  }

  insights.sort((a, b) => insightSeverityOrder(a.severity) - insightSeverityOrder(b.severity));

  // --- Recommendations (FIRE optimization layer)
  if (sr != null && sr < 25) {
    recommendations.push({
      id: "r-sr",
      title: "Lift savings rate first",
      body: "Raise income fields or trim category burn until surplus stabilises — small recurring wins beat one-off cuts.",
      impact: "high",
    });
  }
  if (cov != null && cov < 6) {
    recommendations.push({
      id: "r-ef",
      title: "Emergency fund health",
      body: "Target 3–6 months of true burn in liquid NPR (or equivalent) before maxing risk assets.",
      impact: "high",
    });
  }
  if (snapshot.fireScore < 58) {
    recommendations.push({
      id: "r-bal",
      title: "Portfolio balancing",
      body: "Readiness score is mid-pack — rebalance concentration in your largest asset bucket and track liabilities monthly.",
      impact: "medium",
    });
  }
  if (snapshot.passiveMonthlyNpr < snapshot.monthlyBurnNpr * 0.08 && snapshot.netWorthNpr > 500_000) {
    recommendations.push({
      id: "r-pasv",
      title: "Passive income acceleration",
      body: "Push dividends + interest visibility in cashflow, then recycle surplus into investable sleeves you monitor weekly.",
      impact: "medium",
    });
  }
  if (snapshot.yearsSavedByInvestKrw800k != null && snapshot.yearsSavedByInvestKrw800k >= 0.25) {
    recommendations.push({
      id: "r-fi",
      title: "Shorten FIRE timeline",
      body: "Desk math rewards incremental NPR contributions — automate an additional tranche after each payslip import.",
      impact: "medium",
    });
  }
  if (foodShare > 0.24) {
    recommendations.push({
      id: "r-food",
      title: "Dining / food discipline",
      body: "Set a weekly NPR cap for food + entertainment combined; move the delta to investments on payday.",
      impact: "low",
    });
  }

  const habitSummary =
    momentum === "up"
      ? "Wealth pace is ahead of your recent average — keep contributions boring and consistent."
      : momentum === "down"
        ? "Wealth pace cooled vs your recent average — inspect burn drift and currency noise."
        : dining === "high"
          ? "Food is a large share of burn — micro-habits here free meaningful NPR."
          : "Patterns look balanced — refresh payslip imports monthly to keep salary intelligence honest.";

  const behavioral: BehavioralAnalytics = {
    savingsDisciplineScore,
    investmentDisciplineScore,
    portfolioMomentumVs12m: momentum,
    diningPressure: dining,
    habitSummary,
  };

  notifications.sort(sortNotifs);

  return {
    insights: insights.slice(0, 8),
    notifications: notifications.slice(0, 6),
    recommendations: recommendations.slice(0, 6),
    behavioral,
  };
}

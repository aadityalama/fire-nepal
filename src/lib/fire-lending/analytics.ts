import { formatLendingMoney } from "@/lib/fire-lending/format";
import type {
  AiInsight,
  FireLendingLoan,
  FireLendingPayment,
  FireLendingStore,
  LendingKpi,
  MonthlySeriesPoint,
  PortfolioSummary,
} from "@/lib/fire-lending/types";
import { todayIso } from "@/lib/fire-lending/format";

function spark(base: number, variance = 0.12): number[] {
  return Array.from({ length: 8 }, (_, i) => {
    const wave = Math.sin(i * 0.9) * variance;
    return Math.max(0, Math.round(base * (0.85 + wave + i * 0.02)));
  });
}

export function buildPortfolioSummary(store: FireLendingStore): PortfolioSummary {
  const active = store.loans.filter((l) => l.status === "active" || l.status === "overdue");
  const lent = store.loans.filter((l) => l.role === "lender");
  const borrowed = store.loans.filter((l) => l.role === "borrower");
  const totalLent = lent.reduce((s, l) => s + l.amount, 0);
  const totalBorrowed = borrowed.reduce((s, l) => s + l.amount, 0);
  const netOutstanding = active.reduce((s, l) => s + l.outstanding, 0);
  const interestEarned = lent.reduce((s, l) => s + l.interestEarned, 0);
  const overdueLoans = store.loans.filter((l) => l.status === "overdue");
  const dueInstallments = store.installments.filter((i) => i.status === "due" || i.dueDate === todayIso());
  const overdueInstallments = store.installments.filter((i) => i.status === "overdue");
  const paid = store.installments.filter((i) => i.status === "paid").length;
  const dueLike = store.installments.filter((i) => i.status === "paid" || i.status === "overdue" || i.status === "due").length;
  const collectionRate = dueLike === 0 ? 100 : Math.round((paid / dueLike) * 100);
  const overdueRatio = active.length === 0 ? 0 : overdueLoans.length / active.length;
  const healthScore = Math.max(20, Math.min(98, Math.round(collectionRate * 0.7 + (1 - overdueRatio) * 30)));
  const me = store.parties.find((p) => p.id === store.currentUserId);

  let aiSummary = "Portfolio looks stable. Keep recording payments on time to lift Trust Score.";
  if (overdueInstallments.length > 0) {
    aiSummary = `${overdueInstallments.length} installment(s) overdue. Prioritize collections to protect portfolio health.`;
  } else if (dueInstallments.length > 0) {
    aiSummary = `${dueInstallments.length} payment(s) due today. Clear them early to improve collection rate.`;
  } else if (interestEarned > 0) {
    aiSummary = `Interest income trending positively at ${formatLendingMoney(interestEarned)}. Consider offering a new peer loan.`;
  }

  return {
    healthScore,
    netOutstanding,
    totalActiveLoans: active.length,
    totalLent,
    totalBorrowed,
    interestEarned,
    collectionRate,
    dueToday: dueInstallments.reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    overdue: overdueInstallments.reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    trustScore: me?.trustScore ?? 72,
    aiSummary,
  };
}

export function buildKpis(summary: PortfolioSummary): LendingKpi[] {
  return [
    {
      key: "lent",
      label: "Total Lent",
      value: formatLendingMoney(summary.totalLent),
      changePct: 8.4,
      sparkline: spark(summary.totalLent / 8 || 40),
      accent: "emerald",
    },
    {
      key: "borrowed",
      label: "Total Borrowed",
      value: formatLendingMoney(summary.totalBorrowed),
      changePct: -2.1,
      sparkline: spark(summary.totalBorrowed / 8 || 30),
      accent: "teal",
    },
    {
      key: "outstanding",
      label: "Outstanding",
      value: formatLendingMoney(summary.netOutstanding),
      changePct: 1.6,
      sparkline: spark(summary.netOutstanding / 8 || 35),
      accent: "amber",
    },
    {
      key: "interest",
      label: "Interest Earned",
      value: formatLendingMoney(summary.interestEarned),
      changePct: 12.3,
      sparkline: spark(summary.interestEarned / 8 || 12),
      accent: "gold",
    },
    {
      key: "collection",
      label: "Collection Rate",
      value: `${summary.collectionRate}%`,
      changePct: 3.2,
      sparkline: spark(summary.collectionRate, 0.05),
      accent: "emerald",
    },
    {
      key: "due",
      label: "Due Today",
      value: formatLendingMoney(summary.dueToday),
      changePct: summary.dueToday > 0 ? 5 : 0,
      sparkline: spark(Math.max(summary.dueToday / 4, 8)),
      accent: "amber",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: formatLendingMoney(summary.overdue),
      changePct: summary.overdue > 0 ? -4.5 : 0,
      sparkline: spark(Math.max(summary.overdue / 4, 6)),
      accent: "rose",
    },
    {
      key: "trust",
      label: "Trust Score",
      value: `${summary.trustScore}`,
      changePct: 1.1,
      sparkline: spark(summary.trustScore, 0.04),
      accent: "gold",
    },
  ];
}

export function buildMonthlySeries(loans: FireLendingLoan[], payments: FireLendingPayment[]): MonthlySeriesPoint[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((month, idx) => {
    const factor = (idx + 1) / months.length;
    const lending = loans.filter((l) => l.role === "lender").reduce((s, l) => s + l.amount, 0) * (0.12 + factor * 0.08);
    const borrowing = loans.filter((l) => l.role === "borrower").reduce((s, l) => s + l.amount, 0) * (0.1 + factor * 0.07);
    const interest = loans.reduce((s, l) => s + l.interestEarned, 0) * (0.1 + factor * 0.1);
    const collected = payments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0) * (0.12 + factor * 0.06);
    return {
      month,
      lending: Math.round(lending),
      borrowing: Math.round(borrowing),
      interest: Math.round(interest),
      collected: Math.round(collected),
    };
  });
}

export function buildStatusDistribution(loans: FireLendingLoan[]): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const loan of loans) {
    map.set(loan.status, (map.get(loan.status) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

export function buildAiInsights(store: FireLendingStore, summary: PortfolioSummary): AiInsight[] {
  const insights: AiInsight[] = [];
  const dueWeek = store.installments.filter((i) => {
    if (i.status === "paid") return false;
    const due = new Date(i.dueDate).getTime();
    const now = Date.now();
    return due >= now && due <= now + 7 * 86400000;
  });
  if (dueWeek.length > 0) {
    insights.push({
      id: "due-week",
      severity: "info",
      title: `${dueWeek.length} payment${dueWeek.length > 1 ? "s" : ""} due this week`,
      body: "Schedule reminders and confirm settlement method with counterparties.",
      actionLabel: "View installments",
      href: "/fire-lending/installments",
    });
  }

  const highRisk = store.loans.find((l) => l.riskScore >= 70 && (l.status === "active" || l.status === "overdue"));
  if (highRisk) {
    const party = store.parties.find((p) => p.id === highRisk.counterpartyId);
    insights.push({
      id: "risk",
      severity: "critical",
      title: "High default risk detected",
      body: `${party?.name ?? "A borrower"} shows elevated risk (${highRisk.riskScore}). Review agreement & follow up.`,
      actionLabel: "Open loan",
      href: `/fire-lending/loans/${highRisk.id}`,
    });
  }

  if (summary.collectionRate >= 85) {
    insights.push({
      id: "collection-up",
      severity: "success",
      title: "Collection rate healthy",
      body: `Collection rate is ${summary.collectionRate}%. Portfolio quality supports new peer lending.`,
      actionLabel: "New loan",
      href: "/fire-lending/new",
    });
  }

  insights.push({
    id: "interest",
    severity: "info",
    title: "Expected monthly interest",
    body: `Projected interest income near ${formatLendingMoney(Math.round(summary.interestEarned / 6 || 2500))} based on active loans.`,
    actionLabel: "Analytics",
    href: "/fire-lending/analytics",
  });

  if (summary.overdue > 0) {
    insights.push({
      id: "follow-up",
      severity: "warning",
      title: "Suggested follow-up",
      body: "Send overdue notices and offer partial settlement before escalating.",
      actionLabel: "Record payment",
      href: "/fire-lending/payments/new",
    });
  }

  return insights.slice(0, 5);
}

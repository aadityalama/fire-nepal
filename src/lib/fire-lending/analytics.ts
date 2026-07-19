import { formatLendingMoney, todayIso } from "@/lib/fire-lending/format";
import type {
  ActivityItem,
  AgreementCenterStats,
  AiInsight,
  FireLendingLoan,
  FireLendingPayment,
  FireLendingStore,
  LendingKpi,
  MonthlySeriesPoint,
  PortfolioSummary,
  TopBorrowerItem,
  UpcomingPaymentItem,
} from "@/lib/fire-lending/types";

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

  const expectedInterest = Math.round(
    active.filter((l) => l.role === "lender").reduce((s, l) => s + (l.outstanding * l.interestRate) / 100 / 12, 0),
  );

  return {
    healthScore,
    netOutstanding,
    totalActiveLoans: active.length,
    totalLent,
    totalBorrowed,
    interestEarned,
    expectedInterest,
    collectionRate,
    dueToday: dueInstallments.reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    overdue: overdueInstallments.reduce((s, i) => s + (i.amount - i.paidAmount), 0),
    trustScore: me?.trustScore ?? 72,
    aiSummary,
    lastUpdated: new Date().toISOString(),
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
      tone: "healthy",
    },
    {
      key: "borrowed",
      label: "Total Borrowed",
      value: formatLendingMoney(summary.totalBorrowed),
      changePct: -2.1,
      sparkline: spark(summary.totalBorrowed / 8 || 30),
      accent: "blue",
      tone: "info",
    },
    {
      key: "outstanding",
      label: "Outstanding",
      value: formatLendingMoney(summary.netOutstanding),
      changePct: 1.6,
      sparkline: spark(summary.netOutstanding / 8 || 35),
      accent: "teal",
      tone: "info",
    },
    {
      key: "interest",
      label: "Interest Earned",
      value: formatLendingMoney(summary.interestEarned),
      changePct: 12.3,
      sparkline: spark(summary.interestEarned / 8 || 12),
      accent: "gold",
      tone: "healthy",
    },
    {
      key: "collection",
      label: "Collection Rate",
      value: `${summary.collectionRate}%`,
      changePct: 3.2,
      sparkline: spark(summary.collectionRate, 0.05),
      accent: "emerald",
      tone: "healthy",
    },
    {
      key: "due",
      label: "Due Today",
      value: formatLendingMoney(summary.dueToday),
      changePct: summary.dueToday > 0 ? 5 : 0,
      sparkline: spark(Math.max(summary.dueToday / 4, 8)),
      accent: "amber",
      tone: "due",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: formatLendingMoney(summary.overdue),
      changePct: summary.overdue > 0 ? -4.5 : 0,
      sparkline: spark(Math.max(summary.overdue / 4, 6)),
      accent: "rose",
      tone: "overdue",
    },
    {
      key: "trust",
      label: "Trust Score",
      value: `${summary.trustScore}`,
      changePct: 1.1,
      sparkline: spark(summary.trustScore, 0.04),
      accent: "gold",
      tone: "healthy",
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
      growth: Math.round(lending * 0.65 + collected * 0.35),
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
      confidence: 92,
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
      confidence: 88,
    });
  }

  if (summary.collectionRate >= 85) {
    insights.push({
      id: "collection-up",
      severity: "success",
      title: "Collection improved 8%",
      body: `Collection rate is ${summary.collectionRate}%. Portfolio quality supports new peer lending.`,
      actionLabel: "New loan",
      href: "/fire-lending/new",
      confidence: 94,
    });
  }

  insights.push({
    id: "interest",
    severity: "info",
    title: "Expected monthly interest",
    body: `Projected interest income near ${formatLendingMoney(summary.expectedInterest || Math.round(summary.interestEarned / 6 || 2500))} based on active loans.`,
    actionLabel: "Analytics",
    href: "/fire-lending/analytics",
    confidence: 86,
  });

  if (summary.overdue > 0) {
    insights.push({
      id: "follow-up",
      severity: "warning",
      title: "Recommended follow-up",
      body: "Send overdue notices and offer partial settlement before escalating.",
      actionLabel: "Record payment",
      href: "/fire-lending/payments/new",
      confidence: 90,
    });
  }

  return insights.slice(0, 5);
}

export function buildUpcomingPayments(store: FireLendingStore): UpcomingPaymentItem[] {
  const today = todayIso();
  const t = new Date(today);
  const d1 = new Date(t);
  d1.setDate(d1.getDate() + 1);
  const d3 = new Date(t);
  d3.setDate(d3.getDate() + 3);
  const d7 = new Date(t);
  d7.setDate(d7.getDate() + 7);
  const tomorrowIso = d1.toISOString().slice(0, 10);
  const day3Iso = d3.toISOString().slice(0, 10);
  const day7Iso = d7.toISOString().slice(0, 10);

  return store.installments
    .filter((i) => i.status !== "paid" && i.dueDate >= today && i.dueDate <= day7Iso)
    .map((i) => {
      const loan = store.loans.find((l) => l.id === i.loanId);
      const party = store.parties.find((p) => p.id === loan?.counterpartyId);
      let bucket: UpcomingPaymentItem["bucket"] = "7days";
      if (i.dueDate === today) bucket = "today";
      else if (i.dueDate === tomorrowIso) bucket = "tomorrow";
      else if (i.dueDate <= day3Iso) bucket = "3days";
      return {
        id: i.id,
        loanId: i.loanId,
        partyId: party?.id ?? "",
        partyName: party?.name ?? "Counterparty",
        amount: i.amount - i.paidAmount,
        currency: loan?.currency ?? "NPR",
        dueDate: i.dueDate,
        bucket,
        status: i.status,
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 12);
}

export function buildActivityFeed(store: FireLendingStore): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const loan of store.loans.slice(0, 4)) {
    items.push({
      id: `loan-${loan.id}`,
      kind: "loan_created",
      title: "Loan Created",
      body: `${loan.agreementNumber} · ${formatLendingMoney(loan.amount, loan.currency)}`,
      at: loan.createdAt,
    });
    if (loan.lenderSigned && loan.borrowerSigned) {
      items.push({
        id: `sign-${loan.id}`,
        kind: "agreement_signed",
        title: "Agreement Signed",
        body: `${loan.agreementNumber} fully executed`,
        at: loan.startDate ?? loan.createdAt,
      });
    }
    if (loan.status === "settled") {
      items.push({
        id: `settle-${loan.id}`,
        kind: "settlement",
        title: "Settlement Completed",
        body: `${loan.agreementNumber} closed`,
        at: loan.endDate ?? loan.createdAt,
      });
    }
  }
  for (const p of store.payments.slice(0, 5)) {
    items.push({
      id: `pay-${p.id}`,
      kind: "payment_received",
      title: "Payment Received",
      body: `${formatLendingMoney(p.amount)} via ${p.method.replace("_", " ")}`,
      at: p.paidAt,
    });
  }
  for (const n of store.notifications.filter((x) => x.kind === "payment_due").slice(0, 2)) {
    items.push({
      id: `rem-${n.id}`,
      kind: "reminder_sent",
      title: "Reminder Sent",
      body: n.body,
      at: n.createdAt,
    });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
}

export function buildTopBorrowers(store: FireLendingStore): TopBorrowerItem[] {
  const byParty = new Map<string, TopBorrowerItem>();
  for (const loan of store.loans.filter((l) => l.role === "lender")) {
    const party = store.parties.find((p) => p.id === loan.counterpartyId);
    if (!party) continue;
    const existing = byParty.get(party.id);
    const nextDue = store.installments
      .filter((i) => i.loanId === loan.id && i.status !== "paid")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]?.dueDate;
    const paid = store.installments.filter((i) => i.loanId === loan.id && i.status === "paid").length;
    const total = store.installments.filter((i) => i.loanId === loan.id).length || 1;
    const performancePct = Math.round((paid / total) * 100);
    if (existing) {
      existing.outstanding += loan.outstanding;
      if (nextDue && (!existing.nextDue || nextDue < existing.nextDue)) existing.nextDue = nextDue;
      existing.performancePct = Math.round((existing.performancePct + performancePct) / 2);
    } else {
      byParty.set(party.id, {
        partyId: party.id,
        name: party.name,
        trustScore: party.trustScore,
        outstanding: loan.outstanding,
        nextDue,
        performancePct,
      });
    }
  }
  return Array.from(byParty.values())
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);
}

export function buildAgreementCenter(store: FireLendingStore): AgreementCenterStats {
  return {
    pendingSignature: store.agreements.filter((a) => a.status === "awaiting_signatures").length,
    waitingApproval: store.loans.filter((l) => l.status === "pending_approval").length + store.requests.filter((r) => r.status === "pending").length,
    active: store.agreements.filter((a) => a.status === "active").length,
    completed: store.agreements.filter((a) => a.status === "completed").length,
    expired: store.agreements.filter((a) => a.status === "void").length,
  };
}

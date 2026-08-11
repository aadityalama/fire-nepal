/**
 * Educational local FIRE AI responses for the homepage widget.
 * Uses only real UnifiedFireSummary fields — never invents missing user data.
 */

import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import { computeFinancialHealthScore } from "@/lib/fire-nepal-ai/financial-health-score";
import type { LanguageCode } from "@/lib/i18n/homepage-translations";

function formatNpr(amount: number): string {
  if (!Number.isFinite(amount)) return "NPR —";
  const abs = Math.abs(amount);
  if (abs >= 10_000_000) {
    const cr = amount / 10_000_000;
    return `NPR ${cr.toFixed(abs % 10_000_000 === 0 ? 0 : 1)} Cr`;
  }
  if (abs >= 100_000) {
    const lakh = amount / 100_000;
    return `NPR ${lakh.toFixed(abs % 100_000 === 0 ? 0 : 1)} Lakh`;
  }
  try {
    return `NPR ${Math.round(amount).toLocaleString("en-NP")}`;
  } catch {
    return `NPR ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

export type HomepageFireSnapshot = {
  readinessPct: number | null;
  estimatedReturnYears: number | null;
  monthlySavingsNpr: number | null;
  fireTargetNpr: number | null;
  fireGapNpr: number | null;
  savingsRatePct: number | null;
  emergencyMonths: number | null;
  hasAnyData: boolean;
};

export function buildHomepageFireSnapshot(summary: UnifiedFireSummary): HomepageFireSnapshot {
  const health = computeFinancialHealthScore(summary);
  const readinessPct = health.score;

  const hasIncome = summary.monthlyIncome > 0;
  const hasExpenses = summary.monthlyExpenses > 0;
  const monthlySavingsNpr =
    hasIncome && hasExpenses ? summary.monthlyIncome - summary.monthlyExpenses : null;

  const fireTargetNpr =
    summary.fireNumber25xAnnualSpendNpr > 0 ? summary.fireNumber25xAnnualSpendNpr : null;

  const fireGapNpr =
    fireTargetNpr != null && summary.totalNetWorthNpr < fireTargetNpr
      ? fireTargetNpr - summary.totalNetWorthNpr
      : fireTargetNpr != null && summary.totalNetWorthNpr >= fireTargetNpr
        ? 0
        : null;

  let estimatedReturnYears: number | null = null;
  if (monthlySavingsNpr != null && monthlySavingsNpr > 0 && fireGapNpr != null && fireGapNpr > 0) {
    estimatedReturnYears = fireGapNpr / (monthlySavingsNpr * 12);
  } else if (fireGapNpr === 0) {
    estimatedReturnYears = 0;
  }

  const hasAnyData =
    readinessPct != null ||
    monthlySavingsNpr != null ||
    fireTargetNpr != null ||
    summary.emergencyFundCoverageMonths != null ||
    summary.totalNetWorthNpr !== 0;

  return {
    readinessPct,
    estimatedReturnYears,
    monthlySavingsNpr,
    fireTargetNpr,
    fireGapNpr,
    savingsRatePct: summary.savingsRatePct,
    emergencyMonths: summary.emergencyFundCoverageMonths,
    hasAnyData,
  };
}

function missingChecklist(lang: LanguageCode): string {
  if (lang === "np") {
    return `म नेपाल फिर्ती समयरेखा अनुमान गर्न सक्छु। मलाई चाहिन्छ:\n1. मासिक हातमा आउने आम्दानी\n2. मासिक खर्च\n3. हालको बचत/लगानी\n4. नेपालमा लक्ष्य मासिक जीवन लागत`;
  }
  if (lang === "kr") {
    return `네팔 귀국 시점을 추정하려면 다음만 필요합니다:\n1. 월 실수령 소득\n2. 월 지출\n3. 현재 저축/투자\n4. 네팔 목표 월 생활비`;
  }
  if (lang === "ja") {
    return `ネパール帰国の時期を推定するには、次が必要です:\n1. 月の手取り収入\n2. 月の支出\n3. 現在の貯蓄/投資\n4. ネパールでの目標月間生活費`;
  }
  return `I can estimate your Nepal return timeline. I just need:\n1. monthly take-home income\n2. monthly expenses\n3. current savings/investments\n4. target monthly lifestyle cost in Nepal`;
}

function structure(parts: {
  quick: string;
  why: string;
  numbers: string[];
  steps: string[];
  risks: string;
  lang: LanguageCode;
}): string {
  const h =
    parts.lang === "np"
      ? { quick: "छिटो जवाफ", why: "किन", numbers: "तपाईंका अंक", steps: "अर्को कदमहरू", risks: "मान्यता / जोखिम" }
      : parts.lang === "kr"
        ? { quick: "빠른 답변", why: "이유", numbers: "내 수치", steps: "다음 단계", risks: "가정 / 위험" }
        : parts.lang === "ja"
          ? { quick: "クイック回答", why: "理由", numbers: "あなたの数値", steps: "次のアクション", risks: "前提 / リスク" }
          : {
              quick: "Quick answer",
              why: "Why",
              numbers: "Your numbers",
              steps: "Recommended next steps",
              risks: "Important assumptions / risks",
            };

  const numberLines = parts.numbers.length
    ? parts.numbers.map((n) => `• ${n}`).join("\n")
    : parts.lang === "np"
      ? "• पर्याप्त तथ्यांक छैन — क्यासफ्लो/पोर्टफोलियो थप्नुहोस्"
      : parts.lang === "kr"
        ? "• 충분한 데이터 없음 — 캐시플로/포트폴리오를 추가하세요"
        : "• Not enough synced data yet — add cashflow/portfolio in FIRE Nepal";

  const stepLines = parts.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

  return `**${h.quick}**\n${parts.quick}\n\n**${h.why}**\n${parts.why}\n\n**${h.numbers}**\n${numberLines}\n\n**${h.steps}**\n${stepLines}\n\n**${h.risks}**\n${parts.risks}`;
}

function yearsLabel(years: number | null, lang: LanguageCode): string {
  if (years == null) return lang === "np" ? "अपर्याप्त तथ्यांक" : lang === "kr" ? "데이터 부족" : "Not enough data";
  if (years <= 0) return lang === "np" ? "लक्ष्य नजिक / पुगेको" : lang === "kr" ? "목표에 근접/도달" : "Near / at target";
  const rounded = years < 1 ? years.toFixed(1) : String(Math.round(years * 10) / 10);
  if (lang === "np") return `약 ${rounded} वर्ष`;
  if (lang === "kr") return `약 ${rounded}년`;
  if (lang === "ja") return `約${rounded}年`;
  return `about ${rounded} years`;
}

/**
 * Build a structured educational response from real summary data + user question.
 */
export function buildHomepageFireAiLocalResponse(
  prompt: string,
  summary: UnifiedFireSummary,
  language: LanguageCode,
): string {
  const q = prompt.trim().toLowerCase();
  const snap = buildHomepageFireSnapshot(summary);
  const lang = language;

  const numbers: string[] = [];
  if (snap.savingsRatePct != null) {
    numbers.push(
      lang === "np"
        ? `बचत दर: ${Math.round(snap.savingsRatePct)}%`
        : lang === "kr"
          ? `저축률: ${Math.round(snap.savingsRatePct)}%`
          : `Savings rate: ${Math.round(snap.savingsRatePct)}%`,
    );
  }
  if (snap.emergencyMonths != null) {
    numbers.push(
      lang === "np"
        ? `आपतकालीन कोष: ${snap.emergencyMonths.toFixed(1)} महिना`
        : lang === "kr"
          ? `비상자금: ${snap.emergencyMonths.toFixed(1)}개월`
          : `Emergency fund: ${snap.emergencyMonths.toFixed(1)} months`,
    );
  }
  if (snap.fireGapNpr != null) {
    numbers.push(
      lang === "np"
        ? `FIRE gap: ${formatNpr(snap.fireGapNpr)}`
        : lang === "kr"
          ? `FIRE gap: ${formatNpr(snap.fireGapNpr)}`
          : `FIRE gap: ${formatNpr(snap.fireGapNpr)}`,
    );
  }
  if (summary.liabilitiesNpr > 0) {
    numbers.push(
      lang === "np"
        ? `ऋण/दायित्व: ${formatNpr(summary.liabilitiesNpr)}`
        : lang === "kr"
          ? `부채: ${formatNpr(summary.liabilitiesNpr)}`
          : `Debt / liabilities: ${formatNpr(summary.liabilitiesNpr)}`,
    );
  }

  const fxEdu =
    lang === "np"
      ? "FX spread भनेको बजार विनिमय दर र तपाईंको प्रदायकले दिने दरबीचको फरक हो। सानो spread पनि वर्षौंको रेमिटेन्समा ठूलो हुन सक्छ।"
      : lang === "kr"
        ? "FX 스프레드는 시장 환율과 송금 업체가 실제로 적용하는 환율의 차이입니다. 작은 스프레드도 수년간의 송금에서는 커질 수 있습니다."
        : "FX spread means the difference between the market exchange rate and the rate your provider actually gives you. A small spread can become significant over years of remittances.";

  const riskDefault =
    lang === "np"
      ? `यो शैक्षिक अनुमान हो, ग्यारेन्टी होइन। मुद्रा जोखिम (FX), आय परिवर्तन, र नेपाल मुद्रास्फीतिले समयरेखा बदल्न सक्छ। ${fxEdu}`
      : lang === "kr"
        ? `교육용 추정치이며 보장이 아닙니다. 환율(FX), 소득 변화, 네팔 인플레이션이 일정을 바꿀 수 있습니다. ${fxEdu}`
        : `Educational estimate only — not a guarantee. FX risk, income changes, and Nepal inflation can shift timelines. ${fxEdu}`;

  const needsReturnData = !snap.hasAnyData || snap.monthlySavingsNpr == null || snap.fireTargetNpr == null;

  // Return-to-Nepal / timeline
  if (
    q.includes("return to nepal") ||
    q.includes("years until") ||
    q.includes("नेपाल फर्क") ||
    q.includes("귀국") ||
    q.includes("plan my return") ||
    q.includes("फिर्ती")
  ) {
    if (needsReturnData) {
      return structure({
        lang,
        quick:
          lang === "np"
            ? "नेपाल फिर्ती समयरेखा अनुमान गर्न अझै केही मुख्य अंक चाहिन्छ।"
            : lang === "kr"
              ? "네팔 귀국 시점을 추정하려면 몇 가지 핵심 수치가 더 필요합니다."
              : "I can estimate your Nepal return timeline once a few key numbers are in place.",
        why: missingChecklist(lang),
        numbers,
        steps: [
          lang === "np" ? "Cashflow Dashboard मा आय/खर्च थप्नुहोस्" : "Add income & expenses in Cashflow Dashboard",
          lang === "np" ? "Portfolio मा बचत/लगानी जोड्नुहोस्" : "Connect savings & investments in Portfolio",
          lang === "np"
            ? "Remittance Calculator ले KRW→NPR लागत तुलना गर्नुहोस्"
            : "Compare KRW→NPR transfer cost in the Remittance Calculator",
        ],
        risks: riskDefault,
      });
    }

    const yearsText = yearsLabel(snap.estimatedReturnYears, lang);
    return structure({
      lang,
      quick:
        lang === "np"
          ? `तपाईंको हालको बचत गतिअनुसार नेपाल फिर्ती सम्भावित समयरेखा करिब ${yearsText} हो।`
          : lang === "kr"
            ? `현재 저축 속도 기준 네팔 귀국 가능 시점은 약 ${yearsText}입니다.`
            : `Based on your current savings pace, a possible Nepal return timeline is ${yearsText}.`,
      why:
        lang === "np"
          ? "यो अनुमान मासिक बचत र २५× वार्षिक खर्चको FIRE लक्ष्य (corpus) बीचको अन्तरमा आधारित छ।"
          : lang === "kr"
            ? "월 저축과 연 지출 25배 FIRE 목표(코퍼스) 사이의 차이를 기준으로 한 교육용 추정입니다."
            : "This educational estimate uses your monthly savings versus the classic 25× annual-spend FIRE corpus target.",
      numbers,
      steps: [
        lang === "np"
          ? `आपतकालीन कोष ${(snap.emergencyMonths ?? 0) < 6 ? "६ महिनासम्म" : "कायम"} राख्नुहोस्`
          : `Build or maintain emergency reserve toward 6 months`,
        lang === "np"
          ? "दीर्घकालीन लक्ष्यका लागि मासिक लगानी अनुशासन कायम राख्नुहोस्"
          : "Keep a steady monthly investment toward long-term goals",
        lang === "np"
          ? "Remittance Calculator ले मासिक FX/शुल्क रणनीति समीक्षा गर्नुहोस्"
          : "Review FX/remittance strategy monthly with the Remittance Calculator",
      ],
      risks: riskDefault,
    });
  }

  // Monthly savings
  if (q.includes("save every month") || q.includes("should i save") || q.includes("बचत") || q.includes("저축")) {
    if (snap.monthlySavingsNpr == null) {
      return structure({
        lang,
        quick:
          lang === "np"
            ? "मासिक बचत सुझाव दिन आय र खर्च चाहिन्छ।"
            : "I need your monthly income and expenses to suggest a savings plan.",
        why: missingChecklist(lang),
        numbers,
        steps: [
          "Open Cashflow Dashboard",
          "Add take-home income and living expenses",
          "Re-ask FIRE AI for a personalized savings plan",
        ],
        risks: riskDefault,
      });
    }
    const rate = snap.savingsRatePct != null ? `${Math.round(snap.savingsRatePct)}%` : "—";
    return structure({
      lang,
      quick:
        lang === "np"
          ? `तपाईं अहिले करिब ${formatNpr(snap.monthlySavingsNpr)}/महिना बचत गर्दै हुनुहुन्छ (दर ${rate})।`
          : `You're currently saving about ${formatNpr(snap.monthlySavingsNpr)} per month (rate ${rate}).`,
      why:
        lang === "np"
          ? "बचत = आम्दानी − खर्च। २०%+ दर अक्सर बलियो सुरुवात हो; आपतकालीन कोष पहिले सुरक्षित गर्नुहोस्।"
          : "Savings = income − expenses. A 20%+ rate is often a strong start after securing an emergency reserve.",
      numbers,
      steps: [
        (snap.emergencyMonths ?? 0) < 6
          ? "Prioritize emergency fund to ~6 months of expenses"
          : "Keep emergency fund topped up",
        "Automate investing of surplus after essentials",
        "Track goals in Saving Goals",
      ],
      risks: riskDefault,
    });
  }

  // Emergency fund
  if (q.includes("emergency")) {
    if (summary.monthlyExpenses <= 0) {
      return structure({
        lang,
        quick: "I need your monthly expenses to size an emergency fund.",
        why: "A common educational guideline is 3–6 months of essential living costs in liquid cash.",
        numbers,
        steps: ["Add expenses in Cashflow", "Open Emergency Fund tool", "Re-ask once burn rate is known"],
        risks: riskDefault,
      });
    }
    const target6 = summary.monthlyExpenses * 6;
    return structure({
      lang,
      quick: `An educational emergency target is about ${formatNpr(target6)} (6× monthly expenses).`,
      why: "Cash buffer protects you from job loss, medical shocks, and FX delays without selling investments in a hurry.",
      numbers: [
        ...numbers,
        `6-month target: ${formatNpr(target6)}`,
        snap.emergencyMonths != null ? `Current runway: ${snap.emergencyMonths.toFixed(1)} months` : "Current runway: not synced",
      ],
      steps: [
        "Park emergency cash in liquid NPR/KRW accounts",
        "Avoid mixing emergency cash with long-term investments",
        "Open Emergency Fund tracker to monitor progress",
      ],
      risks: riskDefault,
    });
  }

  // Remittance
  if (q.includes("send money") || q.includes("remittance") || q.includes("रेमिटेन्स") || q.includes("송금")) {
    return structure({
      lang,
      quick:
        lang === "np"
          ? "रेमिटेन्स ‘कहिले पठाउने’ आपतकालीन कोष, नेपाल खर्च आवश्यकता, र FX/शुल्कमा निर्भर गर्छ।"
          : "Whether to remit now depends on emergency reserves, Nepal spending needs, and FX/fee costs — not a single rule.",
      why: fxEdu,
      numbers,
      steps: [
        "Compare providers in the Remittance Calculator",
        "Keep 3–6 months emergency cash before large remittances",
        "Link transfers to a named Nepal goal in Saving Goals",
      ],
      risks: riskDefault,
    });
  }

  // Insurance
  if (q.includes("insurance") || q.includes("बीमा") || q.includes("보험")) {
    return structure({
      lang,
      quick:
        lang === "np"
          ? "बीमा आवश्यकता आम्दानी, आश्रित, ऋण, र अवस्थित कभरेजमा निर्भर गर्छ — कुनै एउटै अंक सबैका लागि होइन।"
          : "Insurance need depends on income, dependents, debt, and existing cover — there is no universal product pick.",
      why: "Educational life need often starts from income replacement + liabilities − liquid assets; health need from household medical buffers.",
      numbers,
      steps: [
        "Open Insurance workspace for an input-based estimate",
        "List existing health/life policies",
        "Review gaps after deducting current cover",
      ],
      risks: riskDefault,
    });
  }

  // Investment risk / FIRE journey / retirement / default
  if (q.includes("risk") || q.includes("investment") || q.includes("लगानी") || q.includes("투자")) {
    const debtNote =
      summary.liabilitiesNpr > 0
        ? `Liabilities on file: ${formatNpr(summary.liabilitiesNpr)}.`
        : "No liabilities synced yet.";
    return structure({
      lang,
      quick: "Investment risk rises with concentration, leverage, and short time horizons — diversification and cash buffers lower fragile risk.",
      why: `${debtNote} FIRE Nepal does not recommend a single “best” product.`,
      numbers,
      steps: [
        "Review allocation in Portfolio / FIRE Summary",
        "Match risk to your return-to-Nepal timeline",
        "Rebalance gradually; avoid all-in bets",
      ],
      risks: riskDefault,
    });
  }

  // FIRE number / gap / journey
  if (q.includes("fire") || q.includes("retirement") || q.includes("निवृत्ति") || q.includes("은퇴") || q.includes("gap")) {
    if (snap.fireTargetNpr == null) {
      return structure({
        lang,
        quick: "I need monthly expenses (or a Nepal lifestyle target) to estimate a FIRE number.",
        why: "A common educational FIRE corpus is ~25× annual spending — not a guarantee of lifelong income.",
        numbers,
        steps: ["Add expenses in Cashflow", "Open FIRE Calculator / FIRE Summary", "Re-ask for your FIRE gap"],
        risks: riskDefault,
      });
    }
    return structure({
      lang,
      quick:
        snap.fireGapNpr === 0
          ? `Your tracked net worth meets or exceeds the educational FIRE target of ${formatNpr(snap.fireTargetNpr)}.`
          : `Your educational FIRE target is about ${formatNpr(snap.fireTargetNpr)}; estimated gap ${formatNpr(snap.fireGapNpr ?? 0)}.`,
      why: "Target uses 25× annual cashflow spend. Actual sustainability depends on withdrawal rate, FX, and Nepal costs.",
      numbers,
      steps: [
        "Open FIRE Summary for the full readiness view",
        "Stress-test with FIRE Calculator",
        "Align monthly surplus with long-term investments",
      ],
      risks: riskDefault,
    });
  }

  // Generic helpful default
  return structure({
    lang,
    quick:
      lang === "np"
        ? "म बचत, रेमिटेन्स, लगानी, बीमा, र नेपाल फिर्ती योजनामा शैक्षिक सहयोग गर्न सक्छु।"
        : "I can help with educational guidance on savings, remittance, investing, insurance, and your Nepal return plan.",
    why: snap.hasAnyData
      ? "I'll use your synced FIRE Nepal numbers when available and ask only for missing essentials."
      : missingChecklist(lang),
    numbers,
    steps: [
      "Try a quick prompt above",
      "Or open full FIRE AI chat for deeper conversation",
      "Use Remittance Calculator / FIRE Calculator for precise what-ifs",
    ],
    risks: riskDefault,
  });
}

/** Language directive prepended for the live LLM API (not shown in UI). */
export function withLanguageDirective(message: string, language: LanguageCode): string {
  const directive =
    language === "np"
      ? "Please reply in natural Nepali (नेपाली). Structure the answer as: Quick answer → Why → Your numbers → Recommended next steps → Important assumptions/risks. Educational only — no guaranteed returns or product pitches."
      : language === "kr"
        ? "Please reply in natural Korean. Structure the answer as: Quick answer → Why → Your numbers → Recommended next steps → Important assumptions/risks. Educational only — no guaranteed returns or product pitches."
        : language === "ja"
          ? "Please reply in natural Japanese. Structure the answer as: Quick answer → Why → Your numbers → Recommended next steps → Important assumptions/risks. Educational only — no guaranteed returns or product pitches."
          : "Please reply in clear professional English. Structure the answer as: Quick answer → Why → Your numbers → Recommended next steps → Important assumptions/risks. Educational only — no guaranteed returns or product pitches.";
  return `${directive}\n\nUser question: ${message}`;
}

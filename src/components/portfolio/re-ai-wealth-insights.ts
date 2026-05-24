import type { RealEstateRow } from "@/components/portfolio/types";
import {
  REAL_ESTATE_INFLATION_PROXY_PCT,
  reCalendarMonthsHeld,
  reImpliedAnnualGrowthPct,
  reRoiPct,
} from "@/components/portfolio/real-estate-metrics";

export type ReAiInsightKind = "positive" | "warning" | "risk" | "opportunity" | "strategy";

export type ReAiInsightIcon =
  | "sparkles"
  | "trending-up"
  | "alert-triangle"
  | "shield-alert"
  | "lightbulb"
  | "target"
  | "bar-chart-3"
  | "rocket"
  | "activity";

export type ReAiBadge = { en: string; ne: string };

export type ReAiWealthInsightCard = {
  id: string;
  kind: ReAiInsightKind;
  icon: ReAiInsightIcon;
  headlineEn: string;
  headlineNe: string;
  bodyEn: string;
  bodyNe: string;
  whyEn: string;
  whyNe: string;
  confidence: number;
  badges: ReAiBadge[];
};

export type ReAiMarketSentiment = "bullish" | "neutral" | "cautious" | "bearish";

export type ReAiWealthInsightsBundle = {
  sentiment: ReAiMarketSentiment;
  sentimentLabelEn: string;
  sentimentLabelNe: string;
  sentimentMeter: number;
  cards: ReAiWealthInsightCard[];
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function confidenceFromDepth(monthsHeld: number | null, implied: number | null): number {
  let c = 68;
  if (monthsHeld != null && monthsHeld >= 6) c += 6;
  if (monthsHeld != null && monthsHeld >= 24) c += 6;
  if (implied != null) c += 7;
  c += Math.round(Math.min(12, (monthsHeld ?? 0) / 6));
  return clamp(c, 62, 94);
}

function computeSentiment(args: {
  roi: number | null;
  implied: number | null;
  yearsHeld: number | null;
  assumed: number | undefined;
}): { sentiment: ReAiMarketSentiment; labelEn: string; labelNe: string; meter: number } {
  let score = 0;
  const { roi, implied, yearsHeld, assumed } = args;
  if (roi != null) {
    if (roi >= 28) score += 3;
    else if (roi >= 12) score += 2;
    else if (roi >= 5) score += 1;
    else if (roi < 0) score -= 3;
    else if (yearsHeld != null && yearsHeld >= 2 && roi < 6) score -= 2;
  }
  if (implied != null) {
    if (implied >= 12) score += 2;
    else if (implied >= 6) score += 1;
    else if (implied < 2 && yearsHeld != null && yearsHeld >= 1) score -= 2;
    if (implied >= REAL_ESTATE_INFLATION_PROXY_PCT) score += 1;
  }
  if (typeof assumed === "number" && implied != null) {
    if (implied + 3 < assumed) {
      score -= 1;
    } else if (implied + 1 >= assumed) {
      score += 1;
    } else if (assumed > implied + 2) {
      score += 1;
    }
  }
  const meterDet = clamp(score * 22, -100, 100);

  let sentiment: ReAiMarketSentiment;
  let labelEn: string;
  let labelNe: string;
  if (meterDet >= 38) {
    sentiment = "bullish";
    labelEn = "Bullish — constructive momentum vs book";
    labelNe = "बुलिस — पुस्तकाङ्कनको तुलनामा राम्रो गति";
  } else if (meterDet >= 8) {
    sentiment = "neutral";
    labelEn = "Neutral — mixed signals, watch fundamentals";
    labelNe = "न्युट्रल — मिश्रित संकेत, आधारभूत कुरा हेर्नुहोस्";
  } else if (meterDet >= -25) {
    sentiment = "cautious";
    labelEn = "Cautious — headwinds or softer implied growth";
    labelNe = "सतर्क — प्रतिकूल वा कमजोर निहित वृद्धि";
  } else {
    sentiment = "bearish";
    labelEn = "Bearish — elevated downside risk on current marks";
    labelNe = "बेयरिस — हालको मूल्याङ्कनमा जोखिम बढी";
  }
  return { sentiment, labelEn, labelNe, meter: meterDet };
}

function card(
  partial: Omit<ReAiWealthInsightCard, "confidence"> & { confidence?: number },
  monthsHeld: number | null,
  implied: number | null,
): ReAiWealthInsightCard {
  return {
    ...partial,
    confidence: partial.confidence ?? confidenceFromDepth(monthsHeld, implied),
  };
}

export function reAiWealthInsightsBundle(row: RealEstateRow, asOfIso = todayIso()): ReAiWealthInsightsBundle {
  const purchase = row.purchaseValue;
  const current = row.estimatedValue;
  const roi = reRoiPct(purchase, current);
  const implied = reImpliedAnnualGrowthPct(purchase, current, row.acquiredDate, asOfIso);
  const monthsHeld = reCalendarMonthsHeld(row.acquiredDate, asOfIso);
  const yearsHeld = monthsHeld != null ? monthsHeld / 12 : null;
  const assumed = row.annualAppreciationEstimatePct;

  const sentimentPack = computeSentiment({ roi, implied, yearsHeld, assumed: assumed ?? undefined });

  const cards: ReAiWealthInsightCard[] = [];

  if ((purchase ?? 0) <= 0 || (current ?? 0) <= 0) {
    cards.push(
      card(
        {
          id: "incomplete",
          kind: "risk",
          icon: "shield-alert",
          headlineEn: "Signal engine paused — inputs incomplete",
          headlineNe: "सङ्केत इन्जिन रोकिएको — डेटा अपूर्ण",
          bodyEn:
            "Our models need both purchase basis and a live estimate to simulate ROI paths, inflation deltas, and scenario risk. Complete the fields above to unlock the full intelligence stack.",
          bodyNe:
            "ROI मार्ग, मुद्रास्फीति अन्तर र परिदृश्य जोखिम निकाल्न खरिद आधार र हालको अनुमान दुवै चाहिन्छ। माथिका खाली ठाउँ भर्नुहोस्।",
          whyEn:
            "Confidence scoring and sentiment classification are withheld until cost and mark are both positive — this avoids misleading narratives on empty rows.",
          whyNe:
            "लागत र मूल्य दुवै नभएसम्म विश्वास स्कोर र सेन्टिमेन्ट लुकाइन्छ — खाली पङ्क्तिमा गलत व्याख्या रोक्न।",
          confidence: 41,
          badges: [
            { en: "Action: fill values", ne: "कार्य: मूल्य भर्नुहोस्" },
            { en: "Models idle", ne: "मोडेल निष्क्रिय" },
          ],
        },
        monthsHeld,
        implied,
      ),
    );
    return {
      sentiment: "cautious",
      sentimentLabelEn: "Awaiting data — sentiment neutralized",
      sentimentLabelNe: "डेटाको प्रतीक्षा — सेन्टिमेन्ट न्युट्रल",
      sentimentMeter: 0,
      cards,
    };
  }

  if (typeof assumed === "number" && implied != null) {
    if (implied + 3 < assumed) {
      cards.push(
        card(
          {
            id: "cagr_below_expectation",
            kind: "warning",
            icon: "alert-triangle",
            headlineEn: "Caution — implied path trails your plan",
            headlineNe: "सतर्क — निहित मार्ग योजनाभन्दा पछि",
            bodyEn:
              "Current CAGR is below inflation-adjusted expectations relative to the growth you modeled. Consider validating nearby transaction benchmarks.",
            bodyNe:
              "हालको CAGR तपाईंले मोडेल गरेको वृद्धिको तुलनामा कम छ। नजिकका कारोबार मूल्य पुनः जाँच गर्नुहोस्।",
            whyEn:
              "When implied compounding materially undershoots a user target for several points, either the mark is conservative, the target aggressive, or fundamentals softened — triangulate with recent sales and rent rolls.",
            whyNe:
              "निहित दर लक्ष्यभन्दा धेरै कम भए मूल्य वाजिब, लक्ष्य उच्च वा आधारभूत कमजोर हुन सक्छ — भर्खरका बिक्री र भाडा हेर्नुहोस्।",
            confidence: confidenceFromDepth(monthsHeld, implied) + 2,
            badges: [
              { en: "Benchmark comps", ne: "तुलना मापदण्ड" },
              { en: "Refresh mark", ne: "मूल्य अद्यावधिक" },
            ],
          },
          monthsHeld,
          implied,
        ),
      );
    } else if (implied + 1 >= assumed) {
      cards.push(
        card(
          {
            id: "tracking_plan",
            kind: "positive",
            icon: "sparkles",
            headlineEn: "On track — implied growth meets your bar",
            headlineNe: "लक्ष्यमा — निहित वृद्धि तपाईंको सीमामा",
            bodyEn:
              "Actual implied CAGR is pacing at or above the annual appreciation you assumed. Momentum is validating your planning envelope.",
            bodyNe:
              "वास्तविक निहित CAGR तपाईंको वार्षिक अनुमान वरिपरि वा माथि छ। योजना मान्य हुँदैछ।",
            whyEn:
              "This read uses the same hold window for both implied CAGR and your estimate — alignment suggests internal consistency between mark and expectations.",
            whyNe:
              "एकै होल्ड अवधिमा निहित CAGR र अनुमान दुवै हेर्छ — मेलले मूल्य र अपेक्षा मिलेको देखाउँछ।",
            badges: [
              { en: "Plan validated", ne: "योजना ठीक" },
              { en: "Monitor drift", ne: "परिवर्तन हेर्नुहोस्" },
            ],
          },
          monthsHeld,
          implied,
        ),
      );
    } else if (assumed > implied + 2) {
      cards.push(
        card(
          {
            id: "target_above_implied",
            kind: "opportunity",
            icon: "rocket",
            headlineEn: "Upside gap vs market-implied trajectory",
            headlineNe: "बजार निहित मार्गभन्दा माथिलो सम्भावना",
            bodyEn:
              "Your appreciation target is significantly above market-implied growth. Long-term upside potential exists if local market demand improves.",
            bodyNe:
              "तपाईंको वृद्धि लक्ष्य बजारले निहित गरेको भन्दा माथि छ। स्थानीय माग बढे दीर्घकालीन फाइदा सम्भव छ।",
            whyEn:
              "We compare your stated annual assumption to the CAGR implied by purchase → current mark over elapsed hold. A wide positive gap suggests either conservative marks, a stretch goal, or a thesis that demand catches up — stress-test with comps and liquidity.",
            whyNe:
              "तपाईंको वार्षिक अनुमान र खरिददेखि हालको मूल्यसम्मको निहित CAGR तुलना गरिन्छ। ठूलो अन्तरले वाजिब मूल्याङ्कन, लक्ष्य वा माग बढ्ने थिसिस जाँच गर्न भन्छ।",
            confidence: confidenceFromDepth(monthsHeld, implied) + 4,
            badges: [
              { en: "Upside thesis", ne: "माथिलो थिसिस" },
              { en: "Validate comps", ne: "तुलना जाँच" },
            ],
          },
          monthsHeld,
          implied,
        ),
      );
    }
  }

  if (roi != null && roi >= 40) {
    cards.push(
      card(
        {
          id: "equity_sprint",
          kind: "opportunity",
          icon: "trending-up",
          headlineEn: "Exceptional equity build on the hold",
          headlineNe: "असाधारण इक्विटी निर्माण",
          bodyEn:
            "Book ROI is deep into outperformance territory — capital is working aggressively versus basis. Consider harvesting discipline and tax-aware sequencing if you rebalance.",
          bodyNe:
            "पुस्तक ROI उच्च क्षेत्रमा — पूँजी बलियोसँग काम गरिरहेको छ। पुनर्सन्तुलनमा कर र समय हेर्नुहोस्।",
          whyEn:
            "Very high cumulative ROI over a finite window often embeds market beta, leverage, or one-off repricing — decompose drivers before extrapolating forward returns.",
          whyNe:
            "छोटो अवधिमा धेरै ROI बजार, ऋण वा एकपटक मूल्य परिवर्तनले हुन सक्छ — अगाडि निकाल्नु अघि कारण खोज्नुहोस्।",
          badges: [
            { en: "Alpha signal", ne: "अल्फा संकेत" },
            { en: "Risk: mean reversion", ne: "जोखिम: माघ्य फर्कन" },
          ],
        },
        monthsHeld,
        implied,
      ),
    );
  } else if (roi != null && roi >= 15 && roi < 40) {
    cards.push(
      card(
        {
          id: "solid_curve",
          kind: "positive",
          icon: "activity",
          headlineEn: "Healthy cumulative appreciation",
          headlineNe: "स्वस्थ जम्मा वृद्धि",
          bodyEn:
            "You are compounding meaningfully above cost — keep marks honest as liquidity and macro regimes shift.",
          bodyNe:
            "लागतभन्दा राम्रो वृद्धि — तरलता र अर्थतन्त्र बदलिँदा मूल्य ईमानदार राख्नुहोस्।",
          whyEn:
            "Mid-teens to high-thirties ROI over multi-year holds often blends income and capital growth — tag which leg is doing the work for smarter tax and reinvestment decisions.",
          whyNe:
            "बहुवर्षे मध्यम-उच्च ROI आम्दानी र पूँजी मिश्रण हुन सक्छ — कर र पुनर्लगानी निर्णयका लागि खुट्टा छुट्याउनुहोस्।",
          badges: [
            { en: "Core quality", ne: "कोर गुणस्तर" },
            { en: "Refresh comps", ne: "तुलना अद्यावधिक" },
          ],
        },
        monthsHeld,
        implied,
      ),
    );
  }

  if (implied != null && implied >= 10) {
    cards.push(
      card(
        {
          id: "robust_implied",
          kind: "positive",
          icon: "bar-chart-3",
          headlineEn: "Implied growth engine looks strong",
          headlineNe: "निहित वृद्धि इन्जिन बलियो",
          bodyEn:
            "Annualized path from purchase to mark suggests a durable compounding cadence — typical of tight supply micro-markets or operational upside.",
          bodyNe:
            "खरिददेखि हालसम्मको वार्षिकीकृत मार्ग दिगो वृद्धि देखाउँछ — आपूर्ति कम वा सञ्चालन लाभ हुन सक्छ।",
          whyEn:
            "Double-digit implied CAGR over meaningful calendar time is uncommon in passive residential beta — verify whether leverage, renovation, or re-zoning contributed.",
          whyNe:
            "लामो समयमा दोहोरो अङ्कको निहित CAGR सामान्य बासस्थानभन्दा uncommon — ऋण, मर्मत वा जोनिङ्ग योगदान जाँच गर्नुहोस्।",
          badges: [
            { en: "Growth quality", ne: "वृद्धि गुणस्तर" },
            { en: "Verify drivers", ne: "कारक जाँच" },
          ],
        },
        monthsHeld,
        implied,
      ),
    );
  }

  if (implied != null && implied >= REAL_ESTATE_INFLATION_PROXY_PCT) {
    cards.push(
      card(
        {
          id: "inflation_screen",
          kind: "opportunity",
          icon: "target",
          headlineEn: `Clearing a ${REAL_ESTATE_INFLATION_PROXY_PCT}% planning inflation screen`,
          headlineNe: `${REAL_ESTATE_INFLATION_PROXY_PCT}% योजना मुद्रास्फीति स्क्रिन माथि`,
          bodyEn:
            "Implied growth is running ahead of a rough long-run CPI-style guardrail — useful for sanity-checking nominal marks (not official CPI).",
          bodyNe:
            "निहित वृद्धि लामो अवधिको मुद्रास्फीति अनुमानभन्दा माथि — नोमिनल मूल्य जाँचका लागि उपयोगी (आधिकारिक CPI होइन)।",
          whyEn:
            "Planning guardrails are heuristic — if you cleared them with margin, stress liquidity if rates spike or immigration slows in your catchment.",
          whyNe:
            "योजना मापदण्ड अनुमान मात्र — मार्जिन छ भने ब्याज वा आप्रवासन घट्दा तरलता जाँच गर्नुहोस्।",
          badges: [
            { en: "Real yield tilt", ne: "वास्तविक प्रतिफल" },
            { en: "Planning only", ne: "योजना मात्र" },
          ],
        },
        monthsHeld,
        implied,
      ),
    );
  }

  if (yearsHeld != null && yearsHeld >= 2 && roi != null && roi < 5) {
    cards.push(
      card(
        {
          id: "low_vs_time",
          kind: "risk",
          icon: "shield-alert",
          headlineEn: "Risk flag — growth looks thin for time in seat",
          headlineNe: "जोखिम — समयको तुलनामा वृद्धि कम",
          bodyEn:
            "Low growth relative to time held — validate purchase basis, comparables, or rental yield before sizing more capital into the name.",
          bodyNe:
            "समय अनुसार सम्पत्तिको वृद्धि कम देखिन्छ — खरिद आधार, तुलना वा भाडा पुनः जाँच गर्नुहोस्।",
          whyEn:
            "Flat or low cumulative ROI after multi-year seasoning can indicate overpaid basis, stale marks, or structural rent caps — pull three nearby transactions and a rent roll.",
          whyNe:
            "बहुवर्षपछि पनि कम ROI भने महँगो आधार, पुरानो मूल्य वा भाडा सीमा हुन सक्छ — नजिकका तीन कारोबार र भाडा हेर्नुहोस्।",
          badges: [
            { en: "Deep dive", ne: "गहिरो विश्लेषण" },
            { en: "Basis check", ne: "आधार जाँच" },
          ],
        },
        monthsHeld,
        implied,
      ),
    );
  } else if (yearsHeld != null && yearsHeld >= 2 && roi != null && roi < 12) {
    cards.push(
      card(
        {
          id: "modest_stack",
          kind: "warning",
          icon: "alert-triangle",
          headlineEn: "Soft compounding — room to engineer upside",
          headlineNe: "मध्यम वृद्धि — माथि ल्याउने ठाउँ",
          bodyEn:
            "Modest cumulative appreciation — consider whether rent steps, light capex, or rezoning optionality could re-rate the asset without stretching leverage.",
          bodyNe:
            "जम्मा वृद्धि मध्यम — भाडा, हल्का लगानी वा जोनिङ्गले मूल्य बढाउन सक्छ।",
          whyEn:
            "Mid-single-digit to low-teens ROI over years often reflects sleepy operational profiles — scenario a modest renovation IRR against liquidity cost.",
          whyNe:
            "वर्षौं मध्यम ROI सञ्चालन सुस्त हुन सक्छ — मर्मत IRR र तरलता लागत तुलना गर्नुहोस्।",
          badges: [
            { en: "Capex scenarios", ne: "लगानी परिदृश्य" },
            { en: "Yield lift", ne: "प्रतिफल बढाउने" },
          ],
        },
        monthsHeld,
        implied,
      ),
    );
  }

  if (implied != null && implied < 2 && yearsHeld != null && yearsHeld >= 1) {
    cards.push(
      card(
        {
          id: "muted_implied",
          kind: "risk",
          icon: "activity",
          headlineEn: "Muted implied CAGR — defend the thesis",
          headlineNe: "कमजोर निहित CAGR — थिसिस रक्षा",
          bodyEn:
            "Implied annual appreciation is muted — stress-test downside, renovation upside, and whether the mark is stale versus micro-market velocity.",
          bodyNe:
            "निहित वार्षिक वृद्धि कमजोर — जोखिम, मर्मत वा पुरानो मूल्य जाँच गर्नुहोस्।",
          whyEn:
            "Sub-2% implied with meaningful seasoning can be benign in deflationary pockets or toxic if rents are rolling down — split nominal vs real drivers.",
          whyNe:
            "२% भन्दा कम निहित लामो समयमा क्षेत्र अनुसार ठीक वा खतरनाक — नोमिनल र वास्तविक कारक छुट्याउनुहोस्।",
          badges: [
            { en: "Stress NAV", ne: "NAV तनाव" },
            { en: "Rent trajectory", ne: "भाडा मार्ग" },
          ],
        },
        monthsHeld,
        implied,
      ),
    );
  }

  if (!cards.length) {
    cards.push(
      card(
        {
          id: "balanced_hold",
          kind: "strategy",
          icon: "lightbulb",
          headlineEn: "Strategy — balanced book, refine the narrative",
          headlineNe: "रणनीति — सन्तुलित पुस्तक",
          bodyEn:
            "Property may perform better as a long-term holding asset rather than a short-term flip. Your marks look internally consistent — tighten dates and comparables as new data lands.",
          bodyNe:
            "सम्पत्ति छोटो फ्लिपभन्दा दीर्घकालीन होल्डिङ्गका लागि उपयुक्त हुन सक्छ। मिति र तुलना नयाँ डेटासँग अद्यावधिक राख्नुहोस्।",
          whyEn:
            "When no extreme flags fire, we anchor on process: refresh estimates quarterly, tag leverage, and keep liquidity buffers for opportunistic upgrades.",
          whyNe:
            "अत्यधिक संकेत नभए प्रक्रियामा टिक्नुहोस्: त्रैमासिक अनुमान, ऋण ट्याग, तरलता बफर।",
          badges: [
            { en: "Hold discipline", ne: "होल्ड अनुशासन" },
            { en: "Data refresh", ne: "डेटा अद्यावधिक" },
          ],
        },
        monthsHeld,
        implied,
      ),
    );
  }

  const unique = new Map<string, ReAiWealthInsightCard>();
  for (const c of cards) {
    c.confidence = clamp(Math.round(c.confidence), 41, 97);
    unique.set(c.id, c);
  }
  const finalCards = [...unique.values()].slice(0, 5);

  return {
    sentiment: sentimentPack.sentiment,
    sentimentLabelEn: sentimentPack.labelEn,
    sentimentLabelNe: sentimentPack.labelNe,
    sentimentMeter: sentimentPack.meter,
    cards: finalCards,
  };
}

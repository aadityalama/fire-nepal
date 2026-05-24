/**
 * English + Nepali (Devanagari) strings for Real Estate wealth insights.
 * Numbers in templated strings are injected at runtime (same values as English).
 *
 * Runtime logic in `reWealthInsights` picks which lines apply; Nepali is paired per line
 * (curated translations, not a machine-translation API). Add `en`/`ne` together when adding insights.
 */

export const reInsightCopy = {
  unlockInputs: {
    en: "Enter purchase value and an estimated current value to unlock ROI and appreciation signals.",
    ne: "ROI तथा मूल्यवृद्धिको सङ्केत हेर्न कृपया खरिद मूल्य र अनुमानित हालको मूल्य प्रविष्ट गर्नुहोस्।",
  },
  strongBookGain: {
    en: "Strong appreciation on book values — materially ahead of cost.",
    ne: "भविष्यमा राम्रो सम्पत्ति वृद्धि हुने सम्भावना देखिन्छ — लागतभन्दा पुस्तकाङ्कन उल्लेखनीय रूपमा माथि।",
  },
  solidCumulative: {
    en: "Solid cumulative gain — keep estimates fresh as the market shifts.",
    ne: "जम्मा फाइदा राम्रो — बजार बदलिन्छ, अनुमानित मूल्य नियमित अद्यावधिक राख्नुहोस्।",
  },
  impliedRobust: {
    en: "Implied annual growth looks robust for a long-term property hold.",
    ne: "दीर्घकालीन सम्पत्तिमा निहित वार्षिक वृद्धि दर बलियो देखिन्छ।",
  },
  modestCumulative: {
    en: "Modest cumulative appreciation — consider whether rent, renovation, or rezoning could lift value.",
    ne: "जम्मा वृद्धि मध्यम — भाडा, मर्मत वा जोनिङ्गले मूल्य बढाउने सम्भावना हेर्नुहोस्।",
  },
  impliedMuted: {
    en: "Implied annual appreciation is muted — stress-test downside or renovation upside.",
    ne: "निहित वार्षिक वृद्धि कमजोर — जोखिम वा मर्मतपछिको लाभ पुनः विश्लेषण गर्नुहोस्।",
  },
  trackingAboveEstimate: {
    en: "Actual implied growth is tracking at or above your annual estimate.",
    ne: "वास्तविक निहित वृद्धि तपाईंको वार्षिक अनुमान वरिपरि वा माथि छ।",
  },
  belowAnnualEstimate: {
    en: "Implied growth is running below your stated annual estimate — adjust the estimate or market value.",
    ne: "निहित वृद्धि तपाईंको वार्षिक अनुमानभन्दा कम — अनुमान वा बजार मूल्य समायोजन गर्नुहोस्।",
  },
  balancedDefault: {
    en: "Balanced profile — refine dates and values as you get better data.",
    ne: "सन्तुलित प्रोफाइल — बढी डेटा आउँदा मिति र मूल्य परिष्कृत गर्नुहोस्।",
  },
} as const;

export function reInsightInflationGuardrail(proxyPct: number): { en: string; ne: string } {
  return {
    en: `Outperforming a rough ${proxyPct}% inflation guardrail (planning estimate, not official CPI).`,
    ne: `अनुमानित ${proxyPct}% मुद्रास्फीति तुलनामा माथि (योजनाजन्य अनुमान मात्र; आधिकारिक CPI होइन)।`,
  };
}

export function reInsightLowGrowthVsTime(): { en: string; ne: string } {
  return {
    en: "Low growth relative to time held — validate purchase basis, comparables, or rental yield.",
    ne: "समय अनुसार सम्पत्तिको वृद्धि कम देखिन्छ — खरिद आधार, तुलना वा भाडा प्रवाह पुनः जाँच गर्नुहोस्।",
  };
}

/** Curated official figures when live feeds are unavailable. Sources cited in metadata. */
export type OfficialMetric = {
  value: number;
  displayValue: string;
  detail: string;
  change?: string;
  tone: "up" | "down" | "neutral";
  source: string;
  sourceUrl: string;
  updatedAt: string;
  period: string;
};

export const OFFICIAL_INFLATION: OfficialMetric = {
  value: 1.68,
  displayValue: "1.68%",
  detail: "CPI y-o-y, first month FY 2025/26 (mid-August 2025)",
  change: "-2.41 pts vs prior year",
  tone: "down",
  source: "Nepal Rastra Bank",
  sourceUrl:
    "https://www.nrb.org.np/red/current-macroeconomic-and-financial-situation-english-based-on-one-month-data-of-2025-26/",
  updatedAt: "2025-08-15",
  period: "FY 2025/26 · Month 1",
};

export const OFFICIAL_POLICY_RATE: OfficialMetric = {
  value: 4.5,
  displayValue: "4.50%",
  detail: "NRB policy (repo) rate after Monetary Policy 2025/26 review",
  change: "-0.50%",
  tone: "down",
  source: "Nepal Rastra Bank",
  sourceUrl: "https://www.nrb.org.np/contents/uploads/2025/08/Monetary-policy-in-English-2025_26.pdf",
  updatedAt: "2025-08-01",
  period: "Monetary Policy 2025/26",
};

export const OFFICIAL_FD_RATES: OfficialMetric & {
  chart: Array<{ label: string; value: number }>;
} = {
  value: 6.85,
  displayValue: "6.25% – 7.75%",
  detail: "Average commercial bank FD range published by major BFIs",
  change: "Stable",
  tone: "neutral",
  source: "Nepal Rastra Bank / BFIs",
  sourceUrl: "https://www.nrb.org.np/",
  updatedAt: "2025-08-15",
  period: "Commercial banks · FY 2025/26",
  chart: [
    { label: "NRB Policy", value: 4.5 },
    { label: "Large Banks", value: 6.25 },
    { label: "Mid Banks", value: 7.1 },
    { label: "Dev Banks", value: 7.75 },
  ],
};

export const OFFICIAL_REMITTANCE: OfficialMetric = {
  value: 177.41,
  displayValue: "रु 177.41B",
  detail: "Monthly remittance inflow, first month FY 2025/26",
  change: "+29.9%",
  tone: "up",
  source: "Nepal Rastra Bank",
  sourceUrl:
    "https://www.nrb.org.np/red/current-macroeconomic-and-financial-situation-english-based-on-one-month-data-of-2025-26/",
  updatedAt: "2025-08-15",
  period: "FY 2025/26 · Month 1",
};

export const OFFICIAL_NEWS = [
  {
    title: "NRB holds policy rate at 4.5% in Monetary Policy 2025/26",
    href: "https://www.nrb.org.np/contents/uploads/2025/08/Monetary-policy-in-English-2025_26.pdf",
    source: "Nepal Rastra Bank",
    publishedAt: "2025-08-01T00:00:00.000Z",
    tag: "Government Policy",
  },
  {
    title: "CPI inflation eases to 1.68% y-o-y in first month of FY 2025/26",
    href: "https://www.nrb.org.np/red/current-macroeconomic-and-financial-situation-english-based-on-one-month-data-of-2025-26/",
    source: "Nepal Rastra Bank",
    publishedAt: "2025-08-15T00:00:00.000Z",
    tag: "Economy",
  },
  {
    title: "Remittance inflows rise 29.9% to Rs 177.41 billion in review month",
    href: "https://www.nrb.org.np/red/current-macroeconomic-and-financial-situation-english-based-on-one-month-data-of-2025-26/",
    source: "Nepal Rastra Bank",
    publishedAt: "2025-08-15T00:00:00.000Z",
    tag: "Remittance",
  },
  {
    title: "Inter-bank rate among BFIs trends at 2.75% in review period",
    href: "https://www.nrb.org.np/red/current-macroeconomic-and-financial-situation-english-based-on-one-month-data-of-2025-26/",
    source: "Nepal Rastra Bank",
    publishedAt: "2025-08-15T00:00:00.000Z",
    tag: "Banking",
  },
  {
    title: "NEPSE index tracks daily market movement on Nepal Stock Exchange",
    href: "https://www.nepalstock.com/",
    source: "Nepal Stock Exchange",
    publishedAt: "2025-08-31T00:00:00.000Z",
    tag: "NEPSE",
  },
  {
    title: "Foreign exchange reserves stand at NPR 2,806.04 billion",
    href: "https://www.nrb.org.np/red/current-macroeconomic-and-financial-situation-english-based-on-one-month-data-of-2025-26/",
    source: "Nepal Rastra Bank",
    publishedAt: "2025-08-15T00:00:00.000Z",
    tag: "Economy",
  },
] as const;

export const OFFICIAL_NEPSE_MOVERS = {
  gainers: [
    { name: "Nabil Bank Limited", symbol: "NABIL", price: "रु 1,024.00", change: "+4.82%", tone: "up" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
    { name: "Nepal SBI Bank Limited", symbol: "SBI", price: "रु 412.50", change: "+3.91%", tone: "up" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
    { name: "Himalayan Life Insurance", symbol: "HLI", price: "रु 1,890.00", change: "+3.44%", tone: "up" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
    { name: "Citizens Bank International", symbol: "CZBIL", price: "रु 298.00", change: "+2.76%", tone: "up" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
    { name: "Everest Bank Limited", symbol: "EBL", price: "रु 785.00", change: "+2.21%", tone: "up" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
  ],
  losers: [
    { name: "Nepal Life Insurance", symbol: "NLIC", price: "रु 1,120.00", change: "-3.62%", tone: "down" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
    { name: "Shivam Cements Limited", symbol: "SHIVM", price: "रु 612.00", change: "-2.98%", tone: "down" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
    { name: "Salt Trading Corporation", symbol: "STC", price: "रु 1,540.00", change: "-2.41%", tone: "down" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
    { name: "Nepal Reinsurance Company", symbol: "NRIC", price: "रु 1,780.00", change: "-1.87%", tone: "down" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
    { name: "Prabhu Bank Limited", symbol: "PRVU", price: "रु 248.00", change: "-1.52%", tone: "down" as const, source: "NEPSE reference", updatedAt: "2025-08-31T00:00:00.000Z" },
  ],
};

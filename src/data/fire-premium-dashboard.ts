/** Dummy portfolio data for the premium FIRE Nepal dashboard demo. */

export const USD_PER_NPR = 0.007238; // illustrative spot rate

export function nprToUsdLabel(npr: number): string {
  const usd = npr * USD_PER_NPR;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd >= 100_000 ? 0 : 2,
  }).format(usd);
}

export function formatNpr(npr: number, compact = false): string {
  if (compact && npr >= 1_000_000) {
    const m = npr / 1_000_000;
    return `NPR ${m.toFixed(2)}M`;
  }
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(npr);
}

export const premiumSummary = {
  totalNetWorthNpr: 24_560_000,
  monthlyPassiveIncomeNpr: 523_000,
  fireProgressPct: 16.4,
  fireNumberNpr: 150_000_000,
  estimatedFiDate: "Dec 2046",
  estimatedFiCountdown: "21 years, 7 months left",
  netWorthGrowthPct: 4.7,
  passiveGrowthPct: 6.3,
  fireProgressDeltaPct: 1.2,
  fireNumberProgressNote: "16.4% of your FIRE number",
  totalAssetsNpr: 28_200_000,
  totalLiabilitiesNpr: 3_640_000,
  savingsRatePct: 45.6,
  activeIncomeMonthlyNpr: 1_180_000,
};

export type NetWorthPoint = {
  label: string;
  nw: number;
  milestone?: string;
};

export const netWorthSeries: Record<"monthly" | "yearly" | "all", NetWorthPoint[]> = {
  monthly: [
    { label: "Jan", nw: 22_100_000 },
    { label: "Feb", nw: 22_450_000 },
    { label: "Mar", nw: 22_900_000 },
    { label: "Apr", nw: 23_200_000 },
    { label: "May", nw: 23_650_000 },
    { label: "Jun", nw: 24_100_000 },
    { label: "Jul", nw: 24_560_000, milestone: "On pace" },
  ],
  yearly: [
    { label: "2019", nw: 8_200_000 },
    { label: "2020", nw: 10_400_000 },
    { label: "2021", nw: 12_800_000 },
    { label: "2022", nw: 14_900_000 },
    { label: "2023", nw: 18_200_000 },
    { label: "2024", nw: 21_500_000, milestone: "First 10M+ year" },
    { label: "2025", nw: 24_560_000, milestone: "YTD high" },
  ],
  all: [
    { label: "2016", nw: 2_400_000 },
    { label: "2017", nw: 3_800_000 },
    { label: "2018", nw: 5_600_000 },
    { label: "2019", nw: 8_200_000 },
    { label: "2020", nw: 10_400_000 },
    { label: "2021", nw: 12_800_000 },
    { label: "2022", nw: 14_900_000 },
    { label: "2023", nw: 18_200_000 },
    { label: "2024", nw: 21_500_000, milestone: "First 1M (Oct 2024)" },
    { label: "2025", nw: 24_560_000, milestone: "2M Milestone (Mar 2025)" },
  ],
};

export type AllocationSlice = {
  name: string;
  valueNpr: number;
  color: string;
};

export const allocationSlices: AllocationSlice[] = [
  { name: "Investments", valueNpr: 9_800_000, color: "#38bdf8" },
  { name: "Banking & Cash", valueNpr: 6_200_000, color: "#818cf8" },
  { name: "Gold & Silver", valueNpr: 2_400_000, color: "#fbbf24" },
  { name: "Real Estate", valueNpr: 4_800_000, color: "#c084fc" },
  { name: "Vehicles", valueNpr: 980_000, color: "#fb7185" },
  { name: "Others", valueNpr: 380_000, color: "#34d399" },
];

export type PortfolioRow = {
  id: string;
  name: string;
  type: string;
  category: string;
  purchaseNpr: number;
  currentNpr: number;
  cagrPct: number;
  allocationPct: number;
};

export const portfolioRows: PortfolioRow[] = [
  {
    id: "1",
    name: "Tata Sumo",
    type: "Vehicle",
    category: "Transport",
    purchaseNpr: 1_850_000,
    currentNpr: 980_000,
    cagrPct: -8.2,
    allocationPct: 4.0,
  },
  {
    id: "2",
    name: "Global IME Bank",
    type: "Bank",
    category: "Cash",
    purchaseNpr: 4_200_000,
    currentNpr: 6_200_000,
    cagrPct: 11.4,
    allocationPct: 25.2,
  },
  {
    id: "3",
    name: "Gold",
    type: "Commodity",
    category: "Hedge",
    purchaseNpr: 1_600_000,
    currentNpr: 2_400_000,
    cagrPct: 14.1,
    allocationPct: 9.8,
  },
  {
    id: "4",
    name: "SS Fund",
    type: "Investment",
    category: "Equity MF",
    purchaseNpr: 5_400_000,
    currentNpr: 9_800_000,
    cagrPct: 16.8,
    allocationPct: 39.9,
  },
  {
    id: "5",
    name: "Apartment in Seoul",
    type: "Real Estate",
    category: "International",
    purchaseNpr: 42_000_000,
    currentNpr: 48_500_000,
    cagrPct: 7.3,
    allocationPct: 21.1,
  },
];

export const marketOverview = [
  { label: "NEPSE Index", value: "2,684.12", changePct: 0.42 },
  { label: "USD / NPR", value: "138.15", changePct: -0.08 },
  { label: "KRW / NPR", value: "0.095", changePct: 0.15 },
  { label: "Gold (24K / tola)", value: "NPR 182,400", changePct: 0.62 },
  { label: "Silver (/ tola)", value: "NPR 2,180", changePct: -0.31 },
];

export const aiCoachInsight =
  "Passive income coverage improved 6.3% this month. Consider trimming concentrated equity in SS Fund by 3–5% into short-duration NPR instruments to smooth Korea–Nepal repatriation volatility.";

export const sparklineNetWorth = [19.2, 19.8, 20.4, 21.1, 22.0, 22.9, 23.4, 24.56].map((m) => m * 1_000_000);
export const sparklinePassive = [410, 425, 438, 455, 472, 488, 502, 523].map((k) => k * 1000);
export const sparklineFire = [12.1, 12.8, 13.4, 14.0, 14.9, 15.3, 15.9, 16.4];
export const sparklineFireNumber = [132, 134, 136, 138, 142, 145, 148, 150].map((m) => m * 1_000_000);

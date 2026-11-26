/**
 * Emergency Fund 3.0 copy — English, Nepali, Korean.
 * Uses the same language codes as the homepage language system (en / np / kr).
 */

import type { LanguageCode } from "@/lib/i18n/homepage-translations";

export type EmergencyFundCopy = {
  backToFinance: string;
  title: string;
  subtitle: string;
  settings: string;
  budgetConnected: string;
  budgetMissing: string;
  budgetPartial: string;
  openBudgetPlanner: string;
  createBudget: string;
  onboardingTitle: string;
  onboardingBody: string;
  fullLifestyle: string;
  essentialOnly: string;
  fullLifestyleDesc: string;
  essentialOnlyDesc: string;
  fullLifestyleNote: string;
  protectionPeriod: string;
  customPeriod: string;
  addFunds: string;
  withdraw: string;
  target: string;
  currentReserve: string;
  fundingProgress: string;
  safetyRunway: string;
  remainingShortfall: string;
  excessReserve: string;
  monthlyBasis: string;
  budgetIntegration: string;
  originalMonthly: string;
  yearlyTotal: string;
  annualMonthlyEq: string;
  annualAlreadyIncluded: string;
  additionalAnnual: string;
  effectiveMonthly: string;
  essentialSelected: string;
  excludedCategories: string;
  finalBasis: string;
  activePeriod: string;
  lastSync: string;
  safetyJourney: string;
  fundingPlan: string;
  setContributionPrompt: string;
  monthlyContribution: string;
  targetDeadline: string;
  requiredContribution: string;
  estimatedMonths: string;
  estimatedCompletion: string;
  fullyFunded: string;
  simulator: string;
  simulatorEstimateNote: string;
  annualPayments: string;
  growthHistory: string;
  insights: string;
  approxDays: string;
  retry: string;
  syncError: string;
  cachedData: string;
  openingReserve: string;
  contributionNote: string;
  withdrawalNote: string;
  saveTransaction: string;
  linkSavings: string;
  noTransactions: string;
  guidanceTitle: string;
  guidanceHint: string;
};

const en: EmergencyFundCopy = {
  backToFinance: "Back to Finance",
  title: "Emergency Fund",
  subtitle: "Your financial safety, powered by your budget.",
  settings: "Settings",
  budgetConnected: "Budget Planner connected",
  budgetMissing: "Budget required",
  budgetPartial: "Partial budget",
  openBudgetPlanner: "Open Budget Planner",
  createBudget: "Create Budget",
  onboardingTitle: "Create your Monthly Budget",
  onboardingBody: "Create your Monthly Budget to automatically calculate your Emergency Fund.",
  fullLifestyle: "Full Lifestyle",
  essentialOnly: "Essential Only",
  fullLifestyleDesc: "Protect your complete planned lifestyle using your Monthly and Yearly Budget.",
  essentialOnlyDesc: "Protect only the financial commitments you consider essential during an emergency.",
  fullLifestyleNote:
    "This mode may include savings, investments and discretionary expenses that could be paused during an actual emergency.",
  protectionPeriod: "Protection period",
  customPeriod: "Custom",
  addFunds: "Add Funds",
  withdraw: "Withdraw",
  target: "Emergency Fund Target",
  currentReserve: "Current Emergency Reserve",
  fundingProgress: "Funding Progress",
  safetyRunway: "Safety Runway",
  remainingShortfall: "Remaining Shortfall",
  excessReserve: "Excess Reserve",
  monthlyBasis: "Monthly protection basis",
  budgetIntegration: "Budget Integration",
  originalMonthly: "Original Monthly Budget",
  yearlyTotal: "Yearly Budget Total",
  annualMonthlyEq: "Annual Monthly Equivalent",
  annualAlreadyIncluded: "Annual Allocations Already Included",
  additionalAnnual: "Additional Annual Monthly Allocations",
  effectiveMonthly: "Effective Monthly Budget",
  essentialSelected: "Essential Selected Budget",
  excludedCategories: "Excluded Budget Categories",
  finalBasis: "Final Emergency Fund Monthly Basis",
  activePeriod: "Active Budget Period",
  lastSync: "Last Successful Synchronization",
  safetyJourney: "Financial Safety Journey",
  fundingPlan: "Personal Funding Plan",
  setContributionPrompt: "Set your monthly contribution to create a personal funding plan.",
  monthlyContribution: "Monthly Contribution",
  targetDeadline: "Target Deadline",
  requiredContribution: "Required monthly contribution",
  estimatedMonths: "Estimated months remaining",
  estimatedCompletion: "Estimated completion",
  fullyFunded: "Emergency fund fully funded",
  simulator: "Emergency Simulator",
  simulatorEstimateNote: "All simulation results are estimates and do not change your real balances.",
  annualPayments: "Upcoming Annual Payments",
  growthHistory: "Growth & History",
  insights: "Smart Insights",
  approxDays: "approx. days",
  retry: "Retry",
  syncError: "Could not sync Emergency Fund settings.",
  cachedData: "Showing previously cached data",
  openingReserve: "Opening emergency reserve",
  contributionNote: "Contribution note",
  withdrawalNote: "Withdrawal note",
  saveTransaction: "Save",
  linkSavings: "Link Savings Goal",
  noTransactions: "No contributions or withdrawals yet.",
  guidanceTitle: "Protection period guidance",
  guidanceHint: "Optional — does not change your selected period automatically.",
};

const np: EmergencyFundCopy = {
  ...en,
  backToFinance: "वित्तमा फर्कनुहोस्",
  title: "आपतकालीन कोष",
  subtitle: "तपाईंको बजेटबाट चल्ने आर्थिक सुरक्षा।",
  settings: "सेटिङ",
  budgetConnected: "बजेट प्लानर जडान भयो",
  budgetMissing: "बजेट आवश्यक",
  budgetPartial: "आंशिक बजेट",
  openBudgetPlanner: "बजेट प्लानर खोल्नुहोस्",
  createBudget: "बजेट बनाउनुहोस्",
  onboardingTitle: "आफ्नो मासिक बजेट बनाउनुहोस्",
  onboardingBody: "आपतकालीन कोष स्वतः गणना गर्न आफ्नो मासिक बजेट बनाउनुहोस्।",
  fullLifestyle: "पूर्ण जीवनशैली",
  essentialOnly: "आवश्यक मात्र",
  fullLifestyleDesc: "मासिक र वार्षिक बजेटबाट तपाईंको पूर्ण योजनाबद्ध जीवनशैली सुरक्षित गर्नुहोस्।",
  essentialOnlyDesc: "आपतकालमा आवश्यक ठान्ने वित्तीय दायित्व मात्र सुरक्षित गर्नुहोस्।",
  fullLifestyleNote:
    "यो मोडमा बचत, लगानी र ऐच्छिक खर्च समावेश हुन सक्छ जुन वास्तविक आपतकालमा रोक्न सकिन्छ।",
  protectionPeriod: "सुरक्षा अवधि",
  customPeriod: "कस्टम",
  addFunds: "रकम थप्नुहोस्",
  withdraw: "झिक्नुहोस्",
  target: "आपतकालीन कोष लक्ष्य",
  currentReserve: "हालको आपतकालीन जगेडा",
  fundingProgress: "कोष प्रगति",
  safetyRunway: "सुरक्षा अवधि",
  remainingShortfall: "बाँकी कमी",
  excessReserve: "अतिरिक्त जगेडा",
  monthlyBasis: "मासिक सुरक्षा आधार",
  budgetIntegration: "बजेट एकीकरण",
  safetyJourney: "आर्थिक सुरक्षा यात्रा",
  fundingPlan: "व्यक्तिगत कोष योजना",
  setContributionPrompt: "व्यक्तिगत कोष योजना बनाउन मासिक योगदान सेट गर्नुहोस्।",
  monthlyContribution: "मासिक योगदान",
  targetDeadline: "लक्ष्य म्याद",
  requiredContribution: "आवश्यक मासिक योगदान",
  estimatedMonths: "अनुमानित बाँकी महिना",
  estimatedCompletion: "अनुमानित समाप्ति",
  fullyFunded: "आपतकालीन कोष पूर्ण रूपमा भरिएको छ",
  simulator: "आपतकालीन सिमुलेटर",
  simulatorEstimateNote: "सबै सिमुलेशन परिणाम अनुमान हुन् र वास्तविक मौज्दात परिवर्तन गर्दैनन्।",
  annualPayments: "आगामी वार्षिक भुक्तानीहरू",
  growthHistory: "वृद्धि र इतिहास",
  insights: "स्मार्ट अन्तर्दृष्टि",
  approxDays: "लगभग दिन",
  retry: "पुनः प्रयास",
  syncError: "आपतकालीन कोष सेटिङ सिंक गर्न सकिएन।",
  cachedData: "अघिल्लो क्यास डेटा देखाइँदै",
  openingReserve: "सुरुको आपतकालीन जगेडा",
  contributionNote: "योगदान नोट",
  withdrawalNote: "निकासी नोट",
  saveTransaction: "सेभ गर्नुहोस्",
  linkSavings: "बचत लक्ष्य जोड्नुहोस्",
  noTransactions: "अहिलेसम्म योगदान वा निकासी छैन।",
  guidanceTitle: "सुरक्षा अवधि मार्गदर्शन",
  guidanceHint: "ऐच्छिक — चयन गरिएको अवधि स्वतः परिवर्तन हुँदैन।",
};

const kr: EmergencyFundCopy = {
  ...en,
  backToFinance: "금융으로 돌아가기",
  title: "비상 자금",
  subtitle: "예산으로 자동 계산되는 재무 안전망.",
  settings: "설정",
  budgetConnected: "예산 플래너 연결됨",
  budgetMissing: "예산 필요",
  budgetPartial: "부분 예산",
  openBudgetPlanner: "예산 플래너 열기",
  createBudget: "예산 만들기",
  onboardingTitle: "월간 예산을 만드세요",
  onboardingBody: "비상 자금을 자동으로 계산하려면 월간 예산을 만드세요.",
  fullLifestyle: "전체 생활비",
  essentialOnly: "필수만",
  fullLifestyleDesc: "월간·연간 예산으로 계획된 전체 생활 수준을 보호합니다.",
  essentialOnlyDesc: "비상 시 반드시 유지할 필수 재정 항목만 보호합니다.",
  fullLifestyleNote:
    "이 모드에는 비상 시 일시 중단할 수 있는 저축·투자·재량 지출이 포함될 수 있습니다.",
  protectionPeriod: "보호 기간",
  customPeriod: "직접 설정",
  addFunds: "입금",
  withdraw: "출금",
  target: "비상 자금 목표",
  currentReserve: "현재 비상 준비금",
  fundingProgress: "적립 진행률",
  safetyRunway: "안전 기간",
  remainingShortfall: "남은 부족분",
  excessReserve: "초과 준비금",
  monthlyBasis: "월간 보호 기준",
  budgetIntegration: "예산 연동",
  safetyJourney: "재무 안전 여정",
  fundingPlan: "개인 적립 계획",
  setContributionPrompt: "개인 적립 계획을 만들려면 월 기여금을 설정하세요.",
  monthlyContribution: "월 기여금",
  targetDeadline: "목표 기한",
  requiredContribution: "필요 월 기여금",
  estimatedMonths: "예상 남은 개월",
  estimatedCompletion: "예상 완료",
  fullyFunded: "비상 자금이 목표에 도달했습니다",
  simulator: "비상 시뮬레이터",
  simulatorEstimateNote: "모든 시뮬레이션 결과는 추정치이며 실제 잔액을 변경하지 않습니다.",
  annualPayments: "다가오는 연간 납입",
  growthHistory: "성장 및 기록",
  insights: "스마트 인사이트",
  approxDays: "약 일수",
  retry: "다시 시도",
  syncError: "비상 자금 설정을 동기화할 수 없습니다.",
  cachedData: "이전에 캐시된 데이터를 표시 중",
  openingReserve: "기초 비상 준비금",
  contributionNote: "입금 메모",
  withdrawalNote: "출금 메모",
  saveTransaction: "저장",
  linkSavings: "저축 목표 연결",
  noTransactions: "아직 입금 또는 출금 내역이 없습니다.",
  guidanceTitle: "보호 기간 안내",
  guidanceHint: "선택 사항 — 선택한 기간을 자동으로 바꾸지 않습니다.",
};

export const emergencyFundTranslations: Record<"en" | "np" | "kr", EmergencyFundCopy> = {
  en,
  np,
  kr,
};

export function getEmergencyFundCopy(language: LanguageCode | string | null | undefined): EmergencyFundCopy {
  if (language === "np") return emergencyFundTranslations.np;
  if (language === "kr") return emergencyFundTranslations.kr;
  return emergencyFundTranslations.en;
}

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
  grossMonthly: string;
  totalNormalized: string;
  efContributionExcluded: string;
  otherUserExclusions: string;
  provisionalWarning: string;
  reviewBudget: string;
  importPlannedContribution: string;
  inclusionIncluded: string;
  inclusionExcludedUser: string;
  inclusionEmergency: string;
  inclusionAlready: string;
  inclusionProjection: string;
  inclusionProvisional: string;
  resolveSeparate: string;
  resolveAlreadyIncluded: string;
  resolveLinked: string;
  resetDecision: string;
  inclusionUserDecision: string;
  inclusionAutomatic: string;
  ineligibleEssentialWarning: string;
  calculationProvisional: string;
  calculationVerified: string;
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
  originalMonthly: "Monthly Budget",
  yearlyTotal: "Yearly Budget",
  annualMonthlyEq: "Annual Monthly Equivalent",
  annualAlreadyIncluded: "Annual Allocations Already Included",
  additionalAnnual: "Annual Monthly Allocations",
  effectiveMonthly: "Total Normalized Budget",
  essentialSelected: "Essential Selected Budget",
  excludedCategories: "Excluded Budget Categories",
  finalBasis: "Final Monthly Protection Basis",
  grossMonthly: "Gross Monthly Budget",
  totalNormalized: "Total Normalized Budget",
  efContributionExcluded: "Emergency Fund Contribution Excluded",
  otherUserExclusions: "Other User Exclusions",
  provisionalWarning:
    "Some yearly allocations share a category with monthly lines but amounts differ. They are included in protection sizing — review your Budget Planner to confirm there is no double counting.",
  reviewBudget: "Review in Budget Planner",
  importPlannedContribution: "Use budgeted Emergency contribution in Funding Plan",
  inclusionIncluded: "Included",
  inclusionExcludedUser: "Excluded by user",
  inclusionEmergency: "Emergency contribution excluded",
  inclusionAlready: "Already included annual allocation",
  inclusionProjection: "Yearly projection (not added)",
  inclusionProvisional: "Included — review recommended",
  resolveSeparate: "Separate annual obligation",
  resolveAlreadyIncluded: "Already in monthly budget",
  resolveLinked: "Link to monthly allocation",
  resetDecision: "Reset review decision",
  inclusionUserDecision: "User decision",
  inclusionAutomatic: "Automatic",
  ineligibleEssentialWarning:
    "Some previously selected essential items are no longer eligible (for example, marked already included). Your selections were kept — review or reset them.",
  calculationProvisional: "Calculation provisional — unresolved allocations remain",
  calculationVerified: "Budget normalization verified",
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
  grossMonthly: "कुल मासिक बजेट",
  totalNormalized: "कुल सामान्यीकृत बजेट",
  efContributionExcluded: "आपतकालीन कोष योगदान हटाइएको",
  otherUserExclusions: "अन्य प्रयोगकर्ता बहिष्करण",
  provisionalWarning:
    "केही वार्षिक विनियोजन मासिक श्रेणीसँग मिल्छ तर रकम फरक छ। सुरक्षा गणनामा समावेश छ — दोहोरो गणना नहोस् भनी बजेट प्लानर समीक्षा गर्नुहोस्।",
  reviewBudget: "बजेट प्लानरमा समीक्षा गर्नुहोस्",
  importPlannedContribution: "बजेटको आपतकालीन योगदान कोष योजनामा प्रयोग गर्नुहोस्",
  inclusionIncluded: "समावेश",
  inclusionExcludedUser: "प्रयोगकर्ताद्वारा बहिष्कृत",
  inclusionEmergency: "आपतकालीन योगदान बहिष्कृत",
  inclusionAlready: "पहिले नै समावेश वार्षिक विनियोजन",
  inclusionProjection: "वार्षिक प्रक्षेपण (थपिएन)",
  inclusionProvisional: "समावेश — समीक्षा सिफारिस",
  resolveSeparate: "छुट्टै वार्षिक दायित्व",
  resolveAlreadyIncluded: "मासिक बजेटमा पहिले नै समावेश",
  resolveLinked: "मासिक विनियोजनसँग जोड्नुहोस्",
  resetDecision: "समीक्षा निर्णय रिसेट गर्नुहोस्",
  inclusionUserDecision: "प्रयोगकर्ता निर्णय",
  inclusionAutomatic: "स्वचालित",
  ineligibleEssentialWarning:
    "पहिले चयन गरिएका केही आवश्यक वस्तुहरू अब योग्य छैनन्। तपाईंका चयनहरू सुरक्षित छन् — समीक्षा वा रिसेट गर्नुहोस्।",
  calculationProvisional: "गणना अस्थायी — अनसुलझे विनियोजन बाँकी",
  calculationVerified: "बजेट सामान्यीकरण प्रमाणित",
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
  grossMonthly: "총 월간 예산",
  totalNormalized: "정규화된 총 예산",
  efContributionExcluded: "비상자금 기여금 제외",
  otherUserExclusions: "기타 사용자 제외",
  provisionalWarning:
    "일부 연간 항목이 월간 카테고리와 같지만 금액이 다릅니다. 보호 계산에는 포함됩니다 — 이중 계산이 없는지 예산 플래너에서 확인하세요.",
  reviewBudget: "예산 플래너에서 검토",
  importPlannedContribution: "예산된 비상자금 기여금을 적립 계획에 사용",
  inclusionIncluded: "포함",
  inclusionExcludedUser: "사용자가 제외",
  inclusionEmergency: "비상자금 기여금 제외",
  inclusionAlready: "이미 포함된 연간 배분",
  inclusionProjection: "연간 투영(추가 안 함)",
  inclusionProvisional: "포함 — 검토 권장",
  resolveSeparate: "별도 연간 의무",
  resolveAlreadyIncluded: "월간 예산에 이미 포함",
  resolveLinked: "월간 배분에 연결",
  resetDecision: "검토 결정 초기화",
  inclusionUserDecision: "사용자 결정",
  inclusionAutomatic: "자동",
  ineligibleEssentialWarning:
    "이전에 선택한 필수 항목 중 일부가 더 이상 적용되지 않습니다. 선택은 유지되었습니다 — 검토하거나 초기화하세요.",
  calculationProvisional: "계산 잠정 — 미해결 배분 남음",
  calculationVerified: "예산 정규화 확인됨",
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

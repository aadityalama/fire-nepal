import type { LanguageCode } from "@/lib/i18n/homepage-translations";
import type { EmergencyDataSourceLabel, FinancialSafetyStatus } from "@/lib/emergency-fund/types";

export type EmergencyFundCopy = {
  title: string;
  subtitle: string;
  backToFinance: string;
  loading: string;
  safetyOverview: string;
  target: string;
  currentReserve: string;
  fundingProgress: string;
  safetyStatus: string;
  syncedData: string;
  monthlyNetIncome: string;
  actualMonthlyExpenses: string;
  essentialAverage: string;
  plannedEssential: string;
  recommendedBasis: string;
  availableSurplus: string;
  dataSource: string;
  lastUpdated: string;
  calculationPeriod: string;
  protectionPeriod: string;
  customMonths: string;
  fundingPlan: string;
  remainingShortfall: string;
  recommendedContribution: string;
  allocation: string;
  estimatedCompletion: string;
  safetyRunway: string;
  growth: string;
  contributions: string;
  withdrawals: string;
  insights: string;
  quickActions: string;
  addContribution: string;
  recordWithdrawal: string;
  linkSavingsGoal: string;
  editSettings: string;
  reviewCalculation: string;
  onboardingTitle: string;
  onboardingBody: string;
  openCashflow: string;
  addExpenses: string;
  openBudget: string;
  fullyFunded: string;
  additionalSavingsRequired: string;
  estimateNote: string;
  categoryLimitation: string;
  contributionWarning: string;
  negativeCashflowHint: string;
  amount: string;
  date: string;
  note: string;
  save: string;
  cancel: string;
  openingBalance: string;
  noTransactions: string;
  linkedGoals: string;
  employmentType: string;
  dependents: string;
  incomeSources: string;
  manualExpense: string;
  overrideBasis: string;
  currencyFlag: string;
  safety: Record<FinancialSafetyStatus, string>;
};

const en: EmergencyFundCopy = {
  title: "Emergency Fund",
  subtitle:
    "Automatically sized from your income, expenses, and budget — a living financial safety buffer.",
  backToFinance: "Back to Finance",
  loading: "Loading emergency fund…",
  safetyOverview: "Financial Safety Overview",
  target: "Emergency Fund Target",
  currentReserve: "Current Emergency Reserve",
  fundingProgress: "Funding Progress",
  safetyStatus: "Financial Safety Status",
  syncedData: "Automatically Synced Financial Data",
  monthlyNetIncome: "Monthly net income",
  actualMonthlyExpenses: "Actual monthly expenses",
  essentialAverage: "Essential expense average",
  plannedEssential: "Planned essential budget",
  recommendedBasis: "Recommended expense basis",
  availableSurplus: "Available surplus",
  dataSource: "Data source",
  lastUpdated: "Last updated",
  calculationPeriod: "Calculation period",
  protectionPeriod: "Protection Period",
  customMonths: "Custom months",
  fundingPlan: "Funding Plan",
  remainingShortfall: "Remaining shortfall",
  recommendedContribution: "Recommended monthly contribution",
  allocation: "Surplus allocation",
  estimatedCompletion: "Estimated completion",
  safetyRunway: "Safety runway",
  growth: "Emergency Fund Growth",
  contributions: "Contributions",
  withdrawals: "Withdrawals",
  insights: "Smart Insights",
  quickActions: "Quick Actions",
  addContribution: "Add Contribution",
  recordWithdrawal: "Record Withdrawal",
  linkSavingsGoal: "Link Savings Goal",
  editSettings: "Edit Settings",
  reviewCalculation: "Review Calculation",
  onboardingTitle: "Connect your finance data",
  onboardingBody:
    "We need reliable income, expenses, or budget data before recommending an emergency fund target. Nothing is assumed as zero.",
  openCashflow: "Open Cashflow",
  addExpenses: "Add Expenses",
  openBudget: "Open Budget",
  fullyFunded: "Emergency Fund Fully Funded",
  additionalSavingsRequired: "Additional savings required",
  estimateNote: "Completion dates are estimates assuming consistent income, expenses, and contributions.",
  categoryLimitation:
    "Some expenses could not be reliably classified as essential. Confirm or adjust your expense basis.",
  contributionWarning: "This contribution exceeds your available financial capacity.",
  negativeCashflowHint: "Prioritize cashflow recovery before increasing emergency contributions.",
  amount: "Amount",
  date: "Date",
  note: "Note",
  save: "Save",
  cancel: "Cancel",
  openingBalance: "Opening balance",
  noTransactions: "No contributions or withdrawals yet.",
  linkedGoals: "Linked savings goals",
  employmentType: "Employment type",
  dependents: "Dependents",
  incomeSources: "Income sources",
  manualExpense: "Manual monthly expense",
  overrideBasis: "Override expense basis",
  currencyFlag: "Exchange-rate data incomplete or stale — amounts may be understated.",
  safety: {
    critical: "Critical",
    high_risk: "High Risk",
    building_safety: "Building Safety",
    strong_protection: "Strong Protection",
    extended_protection: "Extended Protection",
  },
};

const np: EmergencyFundCopy = {
  ...en,
  title: "आपतकालीन कोष",
  subtitle: "आय, खर्च र बजेटबाट स्वचालित गणना हुने वित्तीय सुरक्षा बफर।",
  backToFinance: "वित्तमा फर्कनुहोस्",
  loading: "आपतकालीन कोष लोड हुँदै…",
  safetyOverview: "वित्तीय सुरक्षा अवलोकन",
  target: "आपतकालीन कोष लक्ष्य",
  currentReserve: "हालको आपतकालीन जगेडा",
  fundingProgress: "कोष प्रगति",
  safetyStatus: "वित्तीय सुरक्षा अवस्था",
  syncedData: "स्वतः समक्रमण वित्तीय डाटा",
  monthlyNetIncome: "मासिक खुद आय",
  actualMonthlyExpenses: "वास्तविक मासिक खर्च",
  essentialAverage: "आवश्यक खर्च औसत",
  plannedEssential: "योजनाबद्ध आवश्यक बजेट",
  recommendedBasis: "सिफारिस खर्च आधार",
  availableSurplus: "उपलब्ध बचत क्षमता",
  dataSource: "डाटा स्रोत",
  lastUpdated: "अन्तिम अद्यावधिक",
  calculationPeriod: "गणना अवधि",
  protectionPeriod: "सुरक्षा अवधि",
  customMonths: "कस्टम महिना",
  fundingPlan: "कोष योजना",
  remainingShortfall: "बाँकी कमी",
  recommendedContribution: "सिफारिस मासिक योगदान",
  allocation: "बचत बाँडफाँड",
  estimatedCompletion: "अनुमानित समाप्ति",
  safetyRunway: "सुरक्षा रनवे",
  growth: "आपतकालीन कोष वृद्धि",
  contributions: "जम्मा",
  withdrawals: "झिकाइ",
  insights: "स्मार्ट अन्तर्दृष्टि",
  quickActions: "द्रुत कार्यहरू",
  addContribution: "योगदान थप्नुहोस्",
  recordWithdrawal: "निकासी रेकर्ड गर्नुहोस्",
  linkSavingsGoal: "बचत लक्ष्य जोड्नुहोस्",
  editSettings: "सेटिङ सम्पादन",
  reviewCalculation: "गणना हेर्नुहोस्",
  onboardingTitle: "वित्तीय डाटा जोड्नुहोस्",
  onboardingBody:
    "लक्ष्य सिफारिस गर्न भरपर्दो आय, खर्च वा बजेट चाहिन्छ। हराएको डाटालाई शून्य मानिँदैन।",
  openCashflow: "क्यासफ्लो खोल्नुहोस्",
  addExpenses: "खर्च थप्नुहोस्",
  openBudget: "बजेट खोल्नुहोस्",
  fullyFunded: "आपतकालीन कोष पूर्ण रूपमा भरियो",
  additionalSavingsRequired: "थप बचत आवश्यक",
  estimateNote: "समाप्ति मिति अनुमान हो — स्थिर आय, खर्च र योगदान मानिएको।",
  categoryLimitation: "केही खर्चलाई आवश्यक भनी वर्गीकरण गर्न सकिएन। खर्च आधार पुष्टि/समायोजन गर्नुहोस्।",
  contributionWarning: "यो योगदान उपलब्ध क्षमताभन्दा बढी छ।",
  negativeCashflowHint: "योगदान बढाउनुअघि क्यासफ्लो सुधारलाई प्राथमिकता दिनुहोस्।",
  amount: "रकम",
  date: "मिति",
  note: "नोट",
  save: "बचत गर्नुहोस्",
  cancel: "रद्द",
  openingBalance: "सुरुवाती मौज्दात",
  noTransactions: "अहिलेसम्म कुनै जम्मा/निकासी छैन।",
  linkedGoals: "जोडिएका बचत लक्ष्यहरू",
  employmentType: "रोजगारी प्रकार",
  dependents: "आश्रितहरू",
  incomeSources: "आय स्रोतहरू",
  manualExpense: "म्यानुअल मासिक खर्च",
  overrideBasis: "खर्च आधार ओभरराइड",
  currencyFlag: "विनिमय दर अपूर्ण/पुरानो छ — रकम कम देखिन सक्छ।",
  safety: {
    critical: "गम्भीर",
    high_risk: "उच्च जोखिम",
    building_safety: "सुरक्षा निर्माणाधीन",
    strong_protection: "बलियो सुरक्षा",
    extended_protection: "विस्तृत सुरक्षा",
  },
};

const kr: EmergencyFundCopy = {
  ...en,
  title: "비상금",
  subtitle: "소득·지출·예산에서 자동 산출되는 금융 안전 버퍼입니다.",
  backToFinance: "금융으로 돌아가기",
  loading: "비상금 불러오는 중…",
  safetyOverview: "금융 안전 개요",
  target: "비상금 목표",
  currentReserve: "현재 비상 예비금",
  fundingProgress: "적립 진행률",
  safetyStatus: "금융 안전 상태",
  syncedData: "자동 동기화 재무 데이터",
  monthlyNetIncome: "월 순소득",
  actualMonthlyExpenses: "실제 월 지출",
  essentialAverage: "필수 지출 평균",
  plannedEssential: "계획된 필수 예산",
  recommendedBasis: "권장 지출 기준",
  availableSurplus: "가용 여유 자금",
  dataSource: "데이터 출처",
  lastUpdated: "마지막 업데이트",
  calculationPeriod: "계산 기간",
  protectionPeriod: "보호 기간",
  customMonths: "사용자 지정 개월",
  fundingPlan: "적립 계획",
  remainingShortfall: "남은 부족분",
  recommendedContribution: "권장 월 기여금",
  allocation: "여유금 배분",
  estimatedCompletion: "예상 완료",
  safetyRunway: "안전 런웨이",
  growth: "비상금 성장",
  contributions: "입금",
  withdrawals: "출금",
  insights: "스마트 인사이트",
  quickActions: "빠른 작업",
  addContribution: "기여금 추가",
  recordWithdrawal: "출금 기록",
  linkSavingsGoal: "저축 목표 연결",
  editSettings: "설정 편집",
  reviewCalculation: "계산 검토",
  onboardingTitle: "재무 데이터를 연결하세요",
  onboardingBody:
    "비상금 목표를 추천하려면 신뢰할 수 있는 소득·지출·예산이 필요합니다. 없는 데이터를 0으로 가정하지 않습니다.",
  openCashflow: "캐시플로 열기",
  addExpenses: "지출 추가",
  openBudget: "예산 열기",
  fullyFunded: "비상금 목표 달성",
  additionalSavingsRequired: "추가 저축 필요",
  estimateNote: "완료일은 소득·지출·기여가 유지된다는 가정하의 추정입니다.",
  categoryLimitation: "일부 지출을 필수로 분류할 수 없습니다. 지출 기준을 확인·조정하세요.",
  contributionWarning: "이 기여금은 가용 재무 여력을 초과합니다.",
  negativeCashflowHint: "비상 기여를 늘리기 전에 캐시플로 회복을 우선하세요.",
  amount: "금액",
  date: "날짜",
  note: "메모",
  save: "저장",
  cancel: "취소",
  openingBalance: "기초 잔액",
  noTransactions: "아직 입금/출금이 없습니다.",
  linkedGoals: "연결된 저축 목표",
  employmentType: "고용 형태",
  dependents: "피부양자",
  incomeSources: "소득원",
  manualExpense: "수동 월 지출",
  overrideBasis: "지출 기준 재정의",
  currencyFlag: "환율 데이터가 불완전하거나 오래되었습니다.",
  safety: {
    critical: "위기",
    high_risk: "고위험",
    building_safety: "안전 구축 중",
    strong_protection: "강한 보호",
    extended_protection: "확장 보호",
  },
};

export const emergencyFundTranslations: Record<LanguageCode, EmergencyFundCopy> = {
  en,
  np,
  kr,
  ja: en,
};

export function getEmergencyFundCopy(language: LanguageCode): EmergencyFundCopy {
  return emergencyFundTranslations[language] ?? en;
}

export function localizeDataSourceLabel(
  label: EmergencyDataSourceLabel,
  language: LanguageCode,
): string {
  if (language === "np") {
    const map: Record<EmergencyDataSourceLabel, string> = {
      "Actual Expense History": "वास्तविक खर्च इतिहास",
      "Budget-Based Estimate": "बजेटमा आधारित अनुमान",
      "Cashflow-Based Estimate": "क्यासफ्लो अनुमान",
      "Manual Estimate": "म्यानुअल अनुमान",
      "Insufficient Financial Data": "अपर्याप्त वित्तीय डाटा",
      "Actual + Budget (conservative max)": "वास्तविक + बजेट (संरक्षणात्मक अधिकतम)",
    };
    return map[label];
  }
  if (language === "kr") {
    const map: Record<EmergencyDataSourceLabel, string> = {
      "Actual Expense History": "실제 지출 이력",
      "Budget-Based Estimate": "예산 기반 추정",
      "Cashflow-Based Estimate": "캐시플로 기반 추정",
      "Manual Estimate": "수동 추정",
      "Insufficient Financial Data": "재무 데이터 부족",
      "Actual + Budget (conservative max)": "실제 + 예산 (보수적 최대)",
    };
    return map[label];
  }
  return label;
}

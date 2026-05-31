export const LANGUAGE_STORAGE_KEY = "fire-nepal-language";

export const supportedLanguages = [
  { code: "en", label: "English", shortLabel: "EN", nativeLabel: "Default" },
  { code: "np", label: "नेपाली", shortLabel: "ने", nativeLabel: "Nepali" },
  { code: "kr", label: "한국어", shortLabel: "KO", nativeLabel: "Korean" },
  { code: "ja", label: "日本語", shortLabel: "JA", nativeLabel: "Japanese" },
] as const;

export type LanguageCode = (typeof supportedLanguages)[number]["code"];

export type HomepageCopy = {
  languageSelector: {
    ariaLabel: string;
    eyebrow: string;
    saved: string;
    currentLanguage: string;
  };
  nav: {
    financialIndependence: string;
    secure: string;
    navigate: string;
    productHub: string;
    securityCenter: string;
    signIn: string;
    signUp: string;
    createAccount: string;
    securePagesNote: string;
    links: Array<{ href: string; label: string }>;
  };
  mobileDock: Array<{ label: string; href: string }>;
  hero: {
    liveNpt: string;
    kathmanduNepal: string;
    badge: string;
    headline: string[];
    description: string;
    startDashboard: string;
    runSimulation: string;
    importPayslip: string;
    featureCards: Array<{ title: string; body: string }>;
    returnReadiness: string;
    snapshot: string;
    liveUi: string;
    progressLabels: string[];
    savedInKorea: string;
    nepalCorpus: string;
    watchDemo: string;
  };
  home: {
    topLinks: string[];
    tools: Array<{ title: string; body: string; href: string }>;
    fireTools: Array<{ title: string; body: string; href: string }>;
    loanCards: Array<{ title: string; body: string; href: string; badge: string }>;
    videos: Array<{ title: string; duration: string; gradient: string }>;
    posts: Array<{ title: string; tag: string; time: string }>;
    testimonials: Array<{ name: string; place: string; quote: string }>;
    operatingSystemCards: Array<{ title: string; value: string; detail: string }>;
    smartInsights: Array<{ title: string; insight: string }>;
    osBadge: string;
    osTitle: string;
    osBody: string;
    osStats: Array<{ label: string; value: string }>;
    commandCenterTitle: string;
    commandCenterBody: string;
    live: string;
    aiInsightsTitle: string;
    toolsHubBadge: string;
    popularFireTools: string;
    toolsHubBody: string;
    exploreDashboard: string;
    loanBadge: string;
    loanTitle: string;
    loanBody: string;
    openLoanOs: string;
    launch: string;
    investmentCards: {
      actionCalculateNow: string;
      actionCompareAll: string;
      actionTrackNow: string;
      actionCheckDetails: string;
      actionCalculateMine: string;
      nepalCostTitle: string;
      cityLife: string;
      villageLife: string;
      minimumLife: string;
      investmentPlanner: string;
      mutualFunds: string;
      stockMarket: string;
      realEstate: string;
      fixedDeposit: string;
      lumpsumCalculator: string;
      oneTimeGrowth: string;
      compoundScore: string;
      compoundBody: string;
      savingsTracker: string;
      monthlySavings: string;
      totalSaved: string;
      thisMonthProgress: string;
      returnToNepal: string;
      emergencyFund: string;
      passiveIncome: string;
      targetCorpus: string;
      recommended: string;
      yourFund: string;
      readiness: string;
    };
    popularTools: string;
    viewAllTools: string;
    open: string;
    latestVideos: string;
    latestPosts: string;
    viewAll: string;
    currencyConverter: string;
    krwWon: string;
    nprRupee: string;
    converterNote: string;
    openLiveDashboard: string;
    aiAdvisorBadge: string;
    aiAdvisorTitle: string;
    aiAdvisorBody: string;
    advisorTopics: string[];
    fireBot: string;
    fireBotStatus: string;
    fireBotMessage: string;
    askPlaceholder: string;
    ask: string;
    communityTitle: string;
    seeReviews: string;
    footerTitle: string;
    footerBody: string;
    emailPlaceholder: string;
    subscribe: string;
    footerBrandBody: string;
    footerColumns: Array<{ heading: string; links: string[] }>;
    copyright: string;
    builtFor: string;
  };
  trust: {
    encryption: string;
    trustLayer: string;
    title: string;
    body: string;
    bullets: string[];
    createAccount: string;
    securityCenter: string;
    cards: Array<{ title: string; body: string }>;
  };
};

const english: HomepageCopy = {
  languageSelector: {
    ariaLabel: "Select homepage language",
    eyebrow: "Language",
    saved: "Saved on this device",
    currentLanguage: "Current language",
  },
  nav: {
    financialIndependence: "Financial Independence",
    secure: "Secure",
    navigate: "Navigate",
    productHub: "Product hub",
    securityCenter: "Security center",
    signIn: "Sign in",
    signUp: "Sign up",
    createAccount: "Create account",
    securePagesNote: "Secure pages · optional quick modal from hub",
    links: [
      { href: "#home", label: "Home" },
      { href: "#calculator", label: "FIRE Calculator" },
      { href: "#dashboard", label: "Dashboard" },
      { href: "/portfolio", label: "Portfolio" },
      { href: "#investments", label: "Investments" },
    ],
  },
  mobileDock: [
    { label: "Home", href: "#home" },
    { label: "Hub", href: "/hub" },
    { label: "FIRE", href: "#calculator" },
    { label: "Live", href: "/global-financial-intelligence" },
    { label: "AI", href: "#learn" },
  ],
  hero: {
    liveNpt: "Live NPT",
    kathmanduNepal: "Kathmandu, Nepal",
    badge: "Premium fintech layer — local-first intelligence for Nepali workers abroad.",
    headline: ["Plan today,", "achieve financial independence,", "and return to Nepal with dignity."],
    description: "Institutional dashboards, OCR payslips, deterministic simulation, AI coach, and automation intelligence — unified under one emerald glass system.",
    startDashboard: "Start dashboard",
    runSimulation: "Run FIRE simulation",
    importPayslip: "Import Korean payslip",
    featureCards: [
      { title: "Wealth OS", body: "Portfolio + coach + automation" },
      { title: "Cashflow OS", body: "Burn, savings rate, OCR" },
      { title: "Simulation desk", body: "Scenario lab, stress tests" },
      { title: "Privacy", body: "Data stays in-browser" },
    ],
    returnReadiness: "Return readiness",
    snapshot: "Bloomberg-grade snapshot — illustrative",
    liveUi: "Live UI",
    progressLabels: ["FIRE corpus", "Emergency fund", "KRW transfer plan"],
    savedInKorea: "Saved in Korea",
    nepalCorpus: "Nepal corpus",
    watchDemo: "Watch demo",
  },
  home: {
    topLinks: ["YouTube", "Blog", "Tools", "About Us"],
    tools: [
      { title: "Global Financial Intelligence", body: "Live forex, NEPSE, Korea stocks & macro", href: "/global-financial-intelligence" },
      { title: "Smart Loan OS", body: "Loan, EMI, interest & due management", href: "/smart-loan-os" },
      { title: "Currency Converter", body: "KRW to NPR live planning", href: "/currency-converter" },
      { title: "Baby Plan Estimator", body: "Family goals after Korea", href: "/baby-plan-estimator" },
      { title: "Remittance Calculator", body: "Compare fees and timing", href: "/remittance-calculator" },
      { title: "SIP Calculator", body: "Monthly investing growth", href: "/sip-calculator" },
      { title: "Lumpsum Calculator", body: "One-time investment growth", href: "/lumpsum-calculator" },
      { title: "SWP Calculator", body: "Safe withdrawal & retirement drawdown", href: "/swp-calculator" },
      { title: "Cashflow Dashboard", body: "Income, savings rate & emergency runway", href: "/cashflow-dashboard" },
      { title: "FIRE Summary", body: "Net worth, cashflow & 25× progress in one view", href: "/fire-summary" },
      { title: "Korea Pension + Severance", body: "Salary slip OCR, pension & severance", href: "/korea-pension-dashboard" },
      { title: "Loan Calculator", body: "EMI for Nepal return", href: "/loan-calculator" },
      { title: "Inflation Calculator", body: "Future value in NPR", href: "/inflation-calculator" },
      { title: "खर्च हिसाब खाता", body: "Roommate food & room expense settlement", href: "/expense-dashboard" },
    ],
    fireTools: [
      { title: "Global Intelligence", body: "Live FX, NEPSE, KOSPI, metals & FIRE risk", href: "/global-financial-intelligence" },
      { title: "Smart Loan OS", body: "Loan, EMI, interest & due management", href: "/smart-loan-os" },
      { title: "FIRE Summary", body: "Unified net worth, runway & FIRE %", href: "/fire-summary" },
      { title: "Cashflow Dashboard", body: "Income, burn, emergency fund & FIRE speed", href: "/cashflow-dashboard" },
      { title: "Expense Tracker", body: "Track roommate & daily expenses", href: "/expense-dashboard" },
      { title: "Savings Tracker", body: "Monthly KRW/NPR savings growth", href: "#dashboard" },
      { title: "Reminder Planner", body: "Bills, school fees, family-shared nudges", href: "/smart-reminders" },
      { title: "SIP Calculator", body: "Long term investment growth calculator", href: "/sip-calculator" },
      { title: "Lumpsum Calculator", body: "One-time KRW/NPR compounding", href: "/lumpsum-calculator" },
      { title: "SWP Calculator", body: "Inflation-aware withdrawal & runway", href: "/swp-calculator" },
      { title: "Korea Pension + Severance", body: "OCR payslips, 국민연금 & 퇴직금", href: "/korea-pension-dashboard" },
      { title: "Currency Converter", body: "KRW to NPR live conversion", href: "/currency-converter" },
      { title: "Return Planner", body: "Nepal return target planning", href: "/return-to-nepal" },
      { title: "Emergency Fund", body: "Safety fund progress tracker", href: "/emergency-fund" },
      { title: "Investment Planner", body: "Stocks, SIP, mutual fund planning", href: "#investments" },
    ],
    loanCards: [
      { title: "Smart Loan OS", body: "Loan, EMI, interest & due management", href: "/smart-loan-os", badge: "Live OS" },
      { title: "Due Manager", body: "Payment countdowns, overdue warnings, and family-shared reminder workflows.", href: "/smart-loan-os#analytics", badge: "Alerts" },
      { title: "EMI Planner", body: "EMI, reducing balance, installment schedule, and payoff readiness.", href: "/smart-loan-os#interest-calculator", badge: "Planner" },
      { title: "Interest Calculator", body: "Simple, compound, daily, monthly, and late penalty profit summaries.", href: "/smart-loan-os#interest-calculator", badge: "Engine" },
      { title: "Document Vault", body: "Citizenship, passport, agreements, receipts, screenshots, QR, and audio notes.", href: "/smart-loan-os#vault", badge: "Secure" },
      { title: "QR Payment Hub", body: "Nepali wallet QR, bank receipts, and payment proof organization.", href: "/smart-loan-os#vault", badge: "Wallets" },
      { title: "Recovery Tracker", body: "Risk analysis, client score, repayment graph, and recovery performance.", href: "/smart-loan-os#clients", badge: "Recovery" },
      { title: "Client Ledger", body: "Profiles with phone, WhatsApp/Viber, IDs, bank details, notes, and timeline.", href: "/smart-loan-os#clients", badge: "Ledger" },
    ],
    videos: [
      { title: "Korean income to FIRE strategy", duration: "9:05", gradient: "from-green-950 to-emerald-700" },
      { title: "Passive income after returning", duration: "12:18", gradient: "from-amber-600 to-yellow-400" },
      { title: "Nepal bazaar investment basics", duration: "8:29", gradient: "from-slate-900 to-green-700" },
    ],
    posts: [
      { title: "How to invest your Korea salary from Nepal", tag: "Money guide", time: "5 min read" },
      { title: "FIRE mistakes Nepali workers make abroad", tag: "Retirement", time: "7 min read" },
      { title: "KRW to NPR: what to track before coming home", tag: "Currency", time: "4 min read" },
    ],
    testimonials: [
      { name: "Bikash Gurung", place: "Busan, Korea", quote: "The planner finally made my Nepal return number feel practical." },
      { name: "Sita Magar", place: "Incheon, Korea", quote: "Savings tracker and cost planning changed how I send money home." },
      { name: "Rajesh Chaudhary", place: "Daegu, Korea", quote: "AI advice gave me clear steps for emergency fund and SIPs." },
      { name: "Anita Shrestha", place: "Seoul, Korea", quote: "I can see FIRE progress, family goals, and readiness in one place." },
    ],
    operatingSystemCards: [
      { title: "Retirement Readiness", value: "82% ready for Nepal return", detail: "FIRE score updates live" },
      { title: "Goal Tracking", value: "Kathmandu corpus target", detail: "रु 2.41Cr target mapped" },
      { title: "Emergency Planner", value: "7.8 months protected", detail: "Safety fund on track" },
      { title: "Shared Room Finance", value: "Roommate expenses settled", detail: "Open expense dashboard" },
    ],
    smartInsights: [
      { title: "AI Recommendation", insight: "Increase monthly savings by ₩180K to reach FIRE 14 months earlier." },
      { title: "Smart Notification", insight: "Visa renewal and insurance reminder due in 18 days." },
      { title: "Currency Insight", insight: "KRW/NPR is favorable today for planned remittance." },
    ],
    osBadge: "FIRE Nepal OS",
    osTitle: "Your premium financial operating system between Korea and Nepal.",
    osBody: "One emotionally motivating dashboard for savings, FIRE readiness, emergency safety, AI recommendations, live currency, and roommate finance tracking.",
    osStats: [
      { label: "Monthly savings", value: "₩1.2M" },
      { label: "Nepal target", value: "रु 2.41Cr" },
      { label: "FIRE ETA", value: "12 yrs" },
    ],
    commandCenterTitle: "Live Financial Command Center",
    commandCenterBody: "Personalized for Nepali workers abroad",
    live: "Live",
    aiInsightsTitle: "AI-powered insights",
    toolsHubBadge: "Tools Hub",
    popularFireTools: "Popular FIRE Tools",
    toolsHubBody: "Smart financial tools built for Nepalis abroad",
    exploreDashboard: "Explore Dashboard",
    loanBadge: "Smart Loan OS",
    loanTitle: "Loan, due, vault, and recovery tools for Nepali workers abroad.",
    loanBody: "Manage family lending, Korea roommate dues, EMI pressure, document proof, QR receipts, and FIRE impact from one premium credit dashboard.",
    openLoanOs: "Open Loan OS",
    launch: "Launch",
    investmentCards: {
      actionCalculateNow: "Calculate Now",
      actionCompareAll: "Compare All",
      actionTrackNow: "Track Now",
      actionCheckDetails: "Check Details",
      actionCalculateMine: "Calculate Mine",
      nepalCostTitle: "Nepal Cost of Living",
      cityLife: "City life",
      villageLife: "Village life",
      minimumLife: "Minimum life",
      investmentPlanner: "Investment Planner",
      mutualFunds: "Mutual Funds",
      stockMarket: "Stock Market",
      realEstate: "Real Estate",
      fixedDeposit: "Fixed Deposit",
      lumpsumCalculator: "Lumpsum Calculator",
      oneTimeGrowth: "One-time investment growth",
      compoundScore: "Compound score",
      compoundBody: "KRW/NPR toggle, inflation impact, and Nepal retirement projection.",
      savingsTracker: "Savings Tracker",
      monthlySavings: "Monthly savings",
      totalSaved: "Total saved",
      thisMonthProgress: "This month progress",
      returnToNepal: "Can I Return to Nepal?",
      emergencyFund: "Emergency fund",
      passiveIncome: "Passive income",
      targetCorpus: "Target corpus",
      recommended: "Recommended",
      yourFund: "Your fund",
      readiness: "Readiness",
    },
    popularTools: "Popular Tools",
    viewAllTools: "View All Tools",
    open: "Open",
    latestVideos: "Latest YouTube Videos",
    latestPosts: "Latest Blog Posts",
    viewAll: "View All",
    currencyConverter: "Currency Converter",
    krwWon: "KRW - South Korean Won",
    nprRupee: "NPR - Nepalese Rupee",
    converterNote: "1 KRW ~ 0.1079 NPR. Build remittance plans with transfer fees included.",
    openLiveDashboard: "Open live dashboard",
    aiAdvisorBadge: "AI Financial Advisor",
    aiAdvisorTitle: "Ask in Nepali, Korean, or English. Get a clear FIRE action plan.",
    aiAdvisorBody: "Personalized advice for retirement passive income, tax-saving tips, remittance timing, emergency planning, and wealth building between Korea and Nepal.",
    advisorTopics: ["Retirement Passive", "Investment Advice", "Tax Saving Tips", "Emergency Planning", "Wealth Building"],
    fireBot: "FIRE Bot",
    fireBotStatus: "Online - portfolio aware",
    fireBotMessage: "Based on your KRW income, save ₩1.2M monthly, keep 6 months in NPR cash, and split new investments 60% mutual funds, 25% FD, 15% equities.",
    askPlaceholder: "Ask your AI advisor...",
    ask: "Ask",
    communityTitle: "What Our Community Says",
    seeReviews: "See All Reviews",
    footerTitle: "Stay Updated with FIRE Nepal",
    footerBody: "FIRE tips, KRW alerts, and investment strategy for Nepali workers.",
    emailPlaceholder: "Enter your email",
    subscribe: "Subscribe Now",
    footerBrandBody: "KRW to NPR planning, savings tracking, investment education, and return-home readiness in one premium dashboard.",
    footerColumns: [
      { heading: "Tools", links: ["FIRE Calculator", "Savings Tracker", "Investment Planner", "AI Calculator"] },
      { heading: "Learn", links: ["Blog", "YouTube Videos", "FIRE Guide", "🇳🇵 Nepal Economy"] },
      { heading: "Company", links: ["About Us", "Contact Us", "Privacy Policy", "Terms of Service"] },
    ],
    copyright: "© 2026 FIRE Nepal. All rights reserved.",
    builtFor: "Built for Korean workers returning to Nepal.",
  },
  trust: {
    encryption: "Bank-grade encryption",
    trustLayer: "Trust layer",
    title: "Security & privacy built like a modern fintech — for Nepalis abroad.",
    body: "FIRE Nepal never sells your data. Passwords are protected with industry-standard hashing, sessions use hardened cookies, and your financial intelligence stays local-first until you opt into encrypted cloud sync.",
    bullets: [
      "Financial data is encrypted in transit; sensitive workspace data stays on your device by default.",
      "You control exports and deletions — we do not monetize personal financial behaviour.",
      "Built for Nepalis in Korea and the diaspora — NPR, KRW, and USD aware.",
    ],
    createAccount: "Create secure account",
    securityCenter: "Security center",
    cards: [
      { title: "Privacy-first architecture", body: "Portfolio engines, cashflow, and OCR run in your browser. No silent data brokerage." },
      { title: "Secure authentication", body: "Email verification, httpOnly session cookies, and premium member dashboards." },
      { title: "Local-first intelligence", body: "Your planning tools work without forcing every input into a cloud profile." },
      { title: "Transparent controls", body: "Clear security screens explain what is stored, synced, exported, and deleted." },
      { title: "Production-ready path", body: "Database-at-rest keys, refresh rotation, and anomaly alerts map cleanly to this trust surface." },
    ],
  },
};

export const homepageTranslations: Record<LanguageCode, HomepageCopy> = {
  en: english,
  kr: {
    ...english,
    languageSelector: {
      ariaLabel: "홈페이지 언어 선택",
      eyebrow: "언어",
      saved: "이 기기에 저장됨",
      currentLanguage: "현재 언어",
    },
    nav: {
      ...english.nav,
      financialIndependence: "경제적 자유",
      secure: "보안",
      navigate: "메뉴",
      productHub: "제품 허브",
      securityCenter: "보안 센터",
      signIn: "로그인",
      signUp: "가입하기",
      createAccount: "계정 만들기",
      securePagesNote: "보안 페이지 · 허브에서 빠른 모달 사용 가능",
      links: [
        { href: "#home", label: "홈" },
        { href: "#calculator", label: "FIRE 계산기" },
        { href: "#dashboard", label: "대시보드" },
        { href: "/portfolio", label: "포트폴리오" },
        { href: "#investments", label: "투자" },
      ],
    },
    mobileDock: [
      { label: "홈", href: "#home" },
      { label: "허브", href: "/hub" },
      { label: "FIRE", href: "#calculator" },
      { label: "라이브", href: "/global-financial-intelligence" },
      { label: "AI", href: "#learn" },
    ],
    hero: {
      ...english.hero,
      liveNpt: "네팔 시간",
      kathmanduNepal: "카트만두, 네팔",
      badge: "해외 네팔 근로자를 위한 로컬 우선 프리미엄 핀테크 레이어.",
      headline: ["오늘 계획하고,", "경제적 자유를 만들고,", "존엄하게 네팔로 돌아가세요."],
      description: "기관급 대시보드, OCR 급여명세서, 결정론적 시뮬레이션, AI 코치, 자동화 인텔리전스를 하나의 에메랄드 글래스 시스템으로 통합했습니다.",
      startDashboard: "대시보드 시작",
      runSimulation: "FIRE 시뮬레이션",
      importPayslip: "한국 급여명세서 가져오기",
      featureCards: [
        { title: "자산 OS", body: "포트폴리오 + 코치 + 자동화" },
        { title: "현금흐름 OS", body: "지출, 저축률, OCR" },
        { title: "시뮬레이션 데스크", body: "시나리오 랩, 스트레스 테스트" },
        { title: "프라이버시", body: "데이터는 브라우저에 보관" },
      ],
      returnReadiness: "귀국 준비도",
      snapshot: "블룸버그급 스냅샷 — 예시",
      liveUi: "실시간 UI",
      progressLabels: ["FIRE 자산", "비상금", "KRW 송금 계획"],
      savedInKorea: "한국에서 모은 금액",
      nepalCorpus: "네팔 자산",
      watchDemo: "데모 보기",
    },
    home: {
      ...english.home,
      topLinks: ["유튜브", "블로그", "도구", "회사 소개"],
      tools: [
        { title: "글로벌 금융 인텔리전스", body: "실시간 환율, NEPSE, 한국 주식 및 매크로", href: "/global-financial-intelligence" },
        { title: "스마트 Loan OS", body: "대출, EMI, 이자, 납부일 관리", href: "/smart-loan-os" },
        { title: "환율 계산기", body: "KRW에서 NPR까지 실시간 계획", href: "/currency-converter" },
        { title: "베이비 플랜 계산기", body: "한국 이후 가족 목표 설계", href: "/baby-plan-estimator" },
        { title: "송금 계산기", body: "수수료와 처리 시간을 비교", href: "/remittance-calculator" },
        { title: "SIP 계산기", body: "월별 투자 성장 계산", href: "/sip-calculator" },
        { title: "일시금 계산기", body: "일회성 투자 성장", href: "/lumpsum-calculator" },
        { title: "SWP 계산기", body: "안전 인출과 은퇴 현금흐름", href: "/swp-calculator" },
        { title: "현금흐름 대시보드", body: "소득, 저축률, 비상 런웨이", href: "/cashflow-dashboard" },
        { title: "FIRE 요약", body: "순자산, 현금흐름, 25배 진행률", href: "/fire-summary" },
        { title: "한국 연금 + 퇴직금", body: "급여명세서 OCR, 국민연금, 퇴직금", href: "/korea-pension-dashboard" },
        { title: "대출 계산기", body: "네팔 귀국을 위한 EMI", href: "/loan-calculator" },
        { title: "인플레이션 계산기", body: "NPR 미래 가치 계산", href: "/inflation-calculator" },
        { title: "비용 정산 장부", body: "룸메이트 식비와 방세 정산", href: "/expense-dashboard" },
      ],
      fireTools: [
        { title: "글로벌 인텔리전스", body: "실시간 FX, NEPSE, KOSPI, 금속, FIRE 리스크", href: "/global-financial-intelligence" },
        { title: "스마트 Loan OS", body: "대출, EMI, 이자, 납부일 관리", href: "/smart-loan-os" },
        { title: "FIRE 요약", body: "순자산, 런웨이, FIRE % 통합", href: "/fire-summary" },
        { title: "현금흐름 대시보드", body: "소득, 지출, 비상금, FIRE 속도", href: "/cashflow-dashboard" },
        { title: "지출 트래커", body: "룸메이트 및 일상 지출 추적", href: "/expense-dashboard" },
        { title: "저축 트래커", body: "월별 KRW/NPR 저축 성장", href: "#dashboard" },
        { title: "리마인더 플래너", body: "청구서, 학비, 가족 공유 알림", href: "/smart-reminders" },
        { title: "SIP 계산기", body: "장기 투자 성장 계산기", href: "/sip-calculator" },
        { title: "일시금 계산기", body: "KRW/NPR 단일 투자 복리", href: "/lumpsum-calculator" },
        { title: "SWP 계산기", body: "인플레이션 반영 인출 및 런웨이", href: "/swp-calculator" },
        { title: "한국 연금 + 퇴직금", body: "OCR 급여명세서, 국민연금, 퇴직금", href: "/korea-pension-dashboard" },
        { title: "환율 계산기", body: "KRW에서 NPR 실시간 변환", href: "/currency-converter" },
        { title: "귀국 플래너", body: "네팔 귀국 목표 계획", href: "/return-to-nepal" },
        { title: "비상금", body: "안전 자금 진행률 추적", href: "/emergency-fund" },
        { title: "투자 플래너", body: "주식, SIP, 뮤추얼 펀드 계획", href: "#investments" },
      ],
      loanCards: [
        { title: "스마트 Loan OS", body: "대출, EMI, 이자, 납부일 관리", href: "/smart-loan-os", badge: "Live OS" },
        { title: "납부일 매니저", body: "결제 카운트다운, 연체 경고, 가족 공유 리마인더 워크플로우.", href: "/smart-loan-os#analytics", badge: "알림" },
        { title: "EMI 플래너", body: "EMI, 감소 잔액, 할부 일정, 상환 준비도.", href: "/smart-loan-os#interest-calculator", badge: "플래너" },
        { title: "이자 계산기", body: "단리, 복리, 일/월 이자, 연체 페널티 요약.", href: "/smart-loan-os#interest-calculator", badge: "엔진" },
        { title: "문서 보관함", body: "시민권, 여권, 계약서, 영수증, 스크린샷, QR, 음성 메모.", href: "/smart-loan-os#vault", badge: "보안" },
        { title: "QR 결제 허브", body: "네팔 지갑 QR, 은행 영수증, 결제 증빙 정리.", href: "/smart-loan-os#vault", badge: "지갑" },
        { title: "회수 트래커", body: "리스크 분석, 고객 점수, 상환 그래프, 회수 성과.", href: "/smart-loan-os#clients", badge: "회수" },
        { title: "고객 원장", body: "전화, WhatsApp/Viber, ID, 은행 정보, 메모, 타임라인 프로필.", href: "/smart-loan-os#clients", badge: "원장" },
      ],
      videos: [
        { title: "한국 소득으로 FIRE 전략 만들기", duration: "9:05", gradient: "from-green-950 to-emerald-700" },
        { title: "귀국 후 패시브 소득", duration: "12:18", gradient: "from-amber-600 to-yellow-400" },
        { title: "네팔 시장 투자 기초", duration: "8:29", gradient: "from-slate-900 to-green-700" },
      ],
      posts: [
        { title: "네팔에서 한국 급여를 투자하는 법", tag: "머니 가이드", time: "5분 읽기" },
        { title: "해외 네팔 근로자가 하는 FIRE 실수", tag: "은퇴", time: "7분 읽기" },
        { title: "귀국 전 확인할 KRW to NPR 포인트", tag: "환율", time: "4분 읽기" },
      ],
      testimonials: [
        { name: "Bikash Gurung", place: "부산, 한국", quote: "이 플래너 덕분에 네팔 귀국 숫자가 현실적으로 느껴졌습니다." },
        { name: "Sita Magar", place: "인천, 한국", quote: "저축 트래커와 비용 계획이 송금 방식을 바꿔주었습니다." },
        { name: "Rajesh Chaudhary", place: "대구, 한국", quote: "AI 조언이 비상금과 SIP에 대한 명확한 단계를 알려줬습니다." },
        { name: "Anita Shrestha", place: "서울, 한국", quote: "FIRE 진행률, 가족 목표, 준비도를 한곳에서 볼 수 있습니다." },
      ],
      operatingSystemCards: [
        { title: "은퇴 준비도", value: "네팔 귀국 82% 준비", detail: "FIRE 점수 실시간 업데이트" },
        { title: "목표 추적", value: "카트만두 자산 목표", detail: "रु 2.41Cr 목표 매핑" },
        { title: "비상 플래너", value: "7.8개월 보호", detail: "안전 자금 순항 중" },
        { title: "공동 생활 재무", value: "룸메이트 비용 정산 완료", detail: "지출 대시보드 열기" },
      ],
      smartInsights: [
        { title: "AI 추천", insight: "월 저축을 ₩180K 늘리면 FIRE를 14개월 앞당길 수 있습니다." },
        { title: "스마트 알림", insight: "비자 갱신과 보험 알림이 18일 후 예정되어 있습니다." },
        { title: "환율 인사이트", insight: "오늘 KRW/NPR은 계획된 송금에 유리합니다." },
      ],
      osTitle: "한국과 네팔을 잇는 프리미엄 금융 운영 시스템.",
      osBody: "저축, FIRE 준비도, 비상 안전망, AI 추천, 실시간 환율, 룸메이트 재무 관리를 하나의 동기부여 대시보드에 담았습니다.",
      commandCenterTitle: "실시간 금융 커맨드 센터",
      commandCenterBody: "해외 네팔 근로자에게 맞춤화",
      aiInsightsTitle: "AI 기반 인사이트",
      toolsHubBadge: "도구 허브",
      popularFireTools: "인기 FIRE 도구",
      toolsHubBody: "해외 네팔인을 위해 만든 스마트 금융 도구",
      exploreDashboard: "대시보드 둘러보기",
      loanTitle: "해외 네팔 근로자를 위한 대출, 납부일, 문서 보관, 회수 도구.",
      loanBody: "가족 대여금, 한국 룸메이트 정산, EMI 압박, 증빙 문서, QR 영수증, FIRE 영향을 하나의 프리미엄 신용 대시보드에서 관리하세요.",
      openLoanOs: "Loan OS 열기",
      launch: "실행",
      investmentCards: {
        ...english.home.investmentCards,
        actionCalculateNow: "지금 계산",
        actionCompareAll: "전체 비교",
        actionTrackNow: "지금 추적",
        actionCheckDetails: "자세히 보기",
        actionCalculateMine: "내 금액 계산",
        nepalCostTitle: "네팔 생활비",
        cityLife: "도시 생활",
        villageLife: "마을 생활",
        minimumLife: "최소 생활",
        investmentPlanner: "투자 플래너",
        mutualFunds: "뮤추얼 펀드",
        stockMarket: "주식 시장",
        realEstate: "부동산",
        fixedDeposit: "정기예금",
        lumpsumCalculator: "일시금 계산기",
        oneTimeGrowth: "일회성 투자 성장",
        compoundScore: "복리 점수",
        compoundBody: "KRW/NPR 전환, 인플레이션 영향, 네팔 은퇴 예측.",
        savingsTracker: "저축 트래커",
        monthlySavings: "월 저축",
        totalSaved: "총 저축",
        thisMonthProgress: "이번 달 진행률",
        returnToNepal: "네팔로 돌아갈 수 있을까요?",
        emergencyFund: "비상금",
        passiveIncome: "패시브 소득",
        targetCorpus: "목표 자산",
        recommended: "권장",
        yourFund: "내 자금",
        readiness: "준비도",
      },
      popularTools: "인기 도구",
      viewAllTools: "모든 도구 보기",
      open: "열기",
      latestVideos: "최신 유튜브 영상",
      latestPosts: "최신 블로그 글",
      viewAll: "전체 보기",
      currencyConverter: "환율 계산기",
      converterNote: "1 KRW ~ 0.1079 NPR. 송금 수수료까지 포함해 계획을 세우세요.",
      openLiveDashboard: "실시간 대시보드 열기",
      aiAdvisorBadge: "AI 금융 어드바이저",
      aiAdvisorTitle: "네팔어, 한국어, 영어로 질문하고 명확한 FIRE 실행 계획을 받으세요.",
      aiAdvisorBody: "은퇴 패시브 소득, 절세 팁, 송금 타이밍, 비상 계획, 한국과 네팔 사이의 자산 형성에 대한 맞춤 조언.",
      advisorTopics: ["은퇴 패시브", "투자 조언", "절세 팁", "비상 계획", "자산 형성"],
      fireBotStatus: "온라인 - 포트폴리오 인식",
      fireBotMessage: "KRW 소득 기준으로 매월 ₩1.2M을 저축하고, 6개월치 NPR 현금을 유지하며, 신규 투자는 뮤추얼 펀드 60%, FD 25%, 주식 15%로 나누세요.",
      askPlaceholder: "AI 어드바이저에게 질문...",
      ask: "질문",
      communityTitle: "커뮤니티 후기",
      seeReviews: "모든 리뷰 보기",
      footerTitle: "FIRE Nepal 업데이트 받기",
      footerBody: "네팔 근로자를 위한 FIRE 팁, KRW 알림, 투자 전략.",
      emailPlaceholder: "이메일 입력",
      subscribe: "구독하기",
      footerBrandBody: "KRW-NPR 계획, 저축 추적, 투자 교육, 귀국 준비를 하나의 프리미엄 대시보드에서.",
      footerColumns: [
        { heading: "도구", links: ["FIRE 계산기", "저축 트래커", "투자 플래너", "AI 계산기"] },
        { heading: "학습", links: ["블로그", "유튜브 영상", "FIRE 가이드", "한국 경제"] },
        { heading: "회사", links: ["회사 소개", "문의하기", "개인정보 처리방침", "서비스 약관"] },
      ],
      builtFor: "네팔로 돌아가는 한국 근로자를 위해 제작.",
    },
    trust: {
      ...english.trust,
      encryption: "은행급 암호화",
      trustLayer: "신뢰 레이어",
      title: "해외 네팔인을 위한 현대 핀테크 수준의 보안과 프라이버시.",
      body: "FIRE Nepal은 데이터를 판매하지 않습니다. 비밀번호는 업계 표준 해싱으로 보호되고, 세션은 강화된 쿠키를 사용하며, 암호화 클라우드 동기화를 선택하기 전까지 금융 인텔리전스는 로컬 우선으로 유지됩니다.",
      bullets: [
        "금융 데이터는 전송 중 암호화되며 민감한 워크스페이스 데이터는 기본적으로 기기에 남습니다.",
        "내보내기와 삭제를 직접 제어하며, 개인 금융 행동을 수익화하지 않습니다.",
        "한국과 디아스포라의 네팔인을 위해 설계되어 NPR, KRW, USD를 이해합니다.",
      ],
      createAccount: "보안 계정 만들기",
      securityCenter: "보안 센터",
      cards: [
        { title: "프라이버시 우선 아키텍처", body: "포트폴리오 엔진, 현금흐름, OCR은 브라우저에서 실행됩니다. 조용한 데이터 브로커리지 없음." },
        { title: "안전한 인증", body: "이메일 인증, httpOnly 세션 쿠키, 프리미엄 회원 대시보드." },
        { title: "로컬 우선 인텔리전스", body: "모든 입력을 클라우드 프로필로 강제하지 않고 계획 도구를 사용할 수 있습니다." },
        { title: "투명한 제어", body: "저장, 동기화, 내보내기, 삭제되는 내용을 보안 화면에서 명확히 설명합니다." },
        { title: "프로덕션 준비 경로", body: "저장 데이터 키, refresh rotation, 이상 알림이 이 신뢰 표면에 자연스럽게 연결됩니다." },
      ],
    },
  },
  ja: {
    ...english,
    languageSelector: {
      ariaLabel: "ホームページの言語を選択",
      eyebrow: "言語",
      saved: "この端末に保存されます",
      currentLanguage: "現在の言語",
    },
    nav: {
      ...english.nav,
      financialIndependence: "経済的自立",
      secure: "安全",
      navigate: "メニュー",
      productHub: "製品ハブ",
      securityCenter: "セキュリティセンター",
      signIn: "ログイン",
      signUp: "登録",
      createAccount: "アカウント作成",
      securePagesNote: "安全なページ · ハブからクイックアクセス",
      links: [
        { href: "#home", label: "ホーム" },
        { href: "#calculator", label: "FIRE計算機" },
        { href: "#dashboard", label: "ダッシュボード" },
        { href: "/portfolio", label: "ポートフォリオ" },
        { href: "#investments", label: "投資" },
      ],
    },
    mobileDock: [
      { label: "ホーム", href: "#home" },
      { label: "ハブ", href: "/hub" },
      { label: "FIRE", href: "#calculator" },
      { label: "ライブ", href: "/global-financial-intelligence" },
      { label: "AI", href: "#learn" },
    ],
    hero: {
      ...english.hero,
      liveNpt: "ネパール時間",
      kathmanduNepal: "カトマンズ、ネパール",
      badge: "海外のネパール人ワーカー向けのローカル優先プレミアムFinTechレイヤー。",
      description: "機関投資家レベルのダッシュボード、OCR給与明細、決定論的シミュレーション、AIコーチ、自動化インテリジェンスを1つのエメラルドグラスシステムに統合。",
      startDashboard: "ダッシュボードを開始",
      runSimulation: "FIREシミュレーション",
      importPayslip: "韓国の給与明細を取り込む",
      featureCards: [
        { title: "資産OS", body: "ポートフォリオ + コーチ + 自動化" },
        { title: "キャッシュフローOS", body: "支出、貯蓄率、OCR" },
        { title: "シミュレーションデスク", body: "シナリオ分析とストレステスト" },
        { title: "プライバシー", body: "データはブラウザ内に保持" },
      ],
      returnReadiness: "帰国準備度",
      snapshot: "ブルームバーグ級スナップショット — 例示",
      liveUi: "ライブUI",
      progressLabels: ["FIRE資産", "緊急資金", "KRW送金計画"],
      savedInKorea: "韓国での貯蓄",
      nepalCorpus: "ネパール資産",
      watchDemo: "デモを見る",
    },
    home: {
      ...english.home,
      topLinks: ["YouTube", "ブログ", "ツール", "会社概要"],
      osTitle: "韓国とネパールをつなぐプレミアム金融オペレーティングシステム。",
      osBody: "貯蓄、FIRE準備度、緊急資金、AI提案、ライブ為替、ルームメイト家計管理を1つの意欲を高めるダッシュボードに集約。",
      commandCenterTitle: "ライブ金融コマンドセンター",
      commandCenterBody: "海外のネパール人ワーカー向けに最適化",
      aiInsightsTitle: "AIによるインサイト",
      toolsHubBadge: "ツールハブ",
      popularFireTools: "人気のFIREツール",
      toolsHubBody: "海外のネパール人向けに作られたスマート金融ツール",
      exploreDashboard: "ダッシュボードを見る",
      loanTitle: "海外のネパール人ワーカー向けのローン、期日、保管庫、回収ツール。",
      loanBody: "家族間貸付、韓国のルームメイト精算、EMI負担、証明書類、QR領収書、FIREへの影響を1つのプレミアム信用ダッシュボードで管理。",
      openLoanOs: "Loan OSを開く",
      launch: "起動",
      investmentCards: {
        ...english.home.investmentCards,
        actionCalculateNow: "今すぐ計算",
        actionCompareAll: "すべて比較",
        actionTrackNow: "今すぐ追跡",
        actionCheckDetails: "詳細を見る",
        actionCalculateMine: "自分の金額を計算",
        nepalCostTitle: "ネパール生活費",
        cityLife: "都市生活",
        villageLife: "村での生活",
        minimumLife: "最低生活費",
        investmentPlanner: "投資プランナー",
        mutualFunds: "投資信託",
        stockMarket: "株式市場",
        realEstate: "不動産",
        fixedDeposit: "定期預金",
        lumpsumCalculator: "一括投資計算機",
        oneTimeGrowth: "一回投資の成長",
        compoundScore: "複利スコア",
        compoundBody: "KRW/NPR切替、インフレ影響、ネパール退職予測。",
        savingsTracker: "貯蓄トラッカー",
        monthlySavings: "月間貯蓄",
        totalSaved: "総貯蓄",
        thisMonthProgress: "今月の進捗",
        returnToNepal: "ネパールへ帰国できますか？",
        emergencyFund: "緊急資金",
        passiveIncome: "不労所得",
        targetCorpus: "目標資産",
        recommended: "推奨",
        yourFund: "あなたの資金",
        readiness: "準備度",
      },
      popularTools: "人気ツール",
      viewAllTools: "すべてのツールを見る",
      open: "開く",
      latestVideos: "最新YouTube動画",
      latestPosts: "最新ブログ記事",
      viewAll: "すべて見る",
      currencyConverter: "通貨コンバーター",
      converterNote: "1 KRW ~ 0.1079 NPR。送金手数料を含めて計画できます。",
      openLiveDashboard: "ライブダッシュボードを開く",
      aiAdvisorBadge: "AI金融アドバイザー",
      aiAdvisorTitle: "ネパール語、韓国語、英語で質問し、明確なFIRE行動計画を取得。",
      aiAdvisorBody: "退職後の不労所得、節税ヒント、送金タイミング、緊急計画、韓国とネパール間の資産形成に関する個別アドバイス。",
      advisorTopics: ["退職後収入", "投資アドバイス", "節税ヒント", "緊急計画", "資産形成"],
      fireBotStatus: "オンライン - ポートフォリオ対応",
      fireBotMessage: "KRW収入を基準に、毎月₩1.2Mを貯蓄し、NPR現金を6か月分維持し、新規投資を投資信託60%、FD25%、株式15%に分散しましょう。",
      askPlaceholder: "AIアドバイザーに質問...",
      ask: "質問",
      communityTitle: "コミュニティの声",
      seeReviews: "すべてのレビューを見る",
      footerTitle: "FIRE Nepalの最新情報を受け取る",
      footerBody: "ネパール人ワーカー向けのFIREヒント、KRWアラート、投資戦略。",
      emailPlaceholder: "メールアドレスを入力",
      subscribe: "今すぐ登録",
      footerBrandBody: "KRWからNPRへの計画、貯蓄管理、投資教育、帰国準備を1つのプレミアムダッシュボードで。",
      footerColumns: [
        { heading: "ツール", links: ["FIRE計算機", "貯蓄トラッカー", "投資プランナー", "AI計算機"] },
        { heading: "学ぶ", links: ["ブログ", "YouTube動画", "FIREガイド", "韓国経済"] },
        { heading: "会社", links: ["会社概要", "お問い合わせ", "プライバシーポリシー", "利用規約"] },
      ],
      builtFor: "ネパールへ帰国する韓国ワーカー向けに構築。",
    },
    trust: {
      ...english.trust,
      encryption: "銀行レベルの暗号化",
      trustLayer: "信頼レイヤー",
      title: "海外のネパール人向けに、現代FinTech水準のセキュリティとプライバシーを提供。",
      body: "FIRE Nepalはあなたのデータを販売しません。パスワードは業界標準のハッシュで保護され、セッションは強化Cookieを使用し、暗号化クラウド同期を選択するまで金融インテリジェンスはローカル優先です。",
      bullets: [
        "金融データは通信時に暗号化され、機密ワークスペースデータは標準で端末内に残ります。",
        "エクスポートと削除はあなたが管理できます。個人の金融行動を収益化しません。",
        "韓国とディアスポラのネパール人向けに設計され、NPR、KRW、USDに対応します。",
      ],
      createAccount: "安全なアカウントを作成",
      securityCenter: "セキュリティセンター",
      cards: [
        { title: "プライバシー優先設計", body: "ポートフォリオエンジン、キャッシュフロー、OCRはブラウザで実行されます。見えないデータ仲介はありません。" },
        { title: "安全な認証", body: "メール認証、httpOnlyセッションCookie、プレミアム会員ダッシュボード。" },
        { title: "ローカル優先インテリジェンス", body: "すべての入力をクラウドプロフィールへ強制送信せずに計画ツールを使えます。" },
        { title: "透明なコントロール", body: "保存、同期、エクスポート、削除される内容をセキュリティ画面で明確に説明します。" },
        { title: "本番対応への道筋", body: "保存データキー、リフレッシュローテーション、異常アラートがこの信頼レイヤーに自然に接続します。" },
      ],
    },
  },
  np: {
    ...english,
    languageSelector: {
      ariaLabel: "होमपेज भाषा छान्नुहोस्",
      eyebrow: "भाषा",
      saved: "यो डिभाइसमा सुरक्षित गरिएको",
      currentLanguage: "हालको भाषा",
    },
    nav: {
      ...english.nav,
      financialIndependence: "आर्थिक स्वतन्त्रता",
      secure: "सुरक्षित",
      navigate: "मेनु",
      productHub: "उत्पादन केन्द्र",
      securityCenter: "सुरक्षा केन्द्र",
      signIn: "लगइन",
      signUp: "साइन अप",
      createAccount: "खाता बनाउनुहोस्",
      securePagesNote: "सुरक्षित पृष्ठहरू · केन्द्रबाट छिटो पहुँच",
      links: [
        { href: "#home", label: "मुख्य पृष्ठ" },
        { href: "#calculator", label: "FIRE क्याल्कुलेटर" },
        { href: "#dashboard", label: "ड्यासबोर्ड" },
        { href: "/portfolio", label: "सम्पत्ति पोर्टफोलियो" },
        { href: "#investments", label: "लगानी" },
      ],
    },
    mobileDock: [
      { label: "मुख्य", href: "#home" },
      { label: "केन्द्र", href: "/hub" },
      { label: "FIRE", href: "#calculator" },
      { label: "लाइभ", href: "/global-financial-intelligence" },
      { label: "AI", href: "#learn" },
    ],
    hero: {
      ...english.hero,
      liveNpt: "नेपाल समय",
      kathmanduNepal: "काठमाडौं, नेपाल",
      badge: "विदेशमा रहेका नेपालीका लागि स्थानीय प्राथमिकतासहितको प्रिमियम फिनटेक प्लेटफर्म।",
      headline: ["आजै योजना बनाऔं,", "आर्थिक स्वतन्त्रता हासिल गरौं,", "र सम्मानका साथ नेपाल फर्कौं।"],
      description: "ड्यासबोर्ड, OCR तलब विश्लेषण, FIRE सिमुलेसन, AI वित्तीय सहायक र स्वचालन प्रणाली — सबै एउटै प्लेटफर्ममा।",
      startDashboard: "ड्यासबोर्ड सुरु गर्नुहोस्",
      runSimulation: "FIRE सिमुलेसन चलाउनुहोस्",
      importPayslip: "कोरियाको तलब पर्ची आयात गर्नुहोस्",
      featureCards: [
        { title: "सम्पत्ति प्रणाली", body: "पोर्टफोलियो, सहायक र स्वचालन" },
        { title: "नगद प्रवाह प्रणाली", body: "खर्च, बचत दर र OCR" },
        { title: "सिमुलेसन डेस्क", body: "परिदृश्य विश्लेषण र तनाव परीक्षण" },
        { title: "गोपनीयता", body: "डेटा ब्राउजरमै रहन्छ" },
      ],
      returnReadiness: "नेपाल फर्कने तयारी",
      snapshot: "संस्थागत स्तरको नमुना स्न्यापशट",
      liveUi: "लाइभ दृश्य",
      progressLabels: ["FIRE कोष", "आपतकालीन कोष", "KRW रेमिटेन्स योजना"],
      savedInKorea: "कोरियामा बचत",
      nepalCorpus: "नेपाल कोष",
      watchDemo: "डेमो हेर्नुहोस्",
    },
    home: {
      ...english.home,
      topLinks: ["युट्युब", "ब्लग", "उपकरण", "हाम्रो बारेमा"],
      tools: [
        { title: "विश्व वित्तीय बुद्धिमत्ता", body: "लाइभ विनिमय दर, NEPSE, कोरियाली सेयर र आर्थिक संकेतक", href: "/global-financial-intelligence" },
        { title: "स्मार्ट ऋण प्रणाली", body: "ऋण, EMI, ब्याज र भुक्तानी मिति व्यवस्थापन", href: "/smart-loan-os" },
        { title: "मुद्रा रूपान्तरण", body: "KRW देखि NPR सम्मको लाइभ योजना", href: "/currency-converter" },
        { title: "शिशु योजना अनुमानक", body: "कोरिया पछिका पारिवारिक लक्ष्यहरू", href: "/baby-plan-estimator" },
        { title: "रेमिटेन्स क्याल्कुलेटर", body: "शुल्क र समय तुलना गर्नुहोस्", href: "/remittance-calculator" },
        { title: "SIP क्याल्कुलेटर", body: "मासिक लगानी वृद्धिको अनुमान", href: "/sip-calculator" },
        { title: "लम्पसम क्याल्कुलेटर", body: "एकमुष्ट लगानी वृद्धिको अनुमान", href: "/lumpsum-calculator" },
        { title: "SWP क्याल्कुलेटर", body: "सुरक्षित निकासी र निवृत्तिभरण नगद प्रवाह", href: "/swp-calculator" },
        { title: "नगद प्रवाह ड्यासबोर्ड", body: "आम्दानी, बचत दर र आपतकालीन रनवे", href: "/cashflow-dashboard" },
        { title: "FIRE सारांश", body: "कुल सम्पत्ति, नगद प्रवाह र 25× प्रगति एउटै दृश्यमा", href: "/fire-summary" },
        { title: "कोरिया पेन्सन + सेवरेन्स", body: "तलब पर्ची OCR, पेन्सन र सेवरेन्स विश्लेषण", href: "/korea-pension-dashboard" },
        { title: "ऋण क्याल्कुलेटर", body: "नेपाल फर्कने योजनाका लागि EMI", href: "/loan-calculator" },
        { title: "मुद्रास्फीति क्याल्कुलेटर", body: "NPR को भविष्य मूल्य", href: "/inflation-calculator" },
        { title: "खर्च हिसाब खाता", body: "रुममेट खाना र कोठा खर्च मिलान", href: "/expense-dashboard" },
      ],
      fireTools: [
        { title: "विश्व वित्तीय बुद्धिमत्ता", body: "लाइभ FX, NEPSE, KOSPI, धातु र FIRE जोखिम", href: "/global-financial-intelligence" },
        { title: "स्मार्ट ऋण प्रणाली", body: "ऋण, EMI, ब्याज र भुक्तानी व्यवस्थापन", href: "/smart-loan-os" },
        { title: "FIRE सारांश", body: "कुल सम्पत्ति, रनवे र FIRE प्रतिशत एकीकृत", href: "/fire-summary" },
        { title: "नगद प्रवाह ड्यासबोर्ड", body: "आम्दानी, खर्च, आपतकालीन कोष र FIRE गति", href: "/cashflow-dashboard" },
        { title: "खर्च ट्र्याकर", body: "रुममेट र दैनिक खर्च ट्र्याक गर्नुहोस्", href: "/expense-dashboard" },
        { title: "बचत ट्र्याकर", body: "मासिक KRW/NPR बचत वृद्धि", href: "#dashboard" },
        { title: "रिमाइन्डर योजनाकार", body: "बिल, विद्यालय शुल्क र परिवारसँग साझा सूचना", href: "/smart-reminders" },
        { title: "SIP क्याल्कुलेटर", body: "दीर्घकालीन लगानी वृद्धिको क्याल्कुलेटर", href: "/sip-calculator" },
        { title: "लम्पसम क्याल्कुलेटर", body: "एकमुष्ट KRW/NPR कम्पाउन्डिङ", href: "/lumpsum-calculator" },
        { title: "SWP क्याल्कुलेटर", body: "मुद्रास्फीतिसहित निकासी र रनवे", href: "/swp-calculator" },
        { title: "कोरिया पेन्सन + सेवरेन्स", body: "OCR तलब पर्ची, 국민연금 र 퇴직금", href: "/korea-pension-dashboard" },
        { title: "मुद्रा रूपान्तरण", body: "KRW देखि NPR लाइभ रूपान्तरण", href: "/currency-converter" },
        { title: "नेपाल फर्कने योजनाकार", body: "नेपाल फर्कने लक्ष्य योजना", href: "/return-to-nepal" },
        { title: "आपतकालीन कोष", body: "सुरक्षा कोषको प्रगति ट्र्याकर", href: "/emergency-fund" },
        { title: "लगानी योजनाकार", body: "सेयर, SIP र म्युचुअल फन्ड योजना", href: "#investments" },
      ],
      loanCards: [
        { title: "स्मार्ट ऋण प्रणाली", body: "ऋण, EMI, ब्याज र भुक्तानी मिति व्यवस्थापन", href: "/smart-loan-os", badge: "लाइभ" },
        { title: "भुक्तानी मिति व्यवस्थापक", body: "भुक्तानी काउन्टडाउन, ढिलाइ चेतावनी र परिवारसँग साझा रिमाइन्डर।", href: "/smart-loan-os#analytics", badge: "सूचना" },
        { title: "EMI योजनाकार", body: "EMI, घट्दो ब्यालेन्स, किस्ता तालिका र भुक्तानी तयारी।", href: "/smart-loan-os#interest-calculator", badge: "योजना" },
        { title: "ब्याज क्याल्कुलेटर", body: "सरल, चक्रवृद्धि, दैनिक, मासिक र ढिला जरिवाना सारांश।", href: "/smart-loan-os#interest-calculator", badge: "इन्जिन" },
        { title: "कागजात भल्ट", body: "नागरिकता, पासपोर्ट, सम्झौता, रसिद, स्क्रिनसट, QR र अडियो नोट।", href: "/smart-loan-os#vault", badge: "सुरक्षित" },
        { title: "QR भुक्तानी केन्द्र", body: "नेपाली वालेट QR, बैंक रसिद र भुक्तानी प्रमाण व्यवस्थापन।", href: "/smart-loan-os#vault", badge: "वालेट" },
        { title: "रिकभरी ट्र्याकर", body: "जोखिम विश्लेषण, ग्राहक स्कोर, भुक्तानी ग्राफ र रिकभरी प्रदर्शन।", href: "/smart-loan-os#clients", badge: "रिकभरी" },
        { title: "ग्राहक लेजर", body: "फोन, WhatsApp/Viber, परिचयपत्र, बैंक विवरण, नोट र टाइमलाइन प्रोफाइल।", href: "/smart-loan-os#clients", badge: "लेजर" },
      ],
      videos: [
        { title: "कोरियाली आम्दानीबाट FIRE रणनीति", duration: "9:05", gradient: "from-green-950 to-emerald-700" },
        { title: "नेपाल फर्केपछि निष्क्रिय आम्दानी", duration: "12:18", gradient: "from-amber-600 to-yellow-400" },
        { title: "नेपाल बजार लगानीका आधारभूत कुरा", duration: "8:29", gradient: "from-slate-900 to-green-700" },
      ],
      posts: [
        { title: "कोरियाको तलब नेपालबाट कसरी लगानी गर्ने", tag: "पैसा मार्गदर्शन", time: "५ मिनेट पढाइ" },
        { title: "विदेशमा नेपालीले गर्ने FIRE गल्तीहरू", tag: "निवृत्तिभरण", time: "७ मिनेट पढाइ" },
        { title: "घर फर्किनुअघि KRW देखि NPR मा के हेर्ने", tag: "मुद्रा", time: "४ मिनेट पढाइ" },
      ],
      testimonials: [
        { name: "बिकाश गुरुङ", place: "बुसान, कोरिया", quote: "यो योजनाकारले मेरो नेपाल फर्कने लक्ष्यलाई व्यावहारिक बनायो।" },
        { name: "सीता मगर", place: "इन्छन, कोरिया", quote: "बचत ट्र्याकर र खर्च योजनाले घर पैसा पठाउने मेरो तरिका परिवर्तन गर्‍यो।" },
        { name: "राजेश चौधरी", place: "डेगु, कोरिया", quote: "AI सल्लाहले आपतकालीन कोष र SIP का स्पष्ट कदम दियो।" },
        { name: "अनिता श्रेष्ठ", place: "सियोल, कोरिया", quote: "FIRE प्रगति, पारिवारिक लक्ष्य र तयारी एउटै ठाउँमा देख्न सक्छु।" },
      ],
      operatingSystemCards: [
        { title: "निवृत्ति तयारी", value: "नेपाल फर्कन ८२% तयार", detail: "FIRE स्कोर लाइभ अपडेट हुन्छ" },
        { title: "लक्ष्य ट्र्याकिङ", value: "काठमाडौं कोष लक्ष्य", detail: "रु 2.41Cr लक्ष्य म्याप गरिएको" },
        { title: "आपतकालीन योजना", value: "७.८ महिना सुरक्षित", detail: "सुरक्षा कोष सही दिशामा" },
        { title: "साझा कोठा वित्त", value: "रुममेट खर्च मिलान भयो", detail: "खर्च ड्यासबोर्ड खोल्नुहोस्" },
      ],
      smartInsights: [
        { title: "AI सिफारिस", insight: "मासिक बचत ₩180K बढाउँदा FIRE लक्ष्य १४ महिना छिटो पुग्न सक्छ।" },
        { title: "स्मार्ट सूचना", insight: "भिसा नवीकरण र बीमा रिमाइन्डर १८ दिनपछि बाँकी छ।" },
        { title: "मुद्रा इनसाइट", insight: "आजको KRW/NPR दर योजनाबद्ध रेमिटेन्सका लागि अनुकूल छ।" },
      ],
      osBadge: "FIRE Nepal प्रणाली",
      osTitle: "कोरिया र नेपालबीचको तपाईंको प्रिमियम वित्तीय अपरेटिङ सिस्टम।",
      osBody: "बचत, FIRE तयारी, आपतकालीन सुरक्षा, AI सिफारिस, लाइभ मुद्रा र रुममेट वित्त ट्र्याकिङका लागि प्रेरणादायी ड्यासबोर्ड।",
      commandCenterTitle: "लाइभ वित्तीय कमाण्ड सेन्टर",
      commandCenterBody: "विदेशमा रहेका नेपालीका लागि व्यक्तिगत",
      live: "लाइभ",
      aiInsightsTitle: "AI आधारित इनसाइट्स",
      toolsHubBadge: "उपकरण केन्द्र",
      popularFireTools: "लोकप्रिय FIRE उपकरणहरू",
      toolsHubBody: "विदेशमा रहेका नेपालीका लागि बनाइएका स्मार्ट वित्तीय उपकरणहरू",
      exploreDashboard: "ड्यासबोर्ड हेर्नुहोस्",
      loanBadge: "स्मार्ट ऋण प्रणाली",
      loanTitle: "विदेशमा रहेका नेपालीका लागि ऋण, भुक्तानी, भल्ट र रिकभरी उपकरण।",
      loanBody: "परिवार ऋण, कोरिया रुममेट ड्यु, EMI दबाब, कागजात प्रमाण, QR रसिद र FIRE प्रभाव एउटै प्रिमियम क्रेडिट ड्यासबोर्डबाट व्यवस्थापन गर्नुहोस्।",
      openLoanOs: "ऋण प्रणाली खोल्नुहोस्",
      launch: "सुरु गर्नुहोस्",
      investmentCards: {
        ...english.home.investmentCards,
        actionCalculateNow: "अहिले गणना गर्नुहोस्",
        actionCompareAll: "सबै तुलना गर्नुहोस्",
        actionTrackNow: "अहिले ट्र्याक गर्नुहोस्",
        actionCheckDetails: "विवरण हेर्नुहोस्",
        actionCalculateMine: "मेरो गणना गर्नुहोस्",
        nepalCostTitle: "नेपालको जीवनयापन खर्च",
        cityLife: "शहरको जीवन",
        villageLife: "गाउँको जीवन",
        minimumLife: "न्यूनतम खर्च",
        investmentPlanner: "लगानी योजनाकार",
        mutualFunds: "म्युचुअल फन्ड",
        stockMarket: "सेयर बजार",
        realEstate: "घरजग्गा",
        fixedDeposit: "मुद्दती निक्षेप",
        lumpsumCalculator: "लम्पसम क्याल्कुलेटर",
        oneTimeGrowth: "एकमुष्ट लगानी वृद्धि",
        compoundScore: "चक्रवृद्धि स्कोर",
        compoundBody: "KRW/NPR टगल, मुद्रास्फीति प्रभाव र नेपाल निवृत्ति प्रक्षेपण।",
        savingsTracker: "बचत ट्र्याकर",
        monthlySavings: "मासिक बचत",
        totalSaved: "कुल बचत",
        thisMonthProgress: "यो महिनाको प्रगति",
        returnToNepal: "के म नेपाल फर्किन सक्छु?",
        emergencyFund: "आपतकालीन कोष",
        passiveIncome: "निष्क्रिय आम्दानी",
        targetCorpus: "लक्षित कोष",
        recommended: "सिफारिस",
        yourFund: "तपाईंको कोष",
        readiness: "तयारी",
      },
      popularTools: "लोकप्रिय उपकरणहरू",
      viewAllTools: "सबै उपकरण हेर्नुहोस्",
      open: "खोल्नुहोस्",
      latestVideos: "नयाँ युट्युब भिडियोहरू",
      latestPosts: "नयाँ ब्लग लेखहरू",
      viewAll: "सबै हेर्नुहोस्",
      currencyConverter: "मुद्रा रूपान्तरण",
      krwWon: "KRW - दक्षिण कोरियाली वन",
      nprRupee: "NPR - नेपाली रुपैयाँ",
      converterNote: "1 KRW ~ 0.1079 NPR। ट्रान्सफर शुल्कसहित रेमिटेन्स योजना बनाउनुहोस्।",
      openLiveDashboard: "लाइभ ड्यासबोर्ड खोल्नुहोस्",
      aiAdvisorBadge: "AI वित्तीय सल्लाहकार",
      aiAdvisorTitle: "नेपाली, कोरियाली वा अंग्रेजीमा सोध्नुहोस्। स्पष्ट FIRE कार्ययोजना पाउनुहोस्।",
      aiAdvisorBody: "निवृत्ति निष्क्रिय आम्दानी, कर बचत टिप्स, रेमिटेन्स समय, आपतकालीन योजना र कोरिया-नेपालबीच सम्पत्ति निर्माणका लागि व्यक्तिगत सल्लाह।",
      advisorTopics: ["निवृत्ति आम्दानी", "लगानी सल्लाह", "कर बचत टिप्स", "आपतकालीन योजना", "सम्पत्ति निर्माण"],
      fireBot: "FIRE बोट",
      fireBotStatus: "अनलाइन - पोर्टफोलियो सचेत",
      fireBotMessage: "तपाईंको KRW आम्दानीका आधारमा मासिक ₩1.2M बचत गर्नुहोस्, ६ महिनाको NPR नगद राख्नुहोस्, र नयाँ लगानी 60% म्युचुअल फन्ड, 25% FD, 15% इक्विटीमा बाँड्नुहोस्।",
      askPlaceholder: "AI सल्लाहकारलाई सोध्नुहोस्...",
      ask: "सोध्नुहोस्",
      communityTitle: "हाम्रो समुदायले के भन्छ",
      seeReviews: "सबै समीक्षा हेर्नुहोस्",
      footerTitle: "FIRE Nepal अपडेट पाउनुहोस्",
      footerBody: "नेपाली कामदारका लागि FIRE टिप्स, KRW अलर्ट, र लगानी रणनीति।",
      emailPlaceholder: "तपाईंको इमेल लेख्नुहोस्",
      subscribe: "अहिले सदस्य बन्नुहोस्",
      footerBrandBody: "KRW देखि NPR योजना, बचत ट्र्याकिङ, लगानी शिक्षा, र नेपाल फर्कने तयारी एउटै प्रिमियम ड्यासबोर्डमा।",
      footerColumns: [
        { heading: "उपकरण", links: ["FIRE क्याल्कुलेटर", "बचत ट्र्याकर", "लगानी योजनाकार", "AI क्याल्कुलेटर"] },
        { heading: "सिक्नुहोस्", links: ["ब्लग", "युट्युब भिडियो", "FIRE गाइड", "कोरियाली अर्थतन्त्र"] },
        { heading: "कम्पनी", links: ["हाम्रो बारेमा", "सम्पर्क", "गोपनीयता नीति", "सेवा सर्तहरू"] },
      ],
      copyright: "© २०२६ FIRE Nepal। सर्वाधिकार सुरक्षित।",
      builtFor: "नेपाल फर्किने कोरियाका कामदारका लागि बनाइएको।",
    },
    trust: {
      ...english.trust,
      encryption: "बैंक-स्तरको इन्क्रिप्सन",
      trustLayer: "विश्वास तह",
      title: "विदेशमा रहेका नेपालीका लागि आधुनिक फिनटेक स्तरको सुरक्षा र गोपनीयता।",
      body: "FIRE Nepal ले तपाईंको डेटा बेच्दैन। पासवर्ड उद्योग-मानक ह्यासिङबाट सुरक्षित हुन्छ, सेसनहरू कडा कुकीहरूबाट चल्छन्, र तपाईंले इन्क्रिप्टेड क्लाउड सिंक रोज्नुअघि वित्तीय बुद्धिमत्ता स्थानीय रूपमा प्राथमिक रहन्छ।",
      bullets: [
        "वित्तीय डेटा ट्रान्जिटमा इन्क्रिप्ट हुन्छ; संवेदनशील कार्यक्षेत्र डेटा पूर्वनिर्धारित रूपमा तपाईंको डिभाइसमै रहन्छ।",
        "निर्यात र मेटाउने नियन्त्रण तपाईंको हातमा हुन्छ — हामी व्यक्तिगत वित्तीय व्यवहारबाट आम्दानी गर्दैनौं।",
        "कोरिया र डायस्पोराका नेपालीका लागि बनाइएको — NPR, KRW र USD सन्दर्भ बुझ्छ।",
      ],
      createAccount: "सुरक्षित खाता बनाउनुहोस्",
      securityCenter: "सुरक्षा केन्द्र",
      cards: [
        { title: "गोपनीयता-प्राथमिक संरचना", body: "पोर्टफोलियो इन्जिन, नगद प्रवाह र OCR तपाईंको ब्राउजरमै चल्छन्। कुनै मौन डेटा दलाली छैन।" },
        { title: "सुरक्षित प्रमाणीकरण", body: "इमेल प्रमाणीकरण, httpOnly सेसन कुकी र प्रिमियम सदस्य ड्यासबोर्ड।" },
        { title: "स्थानीय प्राथमिकता बुद्धिमत्ता", body: "तपाईंका योजना उपकरणले सबै इनपुटलाई जबर्जस्ती क्लाउड प्रोफाइलमा पठाउँदैनन्।" },
        { title: "पारदर्शी नियन्त्रण", body: "सुरक्षा स्क्रिनले के भण्डारण, सिंक, निर्यात र मेटिन्छ भन्ने स्पष्ट देखाउँछ।" },
        { title: "उत्पादन-तयार बाटो", body: "डेटाबेस-अट-रेस्ट किज, रिफ्रेस रोटेसन र असामान्य गतिविधि सूचना यो विश्वास तहसँग मिल्छन्।" },
      ],
    },
  },
};

/** Multilingual copy for the homepage AI Financial Advisor section (en / np / kr / ja). */

import type { LanguageCode } from "@/lib/i18n/homepage-translations";

export type HomepageFireAiQuickPrompt = {
  id: string;
  label: string;
  /** Message sent to the AI / local engine */
  prompt: string;
};

export type HomepageFireAiCopy = {
  badge: string;
  title: string;
  subtitle: string;
  trustLine: string;
  fireBot: string;
  statusOnline: string;
  statusThinking: string;
  emptyTitle: string;
  askPlaceholder: string;
  ask: string;
  asking: string;
  disclaimer: string;
  languageAria: string;
  readinessTitle: string;
  estimatedReturn: string;
  monthlySavings: string;
  fireTarget: string;
  yearsSuffix: string;
  missingDataHint: string;
  errorTitle: string;
  errorBody: string;
  openFullChat: string;
  followUpsLabel: string;
  toolsLabel: string;
  talkToFireAi: string;
  stopListening: string;
  speak: string;
  stopSpeaking: string;
  listening: string;
  processing: string;
  speaking: string;
  voiceUnsupported: string;
  voicePermissionDenied: string;
  startActions: Array<{ id: string; label: string; prompt: string }>;
  quickPrompts: HomepageFireAiQuickPrompt[];
  followUps: string[];
  toolLinks: Array<{ label: string; href: string }>;
};

const TOOL_LINKS = [
  { label: "Currency Converter", href: "/currency-converter" },
  { label: "Remittance Calculator", href: "/remittance-calculator" },
  { label: "FIRE Calculator", href: "/#dashboard" },
  { label: "Saving Goals", href: "/savings-tracker" },
  { label: "FIRE Summary", href: "/fire-summary" },
  { label: "Insurance", href: "/insurance" },
] as const;

const english: HomepageFireAiCopy = {
  badge: "AI Financial Advisor",
  title: "Your personal FIRE guide for building wealth abroad and planning your return to Nepal.",
  subtitle: "Ask about savings, remittance, investing, retirement, insurance, taxes, or your Nepal return plan.",
  trustLine: "Educational guidance for Nepalis abroad — grounded in your FIRE Nepal numbers when available.",
  fireBot: "FIRE Bot",
  statusOnline: "Ready · portfolio-aware when signed in",
  statusThinking: "Thinking…",
  emptyTitle: "Where should we start?",
  askPlaceholder: "Ask FIRE AI anything about your FIRE plan…",
  ask: "Ask",
  asking: "Asking…",
  disclaimer:
    "FIRE AI provides educational guidance, not personalized regulated financial advice. Investment decisions involve risk.",
  languageAria: "Advisor language",
  readinessTitle: "FIRE Readiness",
  estimatedReturn: "Estimated Nepal Return",
  monthlySavings: "Monthly Savings",
  fireTarget: "FIRE Target",
  yearsSuffix: "years",
  missingDataHint: "Connect cashflow & portfolio for live numbers",
  errorTitle: "FIRE AI is temporarily unavailable.",
  errorBody: "Your existing FIRE tools are still available.",
  openFullChat: "Open full FIRE AI chat",
  followUpsLabel: "Suggested follow-ups",
  toolsLabel: "Useful tools",
  talkToFireAi: "Talk to FIRE AI",
  stopListening: "Stop listening",
  speak: "Speak",
  stopSpeaking: "Stop",
  listening: "Listening…",
  processing: "Processing…",
  speaking: "Speaking…",
  voiceUnsupported: "Voice isn’t supported in this browser — type your question instead.",
  voicePermissionDenied: "Microphone access was blocked. You can still type your question.",
  startActions: [
    { id: "fire-number", label: "My FIRE number", prompt: "What is my FIRE number based on my current data?" },
    { id: "return-plan", label: "Nepal return plan", prompt: "Plan my return to Nepal" },
    { id: "savings-plan", label: "Monthly savings plan", prompt: "How much should I save every month?" },
    { id: "remittance", label: "Remittance strategy", prompt: "Should I send money to Nepal now?" },
    { id: "insurance", label: "Insurance check", prompt: "How much insurance do I need?" },
    { id: "risk", label: "Investment risk", prompt: "Check my investment risk" },
  ],
  quickPrompts: [
    { id: "years-return", label: "How many years until I can return to Nepal?", prompt: "How many years until I can return to Nepal?" },
    { id: "save-month", label: "How much should I save every month?", prompt: "How much should I save every month?" },
    { id: "fire-journey", label: "Plan my FIRE journey", prompt: "Plan my FIRE journey" },
    { id: "send-now", label: "Should I send money to Nepal now?", prompt: "Should I send money to Nepal now?" },
    { id: "emergency", label: "How much emergency fund do I need?", prompt: "How much emergency fund do I need?" },
    { id: "invest-risk", label: "Check my investment risk", prompt: "Check my investment risk" },
    { id: "retirement", label: "Plan my retirement", prompt: "Plan my retirement" },
    { id: "insurance-need", label: "How much insurance do I need?", prompt: "How much insurance do I need?" },
  ],
  followUps: [
    "Show me a 5-year plan",
    "Calculate my FIRE gap",
    "What if I save 20% more?",
    "Compare returning in 5 vs 10 years",
  ],
  toolLinks: [...TOOL_LINKS],
};

const nepali: HomepageFireAiCopy = {
  ...english,
  badge: "AI वित्तीय सल्लाहकार",
  title: "विदेशमा सम्पत्ति बनाउँदै नेपाल फर्कने योजनाका लागि तपाईंको व्यक्तिगत FIRE गाइड।",
  subtitle: "बचत, रेमिटेन्स, लगानी, निवृत्ति, बीमा, कर, वा नेपाल फर्कने योजनाबारे सोध्नुहोस्।",
  trustLine: "नेपालीहरूका लागि शैक्षिक मार्गदर्शन — उपलब्ध हुँदा तपाईंको FIRE Nepal तथ्यांकमा आधारित।",
  fireBot: "FIRE बोट",
  statusOnline: "तयार · साइन इन गर्दा पोर्टफोलियो-सचेत",
  statusThinking: "सोच्दै…",
  emptyTitle: "कहाँबाट सुरु गर्ने?",
  askPlaceholder: "आफ्नो FIRE योजनाबारे FIRE AI लाई सोध्नुहोस्…",
  ask: "सोध्नुहोस्",
  asking: "सोध्दै…",
  disclaimer:
    "FIRE AI ले शैक्षिक मार्गदर्शन दिन्छ, नियमन गरिएको व्यक्तिगत वित्तीय सल्लाह होइन। लगानीमा जोखिम हुन्छ।",
  languageAria: "सल्लाहकार भाषा",
  readinessTitle: "FIRE तयारी",
  estimatedReturn: "अनुमानित नेपाल फिर्ती",
  monthlySavings: "मासिक बचत",
  fireTarget: "FIRE लक्ष्य",
  yearsSuffix: "वर्ष",
  missingDataHint: "लाइभ अंकका लागि क्यासफ्लो र पोर्टफोलियो जोड्नुहोस्",
  errorTitle: "FIRE AI अहिले उपलब्ध छैन।",
  errorBody: "तपाईंका FIRE उपकरणहरू अझै उपलब्ध छन्।",
  openFullChat: "पूर्ण FIRE AI च्याट खोल्नुहोस्",
  followUpsLabel: "सुझावित थप प्रश्नहरू",
  toolsLabel: "उपयोगी उपकरणहरू",
  talkToFireAi: "FIRE AI सँग बोल्नुहोस्",
  stopListening: "सुन्न रोक्नुहोस्",
  speak: "आवाजमा सुनाउनुहोस्",
  stopSpeaking: "रोक्नुहोस्",
  listening: "सुन्दै…",
  processing: "प्रशोधन गर्दै…",
  speaking: "बोलिरहेको…",
  voiceUnsupported: "यो ब्राउजरमा भ्वाइस उपलब्ध छैन — प्रश्न टाइप गर्नुहोस्।",
  voicePermissionDenied: "माइक्रोफोन अनुमति रोकियो। तपाईं अझै प्रश्न टाइप गर्न सक्नुहुन्छ।",
  startActions: [
    { id: "fire-number", label: "मेरो FIRE अंक", prompt: "मेरो हालको तथ्यांकअनुसार FIRE number कति हो?" },
    { id: "return-plan", label: "नेपाल फिर्ती योजना", prompt: "नेपाल फर्कने योजना बनाइदिनुहोस्" },
    { id: "savings-plan", label: "मासिक बचत योजना", prompt: "म प्रत्येक महिना कति बचत गर्नुपर्छ?" },
    { id: "remittance", label: "रेमिटेन्स रणनीति", prompt: "अहिले नेपाल पठाउनु राम्रो हो?" },
    { id: "insurance", label: "बीमा जाँच", prompt: "मलाई कति बीमा चाहिन्छ?" },
    { id: "risk", label: "लगानी जोखिम", prompt: "मेरो लगानी जोखिम जाँच्नुहोस्" },
  ],
  quickPrompts: [
    { id: "years-return", label: "नेपाल फर्कन कति वर्ष लाग्छ?", prompt: "नेपाल फर्कन कति वर्ष लाग्छ?" },
    { id: "save-month", label: "मासिक कति बचत गर्ने?", prompt: "म प्रत्येक महिना कति बचत गर्नुपर्छ?" },
    { id: "fire-journey", label: "मेरो FIRE यात्रा योजना", prompt: "मेरो FIRE यात्रा योजना बनाइदिनुहोस्" },
    { id: "send-now", label: "अहिले रेमिटेन्स पठाउने?", prompt: "अहिले नेपाल पैसा पठाउनु राम्रो हो?" },
    { id: "emergency", label: "आपतकालीन कोष कति?", prompt: "मलाई कति आपतकालीन कोष चाहिन्छ?" },
    { id: "invest-risk", label: "लगानी जोखिम जाँच", prompt: "मेरो लगानी जोखिम जाँच्नुहोस्" },
    { id: "retirement", label: "निवृत्ति योजना", prompt: "मेरो निवृत्ति योजना बनाइदिनुहोस्" },
    { id: "insurance-need", label: "बीमा कति चाहिन्छ?", prompt: "मलाई कति बीमा चाहिन्छ?" },
  ],
  followUps: [
    "५ वर्षे योजना देखाउनुहोस्",
    "मेरो FIRE gap हिसाब गर्नुहोस्",
    "२०% बढी बचत गरे के हुन्छ?",
    "५ vs १० वर्षमा फर्कने तुलना",
  ],
  toolLinks: [
    { label: "मुद्रा कन्भर्टर", href: "/currency-converter" },
    { label: "रेमिटेन्स क्याल्कुलेटर", href: "/remittance-calculator" },
    { label: "FIRE क्याल्कुलेटर", href: "/#dashboard" },
    { label: "बचत लक्ष्य", href: "/savings-tracker" },
    { label: "FIRE सारांश", href: "/fire-summary" },
    { label: "बीमा", href: "/insurance" },
  ],
};

const korean: HomepageFireAiCopy = {
  ...english,
  badge: "AI 금융 어드바이저",
  title: "해외에서 자산을 만들고 네팔 귀국을 준비하는 나만의 FIRE 가이드.",
  subtitle: "저축, 송금, 투자, 은퇴, 보험, 세금, 네팔 귀국 계획에 대해 질문하세요.",
  trustLine: "해외 거주 네팔인을 위한 교육용 가이드 — 가능하면 FIRE Nepal 수치를 기반으로 합니다.",
  fireBot: "FIRE Bot",
  statusOnline: "준비됨 · 로그인 시 포트폴리오 인식",
  statusThinking: "생각 중…",
  emptyTitle: "어디서 시작할까요?",
  askPlaceholder: "FIRE 계획에 대해 FIRE AI에게 물어보세요…",
  ask: "질문",
  asking: "질문 중…",
  disclaimer: "FIRE AI는 교육용 안내를 제공합니다. 규제된 맞춤 금융 자문이 아니며, 투자에는 위험이 따릅니다.",
  languageAria: "어드바이저 언어",
  readinessTitle: "FIRE 준비도",
  estimatedReturn: "예상 네팔 귀국",
  monthlySavings: "월 저축",
  fireTarget: "FIRE 목표",
  yearsSuffix: "년",
  missingDataHint: "실시간 수치를 위해 캐시플로·포트폴리오를 연결하세요",
  errorTitle: "FIRE AI를 일시적으로 사용할 수 없습니다.",
  errorBody: "기존 FIRE 도구는 계속 사용할 수 있습니다.",
  openFullChat: "전체 FIRE AI 채팅 열기",
  followUpsLabel: "추천 후속 질문",
  toolsLabel: "유용한 도구",
  talkToFireAi: "FIRE AI와 대화",
  stopListening: "듣기 중지",
  speak: "읽어주기",
  stopSpeaking: "중지",
  listening: "듣는 중…",
  processing: "처리 중…",
  speaking: "말하는 중…",
  voiceUnsupported: "이 브라우저에서는 음성을 지원하지 않습니다 — 질문을 입력하세요.",
  voicePermissionDenied: "마이크 권한이 차단되었습니다. 여전히 텍스트로 질문할 수 있습니다.",
  startActions: [
    { id: "fire-number", label: "내 FIRE 숫자", prompt: "현재 데이터 기준 내 FIRE number는?" },
    { id: "return-plan", label: "네팔 귀국 계획", prompt: "네팔 귀국을 계획해 주세요" },
    { id: "savings-plan", label: "월 저축 계획", prompt: "매월 얼마를 저축해야 하나요?" },
    { id: "remittance", label: "송금 전략", prompt: "지금 네팔로 송금해야 할까요?" },
    { id: "insurance", label: "보험 점검", prompt: "보험은 얼마나 필요할까요?" },
    { id: "risk", label: "투자 위험", prompt: "내 투자 위험을 점검해 주세요" },
  ],
  quickPrompts: [
    { id: "years-return", label: "네팔 귀국까지 몇 년?", prompt: "네팔로 돌아갈 때까지 몇 년이 걸릴까요?" },
    { id: "save-month", label: "매월 얼마 저축?", prompt: "매월 얼마를 저축해야 하나요?" },
    { id: "fire-journey", label: "FIRE 여정 계획", prompt: "내 FIRE 여정을 계획해 주세요" },
    { id: "send-now", label: "지금 송금할까?", prompt: "지금 네팔로 돈을 보내야 할까요?" },
    { id: "emergency", label: "비상금은 얼마?", prompt: "비상자금은 얼마가 필요할까요?" },
    { id: "invest-risk", label: "투자 위험 점검", prompt: "내 투자 위험을 점검해 주세요" },
    { id: "retirement", label: "은퇴 계획", prompt: "내 은퇴를 계획해 주세요" },
    { id: "insurance-need", label: "보험은 얼마?", prompt: "보험은 얼마나 필요할까요?" },
  ],
  followUps: [
    "5년 계획을 보여주세요",
    "FIRE gap을 계산해 주세요",
    "20% 더 저축하면?",
    "5년 vs 10년 귀국 비교",
  ],
  toolLinks: [
    { label: "환율 변환기", href: "/currency-converter" },
    { label: "송금 계산기", href: "/remittance-calculator" },
    { label: "FIRE 계산기", href: "/#dashboard" },
    { label: "저축 목표", href: "/savings-tracker" },
    { label: "FIRE 요약", href: "/fire-summary" },
    { label: "보험", href: "/insurance" },
  ],
};

const japanese: HomepageFireAiCopy = {
  ...english,
  badge: "AI金融アドバイザー",
  title: "海外で資産を築き、ネパール帰国を計画するためのパーソナルFIREガイド。",
  subtitle: "貯蓄、送金、投資、退職、保険、税金、ネパール帰国プランについて質問できます。",
  trustLine: "在外ネパール人向けの教育的ガイダンス — 可能な範囲でFIRE Nepalの数値に基づきます。",
  fireBot: "FIRE Bot",
  statusOnline: "準備完了 · ログイン時はポートフォリオ連携",
  statusThinking: "考え中…",
  emptyTitle: "どこから始めますか？",
  askPlaceholder: "FIRE計画についてFIRE AIに質問…",
  ask: "質問",
  asking: "送信中…",
  disclaimer: "FIRE AIは教育的な案内であり、規制対象の個別金融助言ではありません。投資にはリスクがあります。",
  languageAria: "アドバイザー言語",
  readinessTitle: "FIRE準備度",
  estimatedReturn: "推定ネパール帰国",
  monthlySavings: "月次貯蓄",
  fireTarget: "FIRE目標",
  yearsSuffix: "年",
  missingDataHint: "ライブ数値にはキャッシュフローとポートフォリオを接続",
  errorTitle: "FIRE AIは一時的に利用できません。",
  errorBody: "既存のFIREツールは引き続き利用できます。",
  openFullChat: "フルFIRE AIチャットを開く",
  followUpsLabel: "おすすめの追加質問",
  toolsLabel: "便利なツール",
};

const COPY: Record<LanguageCode, HomepageFireAiCopy> = {
  en: english,
  np: nepali,
  kr: korean,
  ja: japanese,
};

export function getHomepageFireAiCopy(language: LanguageCode): HomepageFireAiCopy {
  return COPY[language] ?? english;
}

export const HOMEPAGE_AI_LANGUAGE_OPTIONS: Array<{
  code: LanguageCode;
  flag: string;
  label: string;
}> = [
  { code: "np", flag: "🇳🇵", label: "नेपाली" },
  { code: "kr", flag: "🇰🇷", label: "한국어" },
  { code: "en", flag: "🇬🇧", label: "English" },
];

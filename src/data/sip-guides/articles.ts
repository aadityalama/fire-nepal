/**
 * Nepal-specific SIP educational articles for FIRE Nepal.
 * Educational only — returns are not guaranteed; no fund ratings or promised NAVs.
 */

export type SipGuideArticle = {
  slug: string;
  title: string;
  description: string;
  readingTime: string;
  lastUpdated: "2026-08-23";
  keywords: string[];
  /** Markdown-ish plain sections rendered by the page (use React-friendly structured blocks instead of raw markdown). */
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
    note?: string;
  }>;
};

export const SIP_GUIDE_HUB = {
  title: "SIP Guides for Nepal",
  description:
    "Practical SIP education for Nepali investors: how monthly mutual fund investing works under SEBON-regulated schemes, NPR examples, and planning tools — without guaranteed returns.",
};

export const SIP_GUIDE_ARTICLES: SipGuideArticle[] = [
  {
    slug: "sip-in-nepal-beginner-guide",
    title: "SIP in Nepal: Complete Beginner Guide",
    description:
      "Learn SIP in Nepal: SEBON-regulated mutual funds, typical NPR amounts, and how beginners can start monthly investing without treating returns as guaranteed.",
    readingTime: "11 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "SIP Nepal",
      "systematic investment plan Nepal",
      "mutual fund SIP beginner",
      "SEBON mutual fund",
      "NPR monthly investing",
    ],
    sections: [
      {
        heading: "What SIP means for Nepali investors",
        paragraphs: [
          "A Systematic Investment Plan (SIP) is a habit of investing a fixed amount of money at regular intervals — usually every month — into a mutual fund or similar pooled investment scheme. In Nepal, SIPs are commonly offered through capital companies and mutual fund schemes that operate under Securities Board of Nepal (SEBON) regulation.",
          "Instead of waiting until you have a large lump sum, you invest smaller amounts such as Rs 1,000, Rs 5,000, or Rs 15,000 each month. Over years, those contributions can grow through market-linked returns and compounding. Growth is never guaranteed: mutual fund NAVs move with markets, and past performance does not predict future results.",
        ],
      },
      {
        heading: "Why SIP fits everyday Nepali cash flow",
        paragraphs: [
          "Many households in Kathmandu and other cities receive salaries or remittances on a monthly cycle. Aligning investing with that rhythm is often easier than assembling Rs 200,000 or Rs 500,000 in one go.",
          "Typical minimum SIP amounts in Nepal often fall around Rs 500–1,000 per installment depending on the scheme — treat that as a common range, not a universal rule. Always confirm the current minimum with the specific fund house or distributor before you start.",
        ],
        bullets: [
          "Salary earners can automate a portion of take-home pay after essentials.",
          "Remittance receivers can earmark a fixed NPR amount when money arrives.",
          "Students or early-career workers can start small and increase later.",
        ],
        note: "Cost of living in Kathmandu varies widely by lifestyle. Use your own budget — not a generic city average — to decide what you can invest sustainably.",
      },
      {
        heading: "How SIP relates to SEBON-regulated mutual funds",
        paragraphs: [
          "In Nepal, publicly offered mutual funds and related capital market products are supervised within SEBON’s regulatory framework. That oversight covers licensing, disclosure, and market conduct expectations — it does not mean any scheme is “safe,” “approved as high return,” or guaranteed to beat inflation.",
          "When you buy units via SIP, you usually purchase at the prevailing Net Asset Value (NAV) on applicable dealing days. NAV can rise or fall. Educational illustrations often use assumed annual returns such as 8–12% only to show math; those figures are estimates, not promises from any fund or from FIRE Nepal.",
        ],
      },
      {
        heading: "A concrete NPR beginner example",
        paragraphs: [
          "Suppose you invest Rs 5,000 every month for 10 years. Your total contributions would be Rs 600,000 (5,000 × 12 × 10). If you assume an illustrative 10% annualized return for projection only, the future value can be meaningfully higher than Rs 600,000 because of compounding — but markets can also deliver less, flat results, or losses over shorter windows.",
          "If you instead invest Rs 2,000 monthly for the same period, total invested is Rs 240,000. The lower contribution reduces both potential growth and downside exposure. Consistency usually matters more than starting with a large amount you cannot sustain.",
        ],
        note: "Illustrative returns of 8–12% are teaching assumptions only. Actual mutual fund results vary by scheme, fees, taxes, and market conditions.",
      },
      {
        heading: "Documents and setup steps (high level)",
        paragraphs: [
          "Opening a mutual fund SIP in Nepal generally involves KYC with the fund house or an authorized distributor, a bank account for debit or transfer, and choosing a scheme that matches your time horizon and risk comfort. Processes differ by institution; follow their official forms and disclosures.",
          "Before you commit, read the offer document: investment objective, asset mix, fees, exit loads if any, and risk factors. Prefer clarity over marketing language. If something promises “assured” market returns, treat that as a red flag for educational caution.",
        ],
        bullets: [
          "Confirm the scheme is offered through a properly authorized channel.",
          "Set a SIP amount that survives months when expenses spike.",
          "Decide an investment horizon in years, not weeks.",
        ],
      },
      {
        heading: "Common beginner questions",
        paragraphs: [
          "Can you pause a SIP? Many schemes allow stopping or modifying installments according to their rules — check the specific terms. Should you stop when markets fall? Historically, continuing disciplined buying during downturns is part of how rupee-cost averaging works, but only if your emergency fund and job stability allow it.",
          "Is SIP only for equity? In Nepal and elsewhere, SIPs can apply to different fund categories. Risk and expected volatility differ. Matching category to goal length matters more than chasing the highest recent chart.",
        ],
      },
      {
        heading: "Use a calculator before you commit money",
        paragraphs: [
          "Numbers feel abstract until you see them. Try the [SIP Calculator](/sip-calculator) with your real monthly NPR amount, time horizon, and a conservative assumed return so you understand contribution totals versus projected corpus — then stress-test with a lower assumption too.",
          "Treat every projection as a planning sketch. Pair it with emergency savings, insurance where appropriate, and a clear goal (education, home down payment, retirement buffer) so SIP is a tool, not a guess.",
        ],
      },
    ],
  },
  {
    slug: "how-sip-works-in-nepal",
    title: "How SIP Works in Nepal",
    description:
      "See how Nepal SIPs buy mutual fund units via NAV, how rupee-cost averaging works, and what SEBON oversight does — and does not — guarantee for investors.",
    readingTime: "10 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "how SIP works Nepal",
      "rupee cost averaging",
      "mutual fund NAV Nepal",
      "SEBON SIP",
      "monthly installment investing",
    ],
    sections: [
      {
        heading: "The basic SIP cycle",
        paragraphs: [
          "When you set up a SIP, you agree to invest a fixed NPR amount on a schedule (often monthly). On each installment date, that money is used to purchase units of the chosen mutual fund at the applicable NAV after fees and cut-off rules published by the fund.",
          "If NAV is Rs 20, a Rs 2,000 installment buys roughly 100 units (before fees). If NAV later falls to Rs 16, the same Rs 2,000 buys about 125 units. If NAV rises to Rs 25, you buy fewer units. Over time, your average purchase price can smooth some volatility — this is rupee-cost averaging, not a guarantee of profit.",
        ],
      },
      {
        heading: "Where Nepali SIPs typically sit in the market",
        paragraphs: [
          "SIP facilities in Nepal are commonly tied to mutual fund schemes and capital companies operating within SEBON’s regulatory perimeter. Investors usually interact via fund managers, banks, or authorized distributors. Always verify counterparties through official channels rather than informal tips.",
          "Regulation aims to improve transparency and investor protection standards. It does not remove market risk, credit risk inside portfolios, liquidity constraints, or the possibility of negative returns over your holding period.",
        ],
      },
      {
        heading: "From installment to units: a walkthrough",
        paragraphs: [
          "Imagine a 12-month SIP of Rs 3,000. You invest Rs 36,000 in total. Across months, you accumulate units at different NAVs. Your account value equals units held × current NAV. That value can be above or below Rs 36,000 at any checkpoint.",
          "Exit rules matter. Some schemes may have lock-ins, redemption windows, or exit loads. Read the scheme information carefully so your liquidity needs (job change, medical costs, travel) are not trapped by surprise restrictions.",
        ],
        note: "Never invent or rely on a specific fund’s live NAV from blog content. Check the fund’s official NAV publication for real numbers.",
      },
      {
        heading: "Compounding vs contribution — what actually drives the corpus",
        paragraphs: [
          "In early years, most of your SIP corpus is simply money you put in. Later, if returns are positive, growth on prior units can become a larger share of the total. That is why long horizons matter more than perfect timing of a single month.",
          "Illustrative teaching ranges such as 8–12% annualized are only for math demos. A rough intuition: Rs 10,000 monthly for 15 years invests Rs 1,800,000 in contributions; projected endings differ sharply if you assume 8% versus 12% — and reality may land outside either path.",
        ],
      },
      {
        heading: "Automation, bank debits, and missed installments",
        paragraphs: [
          "Many investors prefer standing instructions so SIP does not depend on remembering a transfer. If a debit fails due to insufficient balance, schemes handle skips differently. Build a buffer in your bank account around salary or remittance dates.",
          "If income is irregular — freelance, tourism seasons, or overseas overtime — consider a slightly lower fixed SIP plus occasional top-ups rather than an aggressive amount that forces frequent pauses.",
        ],
        bullets: [
          "Align SIP date with salary or remittance credit day.",
          "Keep an emergency fund outside market investments.",
          "Review SIP annually when income or goals change.",
        ],
      },
      {
        heading: "Taxes, fees, and the fine print (educational overview)",
        paragraphs: [
          "Mutual fund investing can involve expense ratios, entry/exit related charges where applicable, and tax treatment under Nepali law that may change over time. Fees reduce net returns even when gross markets are positive.",
          "This guide cannot replace a tax advisor or the scheme’s official documents. Use disclosures from SEBON-regulated issuers as the source of truth for costs and tax reporting obligations.",
        ],
      },
      {
        heading: "Model the mechanics before you start",
        paragraphs: [
          "To see how installment size and years interact under different assumed returns, [run your numbers in the SIP Calculator](/sip-calculator). Compare a base case and a pessimistic case so you understand downside in NPR terms, not just an optimistic headline.",
        ],
      },
    ],
  },
  {
    slug: "how-much-to-invest-in-sip-monthly",
    title: "How Much Should You Invest in SIP Every Month?",
    description:
      "Choose a sustainable monthly SIP in NPR using budget rules, Kathmandu cost context, remittance cash flow, and clear goals — not guaranteed return claims.",
    readingTime: "9 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "how much SIP monthly Nepal",
      "SIP amount NPR",
      "budget for SIP",
      "remittance SIP",
      "Kathmandu investing",
    ],
    sections: [
      {
        heading: "Start from cash flow, not from social media targets",
        paragraphs: [
          "The right SIP amount is the one you can continue through ordinary life stress — rent, school fees, festivals, medical visits — without raiding the investment every few months. A smaller continuous SIP usually beats a large SIP that stops after three installments.",
          "Minimums for many Nepali schemes often sit around Rs 500–1,000, depending on the product. That floor is about access, not about what you should invest. Your ceiling is set by surplus after essentials and emergency savings.",
        ],
      },
      {
        heading: "A practical budgeting sequence",
        paragraphs: [
          "List take-home income in NPR (salary, business drawings, remittance). Subtract non-negotiable living costs and debt EMIs. Set aside emergency cash (commonly discussed as several months of expenses — your number depends on job stability). Only then assign a SIP amount from remaining surplus.",
          "Kathmandu living costs differ by neighborhood, family size, and lifestyle. Use your actual ledger as context, not a viral “average expense” post. Two households with the same salary can responsibly choose very different SIPs.",
        ],
        bullets: [
          "Priority 1: essentials and high-interest debt.",
          "Priority 2: emergency buffer in liquid form.",
          "Priority 3: SIP aligned to multi-year goals.",
        ],
      },
      {
        heading: "NPR examples by surplus level (illustrative)",
        paragraphs: [
          "If your reliable monthly surplus is Rs 4,000, a SIP of Rs 1,500–2,500 may leave room for irregular costs. If surplus is Rs 20,000, a SIP of Rs 8,000–12,000 might be workable while keeping flexibility. These are teaching ranges, not recommendations for your household.",
          "Remittance-heavy households sometimes receive larger amounts less smoothly. One approach is a conservative base SIP (for example Rs 5,000) plus discretionary top-ups when a larger remittance arrives — still without treating markets as a guaranteed store of value. Whatever amount you choose, channel it only through authorized SEBON-regulated mutual fund or capital-company pathways you have verified.",
        ],
        note: "Any future-value illustration using 8–12% assumed annual returns is an estimate for planning math only. Returns are not guaranteed.",
      },
      {
        heading: "Goal-based sizing",
        paragraphs: [
          "Work backward from the goal. Suppose you want a rough educational corpus target of Rs 1,500,000 in 12 years. Different monthly SIPs under different assumed returns will map to different feasibility. If the required SIP exceeds your surplus, extend the timeline, lower the target, or increase income — do not stretch into unaffordable installments.",
          "For retirement-style goals decades away, even Rs 3,000–7,000 monthly can matter if sustained, especially if you later step up the amount as income grows. Near-term goals (under 3 years) may need more cash-heavy savings and less market risk — SIP is not automatically ideal for every horizon.",
        ],
      },
      {
        heading: "Income growth and step-ups",
        paragraphs: [
          "When you receive a raise, festival bonus, or higher overtime abroad, consider increasing SIP by a fixed percentage of the raise rather than lifestyle inflation alone. A step-up of 5–10% annually on the SIP amount is a common planning idea; whether it fits you depends on expenses and job security.",
          "Avoid sizing SIP to impress peers. Public comparison ignores debt, dependents, and risk capacity.",
        ],
      },
      {
        heading: "Stress-test the amount",
        paragraphs: [
          "Ask: if markets fall 20% and your job is uncertain for six months, can you keep the SIP without panic selling everything? If not, reduce the amount or strengthen cash reserves first.",
          "[Estimate monthly SIP scenarios](/sip-calculator) under multiple assumed returns and durations. Pick an installment that still looks sensible when you assume lower growth and higher inflation — not only the optimistic case.",
        ],
      },
    ],
  },
  {
    slug: "sip-vs-lumpsum-in-nepal",
    title: "SIP vs Lumpsum in Nepal",
    description:
      "Compare SIP and lumpsum investing in NPR terms: cash-flow fit, rupee-cost averaging, timing risk, and hybrids for remittance or bonus income in Nepal.",
    readingTime: "10 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "SIP vs lumpsum Nepal",
      "lumpsum mutual fund Nepal",
      "rupee cost averaging vs lumpsum",
      "NPR investment strategy",
      "remittance investing",
    ],
    sections: [
      {
        heading: "Two ways to deploy money",
        paragraphs: [
          "Lumpsum means investing a large amount at once — for example deploying Rs 300,000 from a bonus, land sale proceeds, or accumulated savings into a mutual fund in a single transaction. SIP means spreading purchases over time — for example Rs 10,000 every month for 30 months to deploy a similar total.",
          "Neither method is universally “better.” Outcomes depend on market path, fees, taxes, and your behavior. Educational content should not crown a winner; it should clarify trade-offs for Nepali cash-flow realities.",
        ],
      },
      {
        heading: "Cash-flow reality in Nepal",
        paragraphs: [
          "Salaried earners and many remittance receivers naturally accumulate money monthly. SIP matches that pattern. Lumpsum fits when cash is already idle in a bank account and you accept the timing risk of buying at today’s NAV.",
          "If Rs 500,000 sits in a low-interest account while you wait endlessly for a “perfect” market entry, inflation can quietly reduce purchasing power. That opportunity cost is real — yet rushing all cash into markets without an emergency buffer is also risky.",
        ],
      },
      {
        heading: "Rupee-cost averaging vs timing risk",
        paragraphs: [
          "SIP reduces the chance that your entire capital buys at a temporary peak. If markets fall after you start, later installments buy more units. If markets rise steadily, lumpsum that entered earlier may have more time in the market — which can help or hurt depending on the path.",
          "Example (illustrative only): deploying Rs 240,000 as lumpsum versus Rs 20,000 monthly for 12 months will produce different unit balances under rising, falling, or sideways NAV paths. No blog can know which path Nepal’s markets will take next.",
        ],
        note: "Assumed returns such as 8–12% used in calculators are estimates for comparison, not forecasts or guarantees.",
      },
      {
        heading: "Hybrid approaches many households use",
        paragraphs: [
          "A practical hybrid: keep 3–6+ months of expenses liquid (your judgment), invest a portion of idle surplus as lumpsum into a SEBON-regulated scheme you understand, and continue a monthly SIP from salary or remittance. Another hybrid: stagger a large amount over 3–6 monthly tranches — a short SIP-like deployment.",
          "NRN or overseas workers who remit a large amount once or twice a year often combine an immediate partial investment with a standing SIP from a Nepal bank account funded by remittance.",
        ],
        bullets: [
          "Lumpsum: higher timing risk, more time in market if invested earlier.",
          "SIP: smoother cash flow, gradual deployment, discipline support.",
          "Hybrid: balances idle-cash drag and entry-point risk.",
        ],
      },
      {
        heading: "Behavioral differences",
        paragraphs: [
          "Lumpsum investors may watch daily NAV swings on a large principal and feel pressure to exit after a short dip. SIP investors sometimes under-save because installments feel “too small” to matter — until years pass. Choose the structure that helps you stay invested for the planned horizon without constant second-guessing.",
          "Avoid loans taken specifically to lumpsum into markets. Borrowed money plus market volatility is a stressful combination for most households.",
        ],
      },
      {
        heading: "Compare paths with clear assumptions",
        paragraphs: [
          "Use the [SIP vs goal planner on the calculator](/sip-calculator) to translate monthly NPR amounts into long-horizon sketches, then separately ask what a lumpsum of your idle cash would imply under the same assumed return band. Decide based on surplus stability and risk comfort — not on social media certainty.",
        ],
      },
    ],
  },
  {
    slug: "step-up-sip-in-nepal",
    title: "Step-Up SIP in Nepal",
    description:
      "Learn step-up SIP in Nepal: raise monthly NPR amounts as income grows, review worked examples, avoid over-committing, and model those increases carefully.",
    readingTime: "9 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "step-up SIP Nepal",
      "increasing SIP amount",
      "SIP top-up Nepal",
      "salary raise investing",
      "NPR SIP increase",
    ],
    sections: [
      {
        heading: "What a step-up SIP is",
        paragraphs: [
          "A step-up (or top-up) SIP means you increase the installment amount on a schedule — for example raising Rs 5,000 monthly SIP by 10% each year. Some fund platforms support automatic annual increases; others require you to modify the mandate manually. Features vary by scheme and distributor in Nepal.",
          "The idea matches career progression: income often rises over a decade, so keeping SIP frozen at your first-job amount can leave investable surplus uninvested. Step-up is optional, not mandatory for success.",
        ],
      },
      {
        heading: "Why Nepali earners consider it",
        paragraphs: [
          "Private-sector raises, government grade increments, overseas overtime, and remittance growth can all expand surplus. Without a rule, lifestyle costs in cities like Kathmandu often absorb the entire raise.",
          "A simple heuristic some planners discuss: invest a portion of each raise (for example half of the net increase) into a higher SIP. Whether that split fits you depends on debt, dependents, and housing costs — it is an idea, not advice.",
        ],
      },
      {
        heading: "NPR illustration: flat SIP vs step-up",
        paragraphs: [
          "Flat case: Rs 8,000 every month for 15 years contributes Rs 1,440,000 in total installments. Step-up case: start at Rs 8,000 and increase 10% each year. Contributions in later years are higher, so total invested rises above Rs 1,440,000, and projected corpus under the same assumed return band is typically higher — if you actually sustain the increases.",
          "Under an illustrative 10% assumed annualized return (estimate only), the gap between flat and step-up projections can look large on paper. Markets may deliver more or less than that assumption; the math is for education.",
        ],
        note: "Returns are not guaranteed. A step-up that forces you to stop SIPs during tight years is worse than a flatter sustainable plan.",
      },
      {
        heading: "Operational tips under SEBON-regulated schemes",
        paragraphs: [
          "Confirm whether your chosen mutual fund channel allows scheduled step-ups or only ad-hoc changes. Update bank mandates so higher debits do not bounce. Re-read scheme rules if increasing SIP interacts with any caps or cut-off timings.",
          "SEBON oversight of mutual fund structures does not ensure your stepped-up contributions will earn a target rate. Higher contributions increase market exposure — both upside participation and drawdown size in NPR terms.",
        ],
      },
      {
        heading: "When not to step up",
        paragraphs: [
          "Pause increases if you lack emergency savings, carry expensive consumer debt, expect a near-term unpaid leave, or are saving for a home down payment needed in cash within a short horizon. Step-up is a long-horizon tool.",
          "Irregular remittance? Prefer flexible manual top-ups when money arrives rather than an aggressive automatic increase that fails often.",
        ],
        bullets: [
          "Keep emergency cash separate from SIP units.",
          "Raise SIP after the raise clears your account a few months, not on rumor of a raise.",
          "Review annually during Dashain/Tihar budget resets or fiscal-year planning.",
        ],
      },
      {
        heading: "Model the increase before you automate it",
        paragraphs: [
          "Open the [step-up friendly SIP Calculator](/sip-calculator), enter your starting monthly NPR amount, years, and an annual increase percentage, then compare against a flat SIP. Stress-test with a lower assumed return (for example nearer 8% rather than 12%) so the plan still feels acceptable.",
        ],
      },
    ],
  },
  {
    slug: "sip-return-calculation-explained",
    title: "SIP Return Calculation Explained",
    description:
      "Understand SIP future-value math in NPR, XIRR-style personal returns, and why 8–12% figures are planning estimates — not promised mutual fund returns.",
    readingTime: "11 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "SIP return calculation",
      "SIP future value formula",
      "XIRR SIP Nepal",
      "mutual fund returns NPR",
      "compounding SIP explained",
    ],
    sections: [
      {
        heading: "What people mean by “SIP return”",
        paragraphs: [
          "Colloquially, investors ask: “If I put Rs X monthly for Y years, what will I get?” Calculators answer with a projected future value under an assumed annual rate. That projection is not a contractual payout from a SEBON-regulated mutual fund.",
          "Actual account value equals units × live NAV (adjusted for corporate actions and fees as applicable). Your personal rate of return depends on the path of NAVs across every purchase date and any redemptions.",
        ],
      },
      {
        heading: "The standard future-value sketch",
        paragraphs: [
          "Many SIP calculators use a future-value-of-annuity style formula with monthly rate i = annual rate / 12 / 100, number of months n, and installment P. The formula assumes a constant rate every period — a teaching simplification markets do not obey.",
          "Example inputs: P = Rs 5,000, years = 10 (n = 120), assumed annual rate = 10%. Total invested = Rs 600,000. Projected FV under the constant-rate model will exceed Rs 600,000; change the rate to 8% or 12% and the FV changes materially. Those gaps show sensitivity, not destiny.",
        ],
        note: "Illustrative annual assumptions such as 8–12% are estimates for education. They are not forecasts, SEBON endorsements, or fund guarantees.",
      },
      {
        heading: "Why constant-rate math differs from real NAVs",
        paragraphs: [
          "Markets move irregularly. You might buy during a multi-month decline, then hold through a recovery — or the reverse. Two investors with identical SIP amounts and durations can experience different personal returns if their start dates differ.",
          "Fees and taxes further separate gross market moves from what you keep. Always read scheme expense information rather than assuming calculator outputs are net of everything.",
        ],
      },
      {
        heading: "Thinking in XIRR terms (conceptually)",
        paragraphs: [
          "When cash flows are a series of monthly investments plus a final redemption value, a personal rate of return is often discussed using an internal-rate-of-return style measure (commonly associated with XIRR in spreadsheets). You do not need the spreadsheet details to grasp the idea: it finds a rate that links all your NPR outflows and the final inflow.",
          "If you redeem early after a downturn, your realized XIRR may be negative even if long-term averages elsewhere look fine. Horizon and behavior dominate calculator daydreams.",
        ],
      },
      {
        heading: "Inflation and “real” purchasing power",
        paragraphs: [
          "A projected corpus of Rs 2,000,000 in 15 years buys less than Rs 2,000,000 today if consumer prices rise. Some planners subtract an inflation assumption to discuss real value. Inflation in Nepal fluctuates; any single percentage is another estimate.",
          "Compare nominal calculator output with a rough inflation-adjusted view so retirement or education goals stay honest about purchasing power.",
        ],
      },
      {
        heading: "Worked sensitivity table (teaching only)",
        paragraphs: [
          "Consider Rs 10,000 monthly for 20 years (total invested Rs 2,400,000). Under a constant-rate model, an 8% assumption, a 10% assumption, and a 12% assumption produce three different projected endings — sometimes differing by large NPR amounts. That spread is the point: small rate changes compound into large outcome changes over decades.",
          "Do not pick the highest illustration because it feels motivating. Prefer planning that still works nearer the lower end of your assumption band.",
        ],
        bullets: [
          "Total invested is factual once contributions are made.",
          "Projected profit is assumption-driven until realized on redemption.",
          "Short windows can show losses even if long-run averages are positive elsewhere.",
        ],
      },
      {
        heading: "Calculate with transparent inputs",
        paragraphs: [
          "Enter your installment, tenure, and a clearly labeled assumed return in the [SIP return calculator](/sip-calculator). Adjust the rate up and down to see NPR sensitivity, and remember the engine cannot know future NAVs of any Nepali mutual fund.",
        ],
      },
    ],
  },
  {
    slug: "mutual-fund-sip-in-nepal",
    title: "Mutual Fund SIP in Nepal",
    description:
      "How mutual fund SIPs work in Nepal under SEBON oversight: scheme documents, typical NPR minimums, and planning without inventing NAVs or return promises.",
    readingTime: "10 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "mutual fund SIP Nepal",
      "SEBON mutual funds",
      "capital company Nepal SIP",
      "NAV investing Nepal",
      "scheme document SIP",
    ],
    sections: [
      {
        heading: "Mutual funds and SIPs: the relationship",
        paragraphs: [
          "A mutual fund pools money from many investors to buy a portfolio aligned with a stated objective. A SIP is simply a scheduling method to buy fund units repeatedly. You can often also invest lumpsum into the same scheme.",
          "In Nepal, mutual funds and related offerings from capital companies sit within a SEBON-supervised capital market framework. Supervision supports rules and disclosures; it is not a performance warranty.",
        ],
      },
      {
        heading: "What to read before starting a SIP",
        paragraphs: [
          "Focus on objective (growth, income, mixed), indicative asset allocation, benchmark if disclosed, fee structure, risk factors, liquidity/redemption mechanics, and who manages the fund. Prefer primary documents over forwarded screenshots.",
          "Avoid choosing a fund solely because an acquaintance cites a recent percentage gain. Short-term leaders rotate. Match risk to horizon: money needed in two years generally deserves a different conversation than money needed in twenty.",
        ],
        note: "This article does not rank funds, invent NAVs, or imply any scheme is the “best” in Nepal.",
      },
      {
        heading: "Minimums, KYC, and distribution channels",
        paragraphs: [
          "Many SIPs in practice start from roughly Rs 500–1,000 per installment, but minima differ by scheme — confirm before planning. KYC typically requires identity and bank details through authorized processes.",
          "Banks, fund offices, and licensed distributors may offer access. Use official apps or branches; be cautious of anyone pressuring you to share OTPs or to invest through informal collection.",
        ],
      },
      {
        heading: "NPR portfolio role of mutual fund SIPs",
        paragraphs: [
          "A mutual fund SIP can be one sleeve of a wider plan that also includes bank deposits, emergency cash, and other assets appropriate to Nepali households. Concentration in a single scheme or theme increases idiosyncratic risk.",
          "Example allocation thinking (not a prescription): emergency cash in liquid accounts; medium-term goals with lower volatility tools; long-term goals with SIPs into diversified market-linked funds you understand. Your mix should reflect dependents, income stability, and risk tolerance.",
        ],
      },
      {
        heading: "Monitoring without overtrading",
        paragraphs: [
          "Checking NAV every day can encourage impulsive stops. A calmer cadence is reviewing goals annually, confirming SIPs still debit correctly, and reading fund updates for strategy drift — not reacting to every headline.",
          "If you rebalance or switch schemes, consider tax, exit loads, and the risk of being out of the market. Changes should follow a reason tied to goals or fundamentals, not a single week of noise.",
        ],
        bullets: [
          "Track contributions and statements for accuracy.",
          "Revisit risk if your job or health situation changes.",
          "Keep expectations anchored to long horizons.",
        ],
      },
      {
        heading: "Illustrative growth — labeled as such",
        paragraphs: [
          "Suppose Rs 7,500 monthly into a mutual fund SIP for 12 years (total invested Rs 1,080,000). Using an assumed 9% annualized rate for illustration only, projected value exceeds contributions under constant-rate math; using 8% or 11% changes the picture. None of these rates are promised by SEBON, FIRE Nepal, or any unnamed fund.",
          "Before investing, [project mutual fund SIP scenarios](/sip-calculator) with your real NPR budget and a deliberately modest assumed return, then read the actual scheme documents side by side.",
        ],
      },
    ],
  },
  {
    slug: "sip-for-nepalis-living-abroad",
    title: "SIP for Nepalis Living Abroad",
    description:
      "For NRNs and Nepalis abroad: remittance-funded SIPs in NPR, account basics, SEBON-regulated funds context, and careful planning without guaranteed returns.",
    readingTime: "10 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "SIP for NRN",
      "Nepalis abroad investing",
      "remittance SIP Nepal",
      "overseas Nepali mutual fund",
      "NPR remittance investment",
    ],
    sections: [
      {
        heading: "Why abroad earners look at Nepal SIPs",
        paragraphs: [
          "Nepalis working in the Gulf, East Asia, Europe, Australia, and elsewhere often remit money for family support and long-term savings at home. A SIP into a SEBON-regulated mutual fund channel can be one way to systematize the investment portion of remittances — separate from money meant for parents’ living costs.",
          "Currency conversion, banking access, and local regulations matter as much as fund selection. This guide is educational and cannot cover every host-country or Nepal banking rule; verify with your bank and authorized intermediaries.",
        ],
      },
      {
        heading: "Remittance first, investment second",
        paragraphs: [
          "Map remittance into buckets: family expenses, emergency reserve in Nepal, debt obligations, and investable surplus. Only surplus should fund SIPs. If family expenses consume most transfers, force-fitting a large SIP creates household stress.",
          "Example: you remit Rs 80,000 equivalent one month. After Rs 50,000 family support and Rs 15,000 to an emergency buffer, Rs 15,000 might be available for investment — or less. Consistency across average months beats peaks that never repeat.",
        ],
      },
      {
        heading: "Account and KYC practicalities (high level)",
        paragraphs: [
          "Investing usually requires a Nepal banking relationship and KYC accepted by the fund or distributor. NRN documentation categories and account types can differ from resident accounts. Processes change — rely on official bank and fund instructions rather than informal agents.",
          "Some overseas workers appoint a trusted family member with clear limits for paperwork while retaining visibility through statements. Trust carefully; use written understanding of who can redeem or change mandates.",
        ],
        note: "Never share banking passwords or OTPs with anyone promising “guaranteed SIP profit.”",
      },
      {
        heading: "FX and NPR purchasing power",
        paragraphs: [
          "Your salary may be in KRW, USD, AED, or another currency while SIP installments are in NPR. Exchange rates move. A fixed NPR SIP means a variable foreign-currency cost — or you can remit a fixed foreign amount and accept variable NPR investment size.",
          "Illustrative planning sometimes assumes long-run market returns in an 8–12% band in NPR terms; FX can improve or worsen outcomes when measured in your host currency. Treat both market and FX as uncertain.",
        ],
      },
      {
        heading: "Coordination with goals back home",
        paragraphs: [
          "Common goals include building a Kathmandu housing down-payment buffer, education funds for siblings/children, or a return-to-Nepal runway. Time horizons should drive risk: a return planned in 24 months generally needs more liquidity than a 15-year retirement sleeve.",
          "If you already invest in the host country (workplace pensions, index funds), decide intentionally what belongs in Nepal versus abroad for diversification, tax, and future residency — ideally with qualified cross-border advice when stakes are high.",
        ],
        bullets: [
          "Separate family support transfers from investment mandates.",
          "Confirm redemption access if you are overseas during emergencies.",
          "Keep digital copies of statements and KYC acknowledgements.",
        ],
      },
      {
        heading: "Plan remittance-sized installments",
        paragraphs: [
          "Convert your typical surplus into NPR and [test abroad-earner SIP amounts](/sip-calculator) across 5, 10, and 15 year horizons with conservative assumed returns. Prefer an installment that survives months when overtime drops or remittance is delayed.",
        ],
      },
    ],
  },
  {
    slug: "sip-investment-for-retirement-planning",
    title: "SIP Investment for Retirement Planning",
    description:
      "Use SIP for retirement planning in Nepal: NPR corpus sketches, inflation awareness, SEBON-regulated funds, and 8–12% figures as estimates only — not promises.",
    readingTime: "11 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "SIP retirement Nepal",
      "retirement planning NPR",
      "long term SIP Nepal",
      "FIRE Nepal SIP",
      "pension alternative mutual fund",
    ],
    sections: [
      {
        heading: "Retirement math starts with expenses, not products",
        paragraphs: [
          "Before choosing any SIP, estimate what annual spending you might need in retirement in today’s NPR, then consider inflation. Kathmandu costs for housing, healthcare, and food differ from smaller towns; use a personalized budget rather than a single national stereotype.",
          "A rough teaching approach: if you need the purchasing power of Rs 80,000 per month today, future NPR amounts will be higher after inflation. Your invested corpus must support withdrawals sustainably — another layer of uncertainty beyond investment returns.",
        ],
      },
      {
        heading: "Where SIP fits among Nepali retirement tools",
        paragraphs: [
          "Nepali workers may have employer provident structures, citizen savings habits, land/housing, family support norms, and capital-market SIPs into SEBON-regulated mutual funds. SIP is one complementary engine, not a complete pension replacement by default.",
          "Diversification across income sources reduces reliance on any single NAV path. Educational content should not label mutual fund SIP as the “best” retirement vehicle for everyone.",
        ],
      },
      {
        heading: "Long-horizon NPR illustrations",
        paragraphs: [
          "Example A: age 30, SIP Rs 12,000 monthly for 30 years. Contributions total Rs 4,320,000. Under constant-rate illustrations at 8%, 10%, or 12% assumed annualized returns, projected corpuses diverge widely — showing sensitivity, not a promise.",
          "Example B: age 40, SIP Rs 20,000 monthly for 20 years. Contributions total Rs 4,800,000. The shorter runway often needs higher savings rates to approach similar goals, all else equal. Starting earlier usually helps more than waiting for a perfect product.",
        ],
        note: "All return percentages here are illustrative estimates only. Actual results can be lower, higher, or negative over some periods. Nothing is guaranteed.",
      },
      {
        heading: "Step-ups, career peaks, and catch-up years",
        paragraphs: [
          "Income often peaks in mid-career. A step-up SIP can allocate part of raises toward retirement. Overseas earners sometimes front-load higher SIPs during high-earning posting years, then reduce after return — plan for the reduction so the household does not depend on unsustainable remittance levels.",
          "If you start late, increasing contributions is often more controllable than reaching for much higher risk. Risk capacity may decline as retirement nears; glidepath thinking (gradually lowering volatility) is a concept to discuss with a qualified advisor.",
        ],
      },
      {
        heading: "Sequence risk and withdrawal caution",
        paragraphs: [
          "Retiring into a sharp market decline can hurt if you sell units for living costs immediately. Holding cash buffers for early retirement years is a common risk-management idea. SIP accumulation and retirement drawdown are different problems.",
          "Do not assume a fixed withdrawal rate from online foreign blogs applies cleanly to Nepal without local tax, inflation, and family obligation adjustments.",
        ],
        bullets: [
          "Build emergency and near-term cash outside long-term SIPs.",
          "Revisit the plan every few years as expenses and family needs change.",
          "Document nominees and account access for household continuity.",
        ],
      },
      {
        heading: "Healthcare and longevity wildcards",
        paragraphs: [
          "Longer lifespans and medical inflation can stress a corpus that looked adequate on a simple calculator. SIPs do not replace health coverage decisions. Keep retirement projections conservative enough that a longer life or higher care costs do not instantly break the plan.",
        ],
      },
      {
        heading: "Sketch retirement SIPs with honest assumptions",
        paragraphs: [
          "Use FIRE Nepal’s [retirement-oriented SIP Calculator](/sip-calculator) to map monthly NPR savings to multi-decade horizons. Run at least two assumed return cases and an inflation haircut so your plan is grounded in ranges, not a single comforting number.",
        ],
      },
    ],
  },
  {
    slug: "common-sip-investment-mistakes-nepal",
    title: "Common SIP Investment Mistakes in Nepal",
    description:
      "Avoid common Nepal SIP mistakes: tip-chasing, stopping after downturns, weak KYC checks, ignoring fees, and treating calculator rates as guaranteed returns.",
    readingTime: "9 min read",
    lastUpdated: "2026-08-23",
    keywords: [
      "SIP mistakes Nepal",
      "mutual fund errors",
      "stop SIP market fall",
      "SEBON investor caution",
      "NPR SIP discipline",
    ],
    sections: [
      {
        heading: "Mistake 1: Treating calculator output as a promise",
        paragraphs: [
          "SIP calculators need an assumed annual return to show a future value. People often type 12%, like the large NPR ending, and mentally treat it as assured. It is not. Markets, fees, and behavior intervene.",
          "Better habit: view 8–12% as a teaching band for sensitivity analysis. Prefer decisions that still feel acceptable nearer the lower end. SEBON regulation of mutual fund entities does not convert assumptions into guarantees.",
        ],
      },
      {
        heading: "Mistake 2: Stopping SIPs only because NAV fell",
        paragraphs: [
          "Fear-driven pauses lock in the behavioral opposite of rupee-cost averaging: you buy when prices feel comfortable and stop when units are cheaper. Sometimes pausing is rational — job loss, emergency — but pausing solely due to headlines is a common regret pattern.",
          "If volatility stresses you, the fix may be a lower SIP amount or a different risk mix, not repeated start-stop cycles timed to news.",
        ],
      },
      {
        heading: "Mistake 3: Oversizing installments relative to cash flow",
        paragraphs: [
          "Starting at Rs 25,000 monthly because a friend did, while your surplus is Rs 8,000, leads to missed debits, family conflict, or redemption of units to pay rent. Typical scheme minimums around Rs 500–1,000 exist so people can start small; use that flexibility.",
          "Kathmandu expenses, school fees, and festival months are real. Build seasonality into the plan instead of assuming every month looks like your best month.",
        ],
        note: "Educational reminder: no SIP strategy removes the need for emergency savings.",
      },
      {
        heading: "Mistake 4: Skipping documents and authorized channels",
        paragraphs: [
          "Investing through informal collectors, WhatsApp tips, or anyone guaranteeing specific returns is a serious red flag. Use authorized paths tied to SEBON-regulated mutual fund / capital company frameworks and keep your own statements.",
          "Not reading exit load, lock-in, or objective sections leads to surprise illiquidity when you need NPR quickly.",
        ],
        bullets: [
          "Verify entities through official sources.",
          "Protect OTPs and banking credentials.",
          "Keep nominees and contact details updated.",
        ],
      },
      {
        heading: "Mistake 5: Chasing last year’s winner and ignoring fees",
        paragraphs: [
          "Hot performance lists change. Jumping schemes every few months can add costs and tax events while still leaving you exposed to whatever is fashionable next. Fees quietly compound against you even when marketing focuses only on gross returns.",
          "Compare products on fit and costs, not on a single year of returns pasted without context.",
        ],
      },
      {
        heading: "Mistake 6: No goal, no review, no step-up logic",
        paragraphs: [
          "A SIP without a purpose becomes easy to raid for lifestyle upgrades. Write the goal (retirement buffer, education, return-home fund), the horizon, and a yearly review date. When income rises, decide deliberately whether to step up — rather than accidentally spending the entire raise.",
          "Abroad earners sometimes forget to adjust SIP when remittance patterns change, causing bounced mandates or underfunded family needs.",
        ],
      },
      {
        heading: "Replace guesswork with a calmer workflow",
        paragraphs: [
          "Write your surplus, pick a sustainable NPR installment, read the scheme document, automate, and review annually. When you need numbers, [check scenarios in the SIP Calculator](/sip-calculator) using modest assumed returns — then invest only what your real budget can defend.",
        ],
      },
    ],
  },
];

export function getSipGuideBySlug(slug: string): SipGuideArticle | undefined {
  return SIP_GUIDE_ARTICLES.find((article) => article.slug === slug);
}

export function getAllSipGuideSlugs(): string[] {
  return SIP_GUIDE_ARTICLES.map((article) => article.slug);
}

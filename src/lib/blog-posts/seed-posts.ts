import type { BlogPostListItem, BlogPostPublic } from "@/lib/blog-posts/types";

/** Hardcoded homepage posts preserved as fallback + migration seed source of truth. */
export const HOMEPAGE_BLOG_SEED: BlogPostPublic[] = [
  {
    id: "seed-1",
    title: "How to invest your abroad salary for Nepal goals",
    slug: "how-to-invest-your-abroad-salary-for-nepal-goals",
    category: "Money guide",
    reading_time: "5 min read",
    excerpt:
      "Turn overseas income into a clear Nepal-focused investment plan without losing money to fees or currency swings.",
    content: `## Invest your abroad salary with Nepal in mind

Earning in KRW (or another foreign currency) while building wealth for Nepal requires a simple system: **save first, convert with intent, and invest toward named goals**.

### 1. Separate lifestyle and Nepal capital
Keep a fixed monthly transfer target for Nepal goals (home, emergency fund, SIP, family support) before discretionary spending abroad.

### 2. Choose the right remittance path
Compare fee + FX spread, not just the advertised rate. Small monthly differences compound over years of overseas work.

### 3. Match products to time horizon
- **0–12 months:** emergency cash / high-liquidity NPR reserves
- **1–5 years:** balanced SIPs and diversified mutual funds
- **5+ years:** equity-heavy long-term FIRE portfolio

### 4. Track net worth in both currencies
Review KRW income, NPR goals, and FX impact monthly so a strong month abroad still maps to progress at home.

FIRE Nepal tools (Currency Converter, Remittance Calculator, Saving Goals, and FIRE Summary) help you keep this system visible in one place.`,
    cover_image_url: null,
    display_order: 1,
    published_at: null,
  },
  {
    id: "seed-2",
    title: "FIRE mistakes Nepali workers make abroad",
    slug: "fire-mistakes-nepali-workers-make-abroad",
    category: "Retirement",
    reading_time: "7 min read",
    excerpt:
      "Common FIRE traps for Nepalis working overseas — and practical fixes that protect your return timeline.",
    content: `## FIRE mistakes that delay Nepal return

Many Nepali workers abroad save hard but still miss FIRE targets. These are the mistakes we see most often — and how to fix them.

### 1. No written Nepal return number
Without a corpus target in NPR (and a date), saving feels endless. Define housing, lifestyle, and buffer in today's NPR, then inflate forward.

### 2. Ignoring currency and remittance drag
Sending money home ad hoc can erase years of discipline. Plan transfers when spreads are reasonable and automate a baseline amount.

### 3. Lifestyle creep abroad
A higher KRW salary often expands rent, gadgets, and dining. Lock a savings rate first; let lifestyle grow only after goals are funded.

### 4. All cash, no growth assets
Parking everything in a bank account feels safe but loses to inflation. Pair safety cash with long-term SIPs sized to your FIRE date.

### 5. Skipping insurance and emergency funds
One medical or visa shock can force early withdrawals. Keep 6–12 months of expenses liquid before aggressive investing.

### 6. No review cadence
FIRE is a system, not a one-time plan. Review savings rate, FX, and progress every month — then adjust.

Use FIRE Nepal's readiness score, reminders, and planners to catch these issues early.`,
    cover_image_url: null,
    display_order: 2,
    published_at: null,
  },
  {
    id: "seed-3",
    title: "Multi-currency remittance: what to track before coming home",
    slug: "multi-currency-remittance-what-to-track-before-coming-home",
    category: "Currency",
    reading_time: "4 min read",
    excerpt:
      "A practical checklist for KRW→NPR remittance before you return — fees, timing, and records that matter.",
    content: `## Remittance checklist before returning to Nepal

Moving money home is part logistics, part strategy. Track these items so your final months abroad do not leak value.

### Fee + FX spread
Always compare **all-in NPR received**, not just the mid-market rate. Note weekends, holidays, and bank cut-offs.

### Transfer timing
Large one-time transfers near departure can hit poor rates. Ladder transfers over weeks when your schedule allows.

### Destination account readiness
Confirm NPR account limits, KYC, and whether family accounts can receive funds if you travel.

### Tax and documentation
Keep remittance receipts, employment proof, and bank statements organized for Nepal banking or property purchases.

### Emergency buffer abroad
Leave enough KRW for final rent, flights, deposits, and contingencies so you are not forced into a panic transfer.

### Goal tagging
Label each transfer: emergency fund, home down payment, SIP capital, family support. Clarity prevents “mystery money” later.

FIRE Nepal's Remittance Calculator and Currency Converter make fee and rate comparisons faster before you hit send.`,
    cover_image_url: null,
    display_order: 3,
    published_at: null,
  },
];

export function homepageBlogFallbackList(): BlogPostListItem[] {
  return HOMEPAGE_BLOG_SEED.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    category: post.category,
    reading_time: post.reading_time,
    excerpt: post.excerpt,
    cover_image_url: post.cover_image_url,
    display_order: post.display_order,
    published_at: post.published_at,
  }));
}

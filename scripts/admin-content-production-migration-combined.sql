-- FIRE Nepal: Admin Content (YouTube Videos + Blog Posts) production migration
-- Safe to re-run (IF NOT EXISTS / idempotent policies where applicable).
-- Apply in Supabase Dashboard → SQL Editor, or:
--   npm run db:apply:youtube-videos && npm run db:apply:blog-posts
-- Verify:
--   npm run db:verify:youtube-videos && npm run db:verify:blog-posts

-- FIRE Nepal: YouTube videos — admin-managed homepage "Latest YouTube Videos".

-- ---------------------------------------------------------------------------
-- Admin helper (RLS) — idempotent if community_reviews migration already ran
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- youtube_videos
-- ---------------------------------------------------------------------------
create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  youtube_video_id text not null,
  duration text not null default '',
  thumbnail_url text not null,
  display_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz
);

create index if not exists youtube_videos_status_order_idx
  on public.youtube_videos (status, display_order asc, created_at desc)
  where deleted_at is null;

create index if not exists youtube_videos_video_id_idx
  on public.youtube_videos (youtube_video_id)
  where deleted_at is null;

create index if not exists youtube_videos_deleted_idx
  on public.youtube_videos (deleted_at desc nulls last);

alter table public.youtube_videos enable row level security;

-- Public: published, non-deleted videos only
drop policy if exists youtube_videos_select_public on public.youtube_videos;
create policy youtube_videos_select_public
  on public.youtube_videos for select
  using (
    deleted_at is null
    and status = 'published'
  );

-- Admins: read all
drop policy if exists youtube_videos_select_admin on public.youtube_videos;
create policy youtube_videos_select_admin
  on public.youtube_videos for select
  to authenticated
  using (public.is_admin());

-- Admins: full write access
drop policy if exists youtube_videos_insert_admin on public.youtube_videos;
create policy youtube_videos_insert_admin
  on public.youtube_videos for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists youtube_videos_update_admin on public.youtube_videos;
create policy youtube_videos_update_admin
  on public.youtube_videos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists youtube_videos_delete_admin on public.youtube_videos;
create policy youtube_videos_delete_admin
  on public.youtube_videos for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
drop trigger if exists youtube_videos_updated_at on public.youtube_videos;
create trigger youtube_videos_updated_at
before update on public.youtube_videos
for each row
execute procedure public.set_updated_at();


-- FIRE Nepal: blog posts — admin-managed homepage "Latest Blog Posts" + /blog routes.

-- ---------------------------------------------------------------------------
-- Admin helper (RLS) — idempotent
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  category text not null default '',
  reading_time text not null default '',
  excerpt text not null default '',
  content text not null default '',
  cover_image_url text,
  display_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz
);

create unique index if not exists blog_posts_slug_active_uidx
  on public.blog_posts (slug)
  where deleted_at is null;

create index if not exists blog_posts_status_order_idx
  on public.blog_posts (status, display_order asc, created_at desc)
  where deleted_at is null;

create index if not exists blog_posts_deleted_idx
  on public.blog_posts (deleted_at desc nulls last);

alter table public.blog_posts enable row level security;

drop policy if exists blog_posts_select_public on public.blog_posts;
create policy blog_posts_select_public
  on public.blog_posts for select
  using (
    deleted_at is null
    and status = 'published'
  );

drop policy if exists blog_posts_select_admin on public.blog_posts;
create policy blog_posts_select_admin
  on public.blog_posts for select
  to authenticated
  using (public.is_admin());

drop policy if exists blog_posts_insert_admin on public.blog_posts;
create policy blog_posts_insert_admin
  on public.blog_posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists blog_posts_update_admin on public.blog_posts;
create policy blog_posts_update_admin
  on public.blog_posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists blog_posts_delete_admin on public.blog_posts;
create policy blog_posts_delete_admin
  on public.blog_posts for delete
  to authenticated
  using (public.is_admin());

drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at
before update on public.blog_posts
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: optional cover images (public read for blog pages)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog_covers',
  'blog_covers',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists blog_covers_public_read on storage.objects;
create policy blog_covers_public_read
  on storage.objects for select
  using (bucket_id = 'blog_covers');

drop policy if exists blog_covers_admin_insert on storage.objects;
create policy blog_covers_admin_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'blog_covers'
    and public.is_admin()
  );

drop policy if exists blog_covers_admin_update on storage.objects;
create policy blog_covers_admin_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'blog_covers'
    and public.is_admin()
  )
  with check (
    bucket_id = 'blog_covers'
    and public.is_admin()
  );

drop policy if exists blog_covers_admin_delete on storage.objects;
create policy blog_covers_admin_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'blog_covers'
    and public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Seed existing homepage blog posts (idempotent by slug)
-- ---------------------------------------------------------------------------
insert into public.blog_posts (
  title,
  slug,
  category,
  reading_time,
  excerpt,
  content,
  cover_image_url,
  display_order,
  status,
  published_at,
  created_at,
  updated_at
)
select
  v.title,
  v.slug,
  v.category,
  v.reading_time,
  v.excerpt,
  v.content,
  null,
  v.display_order,
  'published',
  now() - (v.display_order || ' days')::interval,
  now() - (v.display_order || ' days')::interval,
  now() - (v.display_order || ' days')::interval
from (
  values
    (
      E'How to invest your abroad salary for Nepal goals',
      'how-to-invest-your-abroad-salary-for-nepal-goals',
      E'Money guide',
      E'16 min read',
      E'A practical system for Nepali workers abroad to convert foreign salary into Nepal-focused wealth — emergency funds, remittance strategy, investments, and FIRE planning.',
      E'A foreign salary can be one of the strongest wealth-building advantages a Nepali professional ever gets. Whether you earn in **KRW, USD, AUD, GBP, AED, QAR**, or another currency, your income buys more optionality than the same effort often produces at home.\n\nBut earning abroad is not the finish line.\n\nMany overseas workers send money home, support family, and still feel financially unsettled. The salary rises. Lifestyle rises with it. Remittances happen when someone asks. Investments are delayed. And years later, return planning still feels unclear.\n\nThe real objective is simpler and harder:\n\n**Earn abroad → protect income → convert intelligently → invest with purpose → build Nepal-based financial independence.**\n\nThis guide is for Nepali workers and NRNs who want a clear system — not random transfers, not product hype, and not a promise of easy wealth. It is a framework for turning overseas income into lasting security in Nepal.\n\n---\n\n## The Abroad-to-Nepal Wealth Framework\n\nUse one repeatable system every month:\n\n1. **Earn** — Capture take-home pay after tax, housing, and mandatory deductions.\n2. **Protect** — Keep an overseas emergency buffer before aggressive remittance or investing.\n3. **Transfer** — Move a fixed Nepal allocation through the best all-in remittance path.\n4. **Invest** — Assign every NPR rupee to a named goal and time horizon.\n5. **Review** — Track net worth in foreign currency and NPR, then adjust.\n\nIf you only remember one idea from this article, remember this: **income abroad creates opportunity; systems create freedom.**\n\nFIRE Nepal tools such as the [Currency Converter](/currency-converter), [Remittance Calculator](/remittance-calculator), [Saving Goals](/savings-tracker), [FIRE Calculator](/#dashboard), and [FIRE Summary](/fire-summary) can sit inside this workflow — not as a replacement for judgment, but as a way to keep the numbers visible.\n\n---\n\n## Separate four types of money\n\nOverseas income becomes easier to manage when you stop treating every rupee as “available cash.”\n\n### 1. Emergency fund\nMoney that protects you from job loss, visa issues, medical bills, flights home, rent shocks, and sudden family needs. This money should stay liquid and boring.\n\n### 2. Nepal goals\nNamed near- to medium-term purposes: house deposit, wedding support, children’s education, parental medical reserve, land installment, or return buffer. These deserve deadlines and target amounts in NPR.\n\n### 3. Long-term investments\nCapital meant to grow for retirement, FIRE, or decade-long wealth building. This is where risk is usually higher — and patience matters more than timing.\n\n### 4. Lifestyle spending\nRent, food, transport, phones, travel, entertainment, and comfort. Lifestyle is not the enemy. Untracked lifestyle inflation is.\n\nA practical rule: **fund emergency and Nepal goals before lifestyle upgrades.** If the reverse happens every month, your foreign salary is working harder for your present than for your future.\n\n---\n\n## Build an overseas emergency fund first\n\nSending every leftover amount home feels responsible. It can also leave you fragile.\n\nWhile you are abroad, risk lives in two places at once: your host country and Nepal. A visa delay, contract non-renewal, workplace injury, hospital bill, roommate dispute, or sudden flight home can force expensive decisions if all cash sits in Nepal already.\n\nA sensible starting buffer for many overseas workers is roughly **3–6 months of essential abroad expenses**, held in an accessible account in the country where you live and work. Some people prefer a split buffer — part abroad, part in Nepal — especially if family support is a recurring responsibility.\n\nThis is educational guidance, not personalized advice. Your buffer depends on job stability, visa type, dependents, insurance coverage, and how quickly you could find new work.\n\nWhat the emergency fund is *for*:\n\n- covering rent and food if income stops\n- buying a ticket home without liquidating investments\n- handling medical gaps before insurance reimburses\n- avoiding high-interest borrowing during a shock\n- giving you time to make calm remittance and career decisions\n\nWhat it is *not* for:\n\n- festival shopping\n- speculative stock tips\n- “temporary” lifestyle upgrades that never reverse\n\nUntil a basic overseas buffer exists, aggressive investing and large discretionary remittances are usually premature.\n\n---\n\n## Create a fixed Nepal transfer strategy\n\nRandom remittances create random results.\n\nA stronger approach is a **defined monthly Nepal allocation** — a percentage or fixed amount you treat like a non-negotiable bill. The rest of your cash flow then has a clear job: live, buffer, and invest.\n\n### Illustrative transfer split (percentages only)\n\nSuppose your monthly take-home pay is the base (100%):\n\n- **50–65%** living costs abroad\n- **10–15%** overseas emergency / stability reserve (until fully funded)\n- **15–25%** Nepal goals + long-term investments\n- **5–10%** family support (if applicable)\n- **remainder** flexible lifestyle / extra investing\n\nYour exact percentages will differ. A nurse in Qatar, a student-worker in Australia, and a professional in Korea do not share the same cost structure. What matters is that **Nepal capital is planned before leftovers appear**.\n\nAutomate or calendar the transfer. Label each remittance: *emergency*, *home deposit*, *SIP*, *family support*, *return buffer*. Mystery money is how plans quietly fail.\n\nUse the [Remittance Calculator](/remittance-calculator) to compare fee and timing before you lock a monthly channel. Use [Saving Goals](/savings-tracker) to attach each transfer to a named Nepal target.\n\n---\n\n## KRW / USD / AUD → NPR: focus on the amount actually received\n\nThe advertised exchange rate is marketing. The only number that funds your Nepal goals is **total NPR credited** after every cost.\n\nCompare remittance options using the full stack:\n\n- **Exchange rate** — how many NPR per unit of foreign currency\n- **Transfer fee** — fixed or percentage charges at send time\n- **FX spread** — the quiet gap between mid-market rate and the rate you receive\n- **Timing** — weekends, holidays, and cut-offs that push you into worse windows\n- **Receiving-bank charges** — fees deducted on the Nepal side\n- **Total NPR received** — the only scoreboard that matters\n\nA channel with a “better” headline rate can still deliver less NPR after spread and fees. Over five or ten years abroad, small monthly leaks compound into serious opportunity cost.\n\nPractical habits:\n\n1. Compare **all-in NPR received**, not slogans.\n2. Prefer a repeatable monthly channel over constant shopping for tiny differences — unless the gap is material.\n3. Avoid panic transfers right before travel or during thin liquidity windows when possible.\n4. Keep receipts. Remittance records matter for banking, property purchases, and clean financial history.\n\nThe [Currency Converter](/currency-converter) helps you see rate context; the Remittance Calculator helps you compare the path that actually credits more NPR to your goal.\n\n---\n\n## Match investments to the time horizon\n\nInvestment risk should generally follow the calendar of the goal — not the excitement of the tip.\n\n| Time horizon | Typical goal examples | Usually better suited to | Risk posture |\n| --- | --- | --- | --- |\n| **0–2 years** | Emergency top-ups, flights, near-term family needs, return cash | Cash, savings accounts, short deposits, highly liquid reserves | Capital preservation first |\n| **2–5 years** | House deposit, education fee block, medium Nepal goals | Mix of fixed-income / conservative to balanced funds, staged SIPs | Moderate; avoid all-or-nothing bets |\n| **5–10 years** | Larger FIRE progress, children’s long education runway | Diversified funds/SIPs, broader equity exposure where appropriate | Growth-oriented with diversification |\n| **10+ years** | Retirement / FIRE corpus | Long-term diversified equity-heavy approach plus ongoing contributions | Highest tolerance for volatility *if* horizon is real |\n\nTwo warnings worth repeating:\n\n- Money needed soon should not be treated like retirement money.\n- Money meant for decades should not stay entirely in cash just because cash feels safe.\n\nNo asset class is universally “best.” Suitability depends on horizon, knowledge, liquidity needs, and personal risk capacity.\n\n---\n\n## Build a Nepal-focused FIRE portfolio\n\nA Nepal-focused FIRE portfolio is not one product. It is a **stack of roles**.\n\n### Emergency cash\nKeeps you from selling investments at the wrong time. This is the foundation, not a leftover.\n\n### Fixed-income / debt instruments\nProvide relative stability and planned cash flows. Useful for nearer goals and for balancing risk — not magic, not risk-free in every sense, but structurally different from equities.\n\n### Diversified funds / SIPs\nSystematic investing can reduce the pressure to “time” markets perfectly. Diversification matters more than finding one legendary pick.\n\n### Equities\nOffer growth potential over long horizons, with volatility as the price of admission. Concentration in a single stock, rumor, or social-media tip is speculation dressed as strategy.\n\n### Real estate (where appropriate)\nProperty can be a meaningful Nepal asset — and also an illiquid, expensive, emotionally charged commitment. Buying too early, with too much leverage, or without a cash buffer is a common overseas-worker mistake. Evaluate total cost: down payment, registration, maintenance, vacancy, and opportunity cost of capital that could have stayed diversified.\n\n### Retirement-oriented investments\nAnything dedicated to long-horizon independence: pension-like contributions where available, long-term SIPs, and accounts you mentally ring-fence from lifestyle spending.\n\n**Do not expect guaranteed returns.** Past performance is not a forecast. Fees, taxes, liquidity, and your behavior under stress matter as much as headline yield.\n\nA balanced educational stance looks like this:\n\n- protect first\n- automate contributions\n- diversify\n- match risk to time\n- review annually, not hourly\n\nUse the [FIRE Calculator](/#dashboard) to estimate corpus needs and [FIRE Summary](/fire-summary) / FIRE Readiness views to see whether savings rate, emergency coverage, and net worth are moving together.\n\n---\n\n## Inflation matters more than most people think\n\nA comfortable NPR lifestyle today will not cost the same in ten or twenty years.\n\n**Illustrative example only — not a prediction:**\n\nIf a household needs **NPR 50,000 per month** today, and average inflation runs near **6% per year**, that same lifestyle could cost roughly:\n\n- about **NPR 67,000** in 5 years\n- about **NPR 90,000** in 10 years\n- about **NPR 160,000** in 20 years\n\n*(Rounded illustrative math using compound inflation. Actual inflation varies by year, city, and spending basket.)*\n\nThis is why parking everything in cash for decades can feel safe while quietly losing purchasing power. Your FIRE number in today’s NPR is incomplete until you respect future prices.\n\nWhen you plan Nepal goals, write two versions:\n\n1. **Today’s NPR cost**\n2. **Inflation-aware future cost** for the year you actually need the money\n\nThat single habit improves retirement planning for Nepali workers abroad more than most product debates.\n\n---\n\n## Track wealth in two currencies\n\nYour economic life spans borders. Your tracking should too.\n\nMonitor at least:\n\n- **Foreign-currency income** — salary, overtime, bonuses, side income\n- **NPR assets** — bank balances, investments, property equity, receivables\n- **NPR liabilities** — loans, family obligations you have committed to, upcoming installments\n- **Exchange-rate exposure** — how much of your net worth sits in KRW/USD/etc. versus NPR\n- **Total net worth** — assets minus liabilities, reviewed monthly\n\nA strong KRW or USD month can still be a weak Nepal-progress month if remittance drag, lifestyle creep, or untracked debt offset the gain. Dual-currency tracking makes that visible.\n\nFIRE Summary is useful here because it consolidates progress instead of leaving fragments across chat messages, bank apps, and memory.\n\n---\n\n## Common mistakes Nepali workers make abroad\n\n### Lifestyle inflation\nA higher foreign salary often expands rent, gadgets, dining, and status spending. Lock a savings and remittance rate first; let lifestyle rise only after goals are funded.\n\n### Sending money home without a plan\nSupport can be loving and still unstructured. Unlabeled transfers become consumption by default.\n\n### Keeping everything in cash\nCash has a job. Forever-cash is usually inflation exposure with a calm face.\n\n### Investing without understanding risk\nBorrowing tips is not a strategy. If you cannot explain an investment’s downside in one sentence, you are not ready to size it large.\n\n### Buying property too early\nLand and houses can anchor a Nepal future — or trap capital before emergency funds, insurance, and diversified investing are ready.\n\n### Ignoring insurance\nOne medical or travel shock can erase years of careful saving. Review health, life, and travel cover in the country where risk actually sits.\n\n### Depending on one income source\nOverseas jobs can end abruptly. A skills buffer, emergency fund, and controlled fixed costs reduce single-point failure.\n\n### Failing to track net worth\nIf you only track salary, you are tracking input. Freedom is about net worth, savings rate, and runway.\n\n### Delaying retirement planning\n“After I return” is not a plan. The compounding years you skip abroad are often the most valuable ones.\n\n---\n\n## A simple monthly system\n\nKeep the operating rhythm light enough to sustain.\n\n### Week 1 — Review income\nConfirm salary credited, overtime, deductions, and true take-home pay. Update your monthly base number.\n\n### Week 2 — Transfer / invest\nExecute the fixed Nepal allocation. Fund SIPs or goal accounts. Compare remittance all-in NPR if your channel needs a check.\n\n### Week 3 — Track expenses and net worth\nReview abroad spending, family support, and dual-currency net worth. Catch lifestyle drift early.\n\n### Week 4 — Review goals\nCheck Saving Goals progress, FIRE corpus gap, emergency runway, and any return-to-Nepal timeline changes. Adjust next month’s allocation deliberately — not emotionally.\n\nThirty focused minutes a week beats a once-a-year panic spreadsheet.\n\n---\n\n## Illustrative allocation example\n\n**Illustrative example only — not personalized financial advice.**\n\nMeet “Sujan,” a fictional overseas worker. After tax and mandatory deductions, Sujan’s monthly take-home is the equivalent of **NPR 250,000**.\n\nOne possible structure:\n\n| Bucket | Share | Amount (NPR equivalent) | Purpose |\n| --- | --- | --- | --- |\n| Living expenses abroad | 55% | 137,500 | Rent, food, transport, utilities, basic lifestyle |\n| Emergency fund contribution | 10% | 25,000 | Build/maintain overseas buffer until target is met |\n| Nepal goals | 12% | 30,000 | Home deposit / education / named medium-term goals |\n| Long-term investments | 13% | 32,500 | Diversified SIPs / FIRE corpus building |\n| Family support | 8% | 20,000 | Planned family remittance |\n| Flexible / extra investing | 2% | 5,000 | Buffer for irregular costs or additional investing |\n\nWhen the emergency fund is fully funded, Sujan could redirect that 10% into Nepal goals and long-term investments. If family support needs rise temporarily, the flexible line and lifestyle line should absorb it before long-term investments are raided — except in true emergencies.\n\nAgain: this is a teaching illustration. Your rent in Seoul, Sydney, Dubai, or Doha may demand a different living-cost share. The principle travels; the percentages must be personalized.\n\n---\n\n## Before you return to Nepal\n\nUse this checklist in the final 6–12 months abroad:\n\n- **Emergency fund ready** — enough liquid capital for transition months\n- **Debt reviewed** — clear picture of loans, EMIs, and family credit obligations\n- **Remittance records organized** — receipts, bank proofs, and labeled transfer history\n- **Investments documented** — account list, nominees, login recovery, and statements\n- **Insurance reviewed** — what continues after return, what ends with your visa/job\n- **Housing decision evaluated** — rent vs buy vs stay with family, with total costs written down\n- **Monthly post-return budget calculated** — in today’s NPR and with an inflation cushion\n- **FIRE corpus estimated** — target number, current progress, and gap\n- **Income sources after returning identified** — job, business, remote work, investments, or hybrid\n\nReturning without this map is how overseas discipline turns into domestic confusion.\n\n---\n\n## Conclusion: turn overseas income into lasting freedom\n\nA foreign salary is leverage. It is not, by itself, a wealth plan.\n\nThe workers who build durable Nepal-based independence usually do ordinary things with unusual consistency: they protect cash, transfer with intent, invest by horizon, respect inflation, and review progress in both currencies.\n\n**The objective is not simply to send more money home. The objective is to turn overseas income into lasting financial freedom.**\n\nStart with the framework. Fund the emergency buffer. Fix the monthly Nepal allocation. Measure all-in NPR received. Match risk to time. Then let years of disciplined overseas work compound into a life that feels secure when you return — or when you choose not to need a paycheck at all.',
      1
    ),
    (
      'FIRE mistakes Nepali workers make abroad',
      'fire-mistakes-nepali-workers-make-abroad',
      'Retirement',
      '7 min read',
      'Common FIRE traps for Nepalis working overseas — and practical fixes that protect your return timeline.',
      E'## FIRE mistakes that delay Nepal return\n\nMany Nepali workers abroad save hard but still miss FIRE targets. These are the mistakes we see most often — and how to fix them.\n\n### 1. No written Nepal return number\nWithout a corpus target in NPR (and a date), saving feels endless. Define housing, lifestyle, and buffer in today''s NPR, then inflate forward.\n\n### 2. Ignoring currency and remittance drag\nSending money home ad hoc can erase years of discipline. Plan transfers when spreads are reasonable and automate a baseline amount.\n\n### 3. Lifestyle creep abroad\nA higher KRW salary often expands rent, gadgets, and dining. Lock a savings rate first; let lifestyle grow only after goals are funded.\n\n### 4. All cash, no growth assets\nParking everything in a bank account feels safe but loses to inflation. Pair safety cash with long-term SIPs sized to your FIRE date.\n\n### 5. Skipping insurance and emergency funds\nOne medical or visa shock can force early withdrawals. Keep 6–12 months of expenses liquid before aggressive investing.\n\n### 6. No review cadence\nFIRE is a system, not a one-time plan. Review savings rate, FX, and progress every month — then adjust.\n\nUse FIRE Nepal''s readiness score, reminders, and planners to catch these issues early.',
      2
    ),
    (
      'Multi-currency remittance: what to track before coming home',
      'multi-currency-remittance-what-to-track-before-coming-home',
      'Currency',
      '4 min read',
      'A practical checklist for KRW→NPR remittance before you return — fees, timing, and records that matter.',
      E'## Remittance checklist before returning to Nepal\n\nMoving money home is part logistics, part strategy. Track these items so your final months abroad do not leak value.\n\n### Fee + FX spread\nAlways compare **all-in NPR received**, not just the mid-market rate. Note weekends, holidays, and bank cut-offs.\n\n### Transfer timing\nLarge one-time transfers near departure can hit poor rates. Ladder transfers over weeks when your schedule allows.\n\n### Destination account readiness\nConfirm NPR account limits, KYC, and whether family accounts can receive funds if you travel.\n\n### Tax and documentation\nKeep remittance receipts, employment proof, and bank statements organized for Nepal banking or property purchases.\n\n### Emergency buffer abroad\nLeave enough KRW for final rent, flights, deposits, and contingencies so you are not forced into a panic transfer.\n\n### Goal tagging\nLabel each transfer: emergency fund, home down payment, SIP capital, family support. Clarity prevents “mystery money” later.\n\nFIRE Nepal''s Remittance Calculator and Currency Converter make fee and rate comparisons faster before you hit send.',
      3
    )
) as v(title, slug, category, reading_time, excerpt, content, display_order)
where not exists (
  select 1
  from public.blog_posts bp
  where bp.slug = v.slug
    and bp.deleted_at is null
);

-- ---------------------------------------------------------------------------
-- Upgrade abroad-salary blog post content (idempotent)
-- ---------------------------------------------------------------------------
-- Upgrade existing published post: How to invest your abroad salary for Nepal goals
-- Keeps slug, category, published status, and display order.
-- Idempotent: safe to re-run.

update public.blog_posts
set
  title = $title$How to invest your abroad salary for Nepal goals$title$,
  category = $category$Money guide$category$,
  reading_time = $reading_time$16 min read$reading_time$,
  excerpt = $excerpt$A practical system for Nepali workers abroad to convert foreign salary into Nepal-focused wealth — emergency funds, remittance strategy, investments, and FIRE planning.$excerpt$,
  content = $content$A foreign salary can be one of the strongest wealth-building advantages a Nepali professional ever gets. Whether you earn in **KRW, USD, AUD, GBP, AED, QAR**, or another currency, your income buys more optionality than the same effort often produces at home.

But earning abroad is not the finish line.

Many overseas workers send money home, support family, and still feel financially unsettled. The salary rises. Lifestyle rises with it. Remittances happen when someone asks. Investments are delayed. And years later, return planning still feels unclear.

The real objective is simpler and harder:

**Earn abroad → protect income → convert intelligently → invest with purpose → build Nepal-based financial independence.**

This guide is for Nepali workers and NRNs who want a clear system — not random transfers, not product hype, and not a promise of easy wealth. It is a framework for turning overseas income into lasting security in Nepal.

---

## The Abroad-to-Nepal Wealth Framework

Use one repeatable system every month:

1. **Earn** — Capture take-home pay after tax, housing, and mandatory deductions.
2. **Protect** — Keep an overseas emergency buffer before aggressive remittance or investing.
3. **Transfer** — Move a fixed Nepal allocation through the best all-in remittance path.
4. **Invest** — Assign every NPR rupee to a named goal and time horizon.
5. **Review** — Track net worth in foreign currency and NPR, then adjust.

If you only remember one idea from this article, remember this: **income abroad creates opportunity; systems create freedom.**

FIRE Nepal tools such as the [Currency Converter](/currency-converter), [Remittance Calculator](/remittance-calculator), [Saving Goals](/savings-tracker), [FIRE Calculator](/#dashboard), and [FIRE Summary](/fire-summary) can sit inside this workflow — not as a replacement for judgment, but as a way to keep the numbers visible.

---

## Separate four types of money

Overseas income becomes easier to manage when you stop treating every rupee as “available cash.”

### 1. Emergency fund
Money that protects you from job loss, visa issues, medical bills, flights home, rent shocks, and sudden family needs. This money should stay liquid and boring.

### 2. Nepal goals
Named near- to medium-term purposes: house deposit, wedding support, children’s education, parental medical reserve, land installment, or return buffer. These deserve deadlines and target amounts in NPR.

### 3. Long-term investments
Capital meant to grow for retirement, FIRE, or decade-long wealth building. This is where risk is usually higher — and patience matters more than timing.

### 4. Lifestyle spending
Rent, food, transport, phones, travel, entertainment, and comfort. Lifestyle is not the enemy. Untracked lifestyle inflation is.

A practical rule: **fund emergency and Nepal goals before lifestyle upgrades.** If the reverse happens every month, your foreign salary is working harder for your present than for your future.

---

## Build an overseas emergency fund first

Sending every leftover amount home feels responsible. It can also leave you fragile.

While you are abroad, risk lives in two places at once: your host country and Nepal. A visa delay, contract non-renewal, workplace injury, hospital bill, roommate dispute, or sudden flight home can force expensive decisions if all cash sits in Nepal already.

A sensible starting buffer for many overseas workers is roughly **3–6 months of essential abroad expenses**, held in an accessible account in the country where you live and work. Some people prefer a split buffer — part abroad, part in Nepal — especially if family support is a recurring responsibility.

This is educational guidance, not personalized advice. Your buffer depends on job stability, visa type, dependents, insurance coverage, and how quickly you could find new work.

What the emergency fund is *for*:

- covering rent and food if income stops
- buying a ticket home without liquidating investments
- handling medical gaps before insurance reimburses
- avoiding high-interest borrowing during a shock
- giving you time to make calm remittance and career decisions

What it is *not* for:

- festival shopping
- speculative stock tips
- “temporary” lifestyle upgrades that never reverse

Until a basic overseas buffer exists, aggressive investing and large discretionary remittances are usually premature.

---

## Create a fixed Nepal transfer strategy

Random remittances create random results.

A stronger approach is a **defined monthly Nepal allocation** — a percentage or fixed amount you treat like a non-negotiable bill. The rest of your cash flow then has a clear job: live, buffer, and invest.

### Illustrative transfer split (percentages only)

Suppose your monthly take-home pay is the base (100%):

- **50–65%** living costs abroad
- **10–15%** overseas emergency / stability reserve (until fully funded)
- **15–25%** Nepal goals + long-term investments
- **5–10%** family support (if applicable)
- **remainder** flexible lifestyle / extra investing

Your exact percentages will differ. A nurse in Qatar, a student-worker in Australia, and a professional in Korea do not share the same cost structure. What matters is that **Nepal capital is planned before leftovers appear**.

Automate or calendar the transfer. Label each remittance: *emergency*, *home deposit*, *SIP*, *family support*, *return buffer*. Mystery money is how plans quietly fail.

Use the [Remittance Calculator](/remittance-calculator) to compare fee and timing before you lock a monthly channel. Use [Saving Goals](/savings-tracker) to attach each transfer to a named Nepal target.

---

## KRW / USD / AUD → NPR: focus on the amount actually received

The advertised exchange rate is marketing. The only number that funds your Nepal goals is **total NPR credited** after every cost.

Compare remittance options using the full stack:

- **Exchange rate** — how many NPR per unit of foreign currency
- **Transfer fee** — fixed or percentage charges at send time
- **FX spread** — the quiet gap between mid-market rate and the rate you receive
- **Timing** — weekends, holidays, and cut-offs that push you into worse windows
- **Receiving-bank charges** — fees deducted on the Nepal side
- **Total NPR received** — the only scoreboard that matters

A channel with a “better” headline rate can still deliver less NPR after spread and fees. Over five or ten years abroad, small monthly leaks compound into serious opportunity cost.

Practical habits:

1. Compare **all-in NPR received**, not slogans.
2. Prefer a repeatable monthly channel over constant shopping for tiny differences — unless the gap is material.
3. Avoid panic transfers right before travel or during thin liquidity windows when possible.
4. Keep receipts. Remittance records matter for banking, property purchases, and clean financial history.

The [Currency Converter](/currency-converter) helps you see rate context; the Remittance Calculator helps you compare the path that actually credits more NPR to your goal.

---

## Match investments to the time horizon

Investment risk should generally follow the calendar of the goal — not the excitement of the tip.

| Time horizon | Typical goal examples | Usually better suited to | Risk posture |
| --- | --- | --- | --- |
| **0–2 years** | Emergency top-ups, flights, near-term family needs, return cash | Cash, savings accounts, short deposits, highly liquid reserves | Capital preservation first |
| **2–5 years** | House deposit, education fee block, medium Nepal goals | Mix of fixed-income / conservative to balanced funds, staged SIPs | Moderate; avoid all-or-nothing bets |
| **5–10 years** | Larger FIRE progress, children’s long education runway | Diversified funds/SIPs, broader equity exposure where appropriate | Growth-oriented with diversification |
| **10+ years** | Retirement / FIRE corpus | Long-term diversified equity-heavy approach plus ongoing contributions | Highest tolerance for volatility *if* horizon is real |

Two warnings worth repeating:

- Money needed soon should not be treated like retirement money.
- Money meant for decades should not stay entirely in cash just because cash feels safe.

No asset class is universally “best.” Suitability depends on horizon, knowledge, liquidity needs, and personal risk capacity.

---

## Build a Nepal-focused FIRE portfolio

A Nepal-focused FIRE portfolio is not one product. It is a **stack of roles**.

### Emergency cash
Keeps you from selling investments at the wrong time. This is the foundation, not a leftover.

### Fixed-income / debt instruments
Provide relative stability and planned cash flows. Useful for nearer goals and for balancing risk — not magic, not risk-free in every sense, but structurally different from equities.

### Diversified funds / SIPs
Systematic investing can reduce the pressure to “time” markets perfectly. Diversification matters more than finding one legendary pick.

### Equities
Offer growth potential over long horizons, with volatility as the price of admission. Concentration in a single stock, rumor, or social-media tip is speculation dressed as strategy.

### Real estate (where appropriate)
Property can be a meaningful Nepal asset — and also an illiquid, expensive, emotionally charged commitment. Buying too early, with too much leverage, or without a cash buffer is a common overseas-worker mistake. Evaluate total cost: down payment, registration, maintenance, vacancy, and opportunity cost of capital that could have stayed diversified.

### Retirement-oriented investments
Anything dedicated to long-horizon independence: pension-like contributions where available, long-term SIPs, and accounts you mentally ring-fence from lifestyle spending.

**Do not expect guaranteed returns.** Past performance is not a forecast. Fees, taxes, liquidity, and your behavior under stress matter as much as headline yield.

A balanced educational stance looks like this:

- protect first
- automate contributions
- diversify
- match risk to time
- review annually, not hourly

Use the [FIRE Calculator](/#dashboard) to estimate corpus needs and [FIRE Summary](/fire-summary) / FIRE Readiness views to see whether savings rate, emergency coverage, and net worth are moving together.

---

## Inflation matters more than most people think

A comfortable NPR lifestyle today will not cost the same in ten or twenty years.

**Illustrative example only — not a prediction:**

If a household needs **NPR 50,000 per month** today, and average inflation runs near **6% per year**, that same lifestyle could cost roughly:

- about **NPR 67,000** in 5 years
- about **NPR 90,000** in 10 years
- about **NPR 160,000** in 20 years

*(Rounded illustrative math using compound inflation. Actual inflation varies by year, city, and spending basket.)*

This is why parking everything in cash for decades can feel safe while quietly losing purchasing power. Your FIRE number in today’s NPR is incomplete until you respect future prices.

When you plan Nepal goals, write two versions:

1. **Today’s NPR cost**
2. **Inflation-aware future cost** for the year you actually need the money

That single habit improves retirement planning for Nepali workers abroad more than most product debates.

---

## Track wealth in two currencies

Your economic life spans borders. Your tracking should too.

Monitor at least:

- **Foreign-currency income** — salary, overtime, bonuses, side income
- **NPR assets** — bank balances, investments, property equity, receivables
- **NPR liabilities** — loans, family obligations you have committed to, upcoming installments
- **Exchange-rate exposure** — how much of your net worth sits in KRW/USD/etc. versus NPR
- **Total net worth** — assets minus liabilities, reviewed monthly

A strong KRW or USD month can still be a weak Nepal-progress month if remittance drag, lifestyle creep, or untracked debt offset the gain. Dual-currency tracking makes that visible.

FIRE Summary is useful here because it consolidates progress instead of leaving fragments across chat messages, bank apps, and memory.

---

## Common mistakes Nepali workers make abroad

### Lifestyle inflation
A higher foreign salary often expands rent, gadgets, dining, and status spending. Lock a savings and remittance rate first; let lifestyle rise only after goals are funded.

### Sending money home without a plan
Support can be loving and still unstructured. Unlabeled transfers become consumption by default.

### Keeping everything in cash
Cash has a job. Forever-cash is usually inflation exposure with a calm face.

### Investing without understanding risk
Borrowing tips is not a strategy. If you cannot explain an investment’s downside in one sentence, you are not ready to size it large.

### Buying property too early
Land and houses can anchor a Nepal future — or trap capital before emergency funds, insurance, and diversified investing are ready.

### Ignoring insurance
One medical or travel shock can erase years of careful saving. Review health, life, and travel cover in the country where risk actually sits.

### Depending on one income source
Overseas jobs can end abruptly. A skills buffer, emergency fund, and controlled fixed costs reduce single-point failure.

### Failing to track net worth
If you only track salary, you are tracking input. Freedom is about net worth, savings rate, and runway.

### Delaying retirement planning
“After I return” is not a plan. The compounding years you skip abroad are often the most valuable ones.

---

## A simple monthly system

Keep the operating rhythm light enough to sustain.

### Week 1 — Review income
Confirm salary credited, overtime, deductions, and true take-home pay. Update your monthly base number.

### Week 2 — Transfer / invest
Execute the fixed Nepal allocation. Fund SIPs or goal accounts. Compare remittance all-in NPR if your channel needs a check.

### Week 3 — Track expenses and net worth
Review abroad spending, family support, and dual-currency net worth. Catch lifestyle drift early.

### Week 4 — Review goals
Check Saving Goals progress, FIRE corpus gap, emergency runway, and any return-to-Nepal timeline changes. Adjust next month’s allocation deliberately — not emotionally.

Thirty focused minutes a week beats a once-a-year panic spreadsheet.

---

## Illustrative allocation example

**Illustrative example only — not personalized financial advice.**

Meet “Sujan,” a fictional overseas worker. After tax and mandatory deductions, Sujan’s monthly take-home is the equivalent of **NPR 250,000**.

One possible structure:

| Bucket | Share | Amount (NPR equivalent) | Purpose |
| --- | --- | --- | --- |
| Living expenses abroad | 55% | 137,500 | Rent, food, transport, utilities, basic lifestyle |
| Emergency fund contribution | 10% | 25,000 | Build/maintain overseas buffer until target is met |
| Nepal goals | 12% | 30,000 | Home deposit / education / named medium-term goals |
| Long-term investments | 13% | 32,500 | Diversified SIPs / FIRE corpus building |
| Family support | 8% | 20,000 | Planned family remittance |
| Flexible / extra investing | 2% | 5,000 | Buffer for irregular costs or additional investing |

When the emergency fund is fully funded, Sujan could redirect that 10% into Nepal goals and long-term investments. If family support needs rise temporarily, the flexible line and lifestyle line should absorb it before long-term investments are raided — except in true emergencies.

Again: this is a teaching illustration. Your rent in Seoul, Sydney, Dubai, or Doha may demand a different living-cost share. The principle travels; the percentages must be personalized.

---

## Before you return to Nepal

Use this checklist in the final 6–12 months abroad:

- **Emergency fund ready** — enough liquid capital for transition months
- **Debt reviewed** — clear picture of loans, EMIs, and family credit obligations
- **Remittance records organized** — receipts, bank proofs, and labeled transfer history
- **Investments documented** — account list, nominees, login recovery, and statements
- **Insurance reviewed** — what continues after return, what ends with your visa/job
- **Housing decision evaluated** — rent vs buy vs stay with family, with total costs written down
- **Monthly post-return budget calculated** — in today’s NPR and with an inflation cushion
- **FIRE corpus estimated** — target number, current progress, and gap
- **Income sources after returning identified** — job, business, remote work, investments, or hybrid

Returning without this map is how overseas discipline turns into domestic confusion.

---

## Conclusion: turn overseas income into lasting freedom

A foreign salary is leverage. It is not, by itself, a wealth plan.

The workers who build durable Nepal-based independence usually do ordinary things with unusual consistency: they protect cash, transfer with intent, invest by horizon, respect inflation, and review progress in both currencies.

**The objective is not simply to send more money home. The objective is to turn overseas income into lasting financial freedom.**

Start with the framework. Fund the emergency buffer. Fix the monthly Nepal allocation. Measure all-in NPR received. Match risk to time. Then let years of disciplined overseas work compound into a life that feels secure when you return — or when you choose not to need a paycheck at all.$content$,
  updated_at = now()
where slug = 'how-to-invest-your-abroad-salary-for-nepal-goals'
  and deleted_at is null
  and status = 'published';


/**
 * Sync the abroad-salary blog post seed into SQL migration files
 * from HOMEPAGE_BLOG_SEED (source of truth in seed-posts.ts).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { HOMEPAGE_BLOG_SEED } from "../src/lib/blog-posts/seed-posts.ts";

const post = HOMEPAGE_BLOG_SEED.find(
  (p) => p.slug === "how-to-invest-your-abroad-salary-for-nepal-goals",
);
if (!post) throw new Error("Abroad salary post missing from seed");

function dollarQuote(tag, value) {
  let t = tag;
  let i = 0;
  while (value.includes(`$${t}$`)) {
    i += 1;
    t = `${tag}${i}`;
  }
  return `$${t}$${value}$${t}$`;
}

function sqlEscapeE(value) {
  return `E'${value.replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\n/g, "\\n").replace(/\r/g, "")}'`;
}

const seedTuple = `    (
      ${sqlEscapeE(post.title)},
      'how-to-invest-your-abroad-salary-for-nepal-goals',
      ${sqlEscapeE(post.category)},
      ${sqlEscapeE(post.reading_time)},
      ${sqlEscapeE(post.excerpt)},
      ${sqlEscapeE(post.content)},
      1
    )`;

const updateSql = `-- Upgrade existing published post: How to invest your abroad salary for Nepal goals
-- Keeps slug, category, published status, and display order.
-- Idempotent: safe to re-run.

update public.blog_posts
set
  title = ${dollarQuote("title", post.title)},
  category = ${dollarQuote("category", post.category)},
  reading_time = ${dollarQuote("reading_time", post.reading_time)},
  excerpt = ${dollarQuote("excerpt", post.excerpt)},
  content = ${dollarQuote("content", post.content)},
  updated_at = now()
where slug = 'how-to-invest-your-abroad-salary-for-nepal-goals'
  and deleted_at is null
  and status = 'published';
`;

writeFileSync(
  "supabase/migrations/20260810140000_upgrade_abroad_salary_blog_post.sql",
  updateSql,
);

function replaceFirstSeedTuple(filePath) {
  const sql = readFileSync(filePath, "utf8");
  const startMarker = "    (\n      'How to invest your abroad salary for Nepal goals'";
  const startAlt = '    (\n      E\'How to invest your abroad salary for Nepal goals\'';
  // Match from the first abroad-salary tuple through ",\n    (" of the next post
  const pattern =
    /\(\s*(?:E)?'How to invest your abroad salary for Nepal goals'[\s\S]*?,\s*1\s*\)/;
  if (!pattern.test(sql)) {
    throw new Error(`Could not find abroad-salary seed tuple in ${filePath}`);
  }
  const next = sql.replace(pattern, seedTuple.trim());
  writeFileSync(filePath, next);
  console.log("Updated seed tuple in", filePath);
}

replaceFirstSeedTuple("supabase/migrations/20260810130000_blog_posts.sql");
replaceFirstSeedTuple("scripts/admin-content-production-migration-combined.sql");

// Append UPDATE to combined production SQL if missing
const combinedPath = "scripts/admin-content-production-migration-combined.sql";
let combined = readFileSync(combinedPath, "utf8");
if (!combined.includes("20260810140000_upgrade_abroad_salary_blog_post") &&
    !combined.includes("Upgrade existing published post: How to invest your abroad salary")) {
  combined = `${combined.trimEnd()}\n\n-- ---------------------------------------------------------------------------\n-- Upgrade abroad-salary blog post content (idempotent)\n-- ---------------------------------------------------------------------------\n${updateSql}\n`;
  writeFileSync(combinedPath, combined);
  console.log("Appended UPDATE to combined production SQL");
} else {
  // Replace existing upgrade block if present
  const upgradePattern =
    /-- ---------------------------------------------------------------------------\n-- Upgrade abroad-salary blog post content \(idempotent\)\n-- ---------------------------------------------------------------------------\n[\s\S]*$/;
  if (upgradePattern.test(combined)) {
    combined = combined.replace(
      upgradePattern,
      `-- ---------------------------------------------------------------------------
-- Upgrade abroad-salary blog post content (idempotent)
-- ---------------------------------------------------------------------------
${updateSql}
`,
    );
    writeFileSync(combinedPath, combined);
    console.log("Replaced UPDATE block in combined production SQL");
  }
}

console.log("Synced abroad-salary blog SQL from seed-posts.ts");
console.log("Reading time:", post.reading_time);
console.log("Words:", post.content.trim().split(/\s+/).length);

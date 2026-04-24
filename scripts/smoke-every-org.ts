/**
 * One-off smoke test for src/lib/every-org.ts against the live API.
 * Not run in CI — invoke manually during DP-063 / DP-064 development:
 *
 *   EVERY_ORG_PUBLIC_KEY=$(grep EVERY_ORG .env.local | cut -d= -f2) \
 *     npx tsx scripts/smoke-every-org.ts
 *
 * The Next.js fetch cache is a no-op outside a request context, so this
 * script hits the live endpoint every time.
 */
import {
  EveryOrgNotFoundError,
  getEveryOrgBySlug,
  searchEveryOrg,
} from "../src/lib/every-org";

async function main() {
  console.log("→ searchEveryOrg('water', { take: 3 })");
  const results = await searchEveryOrg("water", { take: 3 });
  console.log(`  got ${results.length} results`);
  for (const r of results) {
    console.log(`    ${r.name} (${r.ein}) — ${r.location.city}, ${r.location.state}`);
  }

  if (results[0]) {
    console.log(`\n→ getEveryOrgBySlug('${results[0].id}')`);
    const detail = await getEveryOrgBySlug(results[0].id);
    console.log(`  ${detail.name}`);
    console.log(`    EIN: ${detail.ein}`);
    console.log(`    categories: ${detail.category.join(", ") || "(none)"}`);
    console.log(`    tags: ${detail.tags.join(", ") || "(none)"}`);
    console.log(`    subcategory: ${detail.subcategory ?? "(none)"}`);
  }

  console.log("\n→ getEveryOrgBySlug('definitely-not-a-real-slug-xyz')");
  try {
    await getEveryOrgBySlug("definitely-not-a-real-slug-xyz");
    console.log("  ❌ expected EveryOrgNotFoundError but got a result");
    process.exit(1);
  } catch (err) {
    if (err instanceof EveryOrgNotFoundError) {
      console.log(`  ✓ threw EveryOrgNotFoundError: ${err.message}`);
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

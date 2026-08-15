/**
 * Unit tests for the fundraiser-link / nonprofit-match helpers.
 * Covers:
 *   • URL normalization (scheme prepending, trimming)
 *   • rejection of non-https and malformed input
 *   • optionality (empty → null)
 *   • unambiguous-only nonprofit matching
 *
 * Run: npx tsx tests/donation-link-helpers.test.ts
 */

import {
  resolveNonprofitMatch,
  validateFundraiserUrl,
} from "../src/lib/actions/donation-link-helpers";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`);
  }
}

console.log("validateFundraiserUrl:");

const ok = validateFundraiserUrl("https://www.gofundme.com/f/help-rebuild");
check(
  "accepts a plain https gofundme link",
  ok.ok && ok.url === "https://www.gofundme.com/f/help-rebuild"
);

const schemeless = validateFundraiserUrl("www.gofundme.com/f/help-rebuild");
check(
  "prepends https:// to schemeless input",
  schemeless.ok && schemeless.url === "https://www.gofundme.com/f/help-rebuild"
);

const padded = validateFundraiserUrl("  https://justgiving.com/page/x  ");
check(
  "trims surrounding whitespace",
  padded.ok && padded.url === "https://justgiving.com/page/x"
);

const empty = validateFundraiserUrl("");
check("empty string is ok with null (optional field)", empty.ok && empty.url === null);

const blank = validateFundraiserUrl("   ");
check("whitespace-only is ok with null", blank.ok && blank.url === null);

const undef = validateFundraiserUrl(undefined);
check("undefined is ok with null", undef.ok && undef.url === null);

const http = validateFundraiserUrl("http://gofundme.com/f/x");
check("rejects http (https required)", !http.ok);

const js = validateFundraiserUrl("javascript:alert(1)");
check("rejects javascript: scheme", !js.ok);

const noDot = validateFundraiserUrl("https://localhost/f/x");
check("rejects hostnames without a dot", !noDot.ok);

const garbage = validateFundraiserUrl("not a url at all");
check("rejects unparseable input", !garbage.ok);

const tooLong = validateFundraiserUrl(
  "https://gofundme.com/f/" + "x".repeat(2100)
);
check("rejects URLs beyond 2048 chars", !tooLong.ok);

const otherPlatform = validateFundraiserUrl("https://www.justgiving.com/page/y");
check(
  "accepts non-GoFundMe fundraiser platforms (any https URL)",
  otherPlatform.ok && otherPlatform.url === "https://www.justgiving.com/page/y"
);

console.log("\nresolveNonprofitMatch:");

check(
  "single row links to its id",
  resolveNonprofitMatch([{ id: "np-1" }]) === "np-1"
);
check("zero rows link nothing", resolveNonprofitMatch([]) === null);
check(
  "ambiguous rows (2+) link nothing rather than guessing",
  resolveNonprofitMatch([{ id: "np-1" }, { id: "np-2" }]) === null
);

console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

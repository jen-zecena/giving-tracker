/**
 * Salary encryption/decryption tests
 * Run with: npx tsx --env-file=.env.local tests/salary.test.ts
 */
import {
  encryptSalary,
  decryptSalary,
  encryptSalaryForDB,
  decryptSalaryFromDB,
  encryptSalaryRangeForDB,
  decryptSalaryRangeFromDB,
  calculateDonationPercentage,
} from "../src/lib/salary";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ── Numeric salary round-trip ──────────────────────────────
console.log("\nNumeric salary round-trip:");
const salary = 85000;
const encrypted = encryptSalaryForDB(salary);
const decrypted = decryptSalaryFromDB(encrypted);
assert("encrypts to non-empty base64", encrypted.length > 0);
assert("decrypts back to original value", decrypted === salary, `got ${decrypted}`);

// ── Large salary ───────────────────────────────────────────
console.log("\nLarge salary:");
const largeSalary = 999999999.99;
const largeEnc = encryptSalaryForDB(largeSalary);
const largeDec = decryptSalaryFromDB(largeEnc);
assert("handles large values", largeDec === largeSalary, `got ${largeDec}`);

// ── Small salary ───────────────────────────────────────────
console.log("\nSmall salary:");
const smallSalary = 0.01;
const smallEnc = encryptSalaryForDB(smallSalary);
const smallDec = decryptSalaryFromDB(smallEnc);
assert("handles small values", smallDec === smallSalary, `got ${smallDec}`);

// ── Salary range round-trip ────────────────────────────────
console.log("\nSalary range round-trip:");
const range = "$50,000 - $75,000";
const encRange = encryptSalaryRangeForDB(range);
const decRange = decryptSalaryRangeFromDB(encRange);
assert("encrypts range to non-empty base64", encRange.length > 0);
assert("decrypts back to original range", decRange === range, `got "${decRange}"`);

// ── Unicode in range ───────────────────────────────────────
console.log("\nUnicode salary range:");
const unicodeRange = "€50.000 – €75.000";
const uniEnc = encryptSalaryRangeForDB(unicodeRange);
const uniDec = decryptSalaryRangeFromDB(uniEnc);
assert("handles unicode characters", uniDec === unicodeRange, `got "${uniDec}"`);

// ── Unique ciphertexts (random IV) ─────────────────────────
console.log("\nRandom IV produces unique ciphertexts:");
const enc1 = encryptSalaryForDB(salary);
const enc2 = encryptSalaryForDB(salary);
assert("same plaintext → different ciphertext", enc1 !== enc2);

// ── Raw Buffer round-trip ──────────────────────────────────
console.log("\nRaw Buffer encrypt/decrypt:");
const buf = encryptSalary("42000");
const dec = decryptSalary(buf);
assert("raw buffer round-trips", dec === "42000", `got "${dec}"`);

// ── calculateDonationPercentage ────────────────────────────
console.log("\ncalculateDonationPercentage:");
const pct = calculateDonationPercentage(8500, encrypted);
assert(
  "computes correct percentage",
  pct !== null && Math.abs(pct - 10) < 0.01,
  `got ${pct}`
);

const nullPct = calculateDonationPercentage(8500, null);
assert("returns null when salary is null", nullPct === null);

const zeroPct = calculateDonationPercentage(8500, encryptSalaryForDB(0.001));
assert(
  "handles near-zero salary",
  zeroPct !== null && zeroPct > 0,
  `got ${zeroPct}`
);

// ── Tampered ciphertext detection ──────────────────────────
console.log("\nTampered ciphertext detection:");
const tampered = Buffer.from(encrypted, "base64");
tampered[20] ^= 0xff; // flip a byte
try {
  decryptSalaryFromDB(tampered.toString("base64"));
  assert("rejects tampered ciphertext", false, "should have thrown");
} catch {
  assert("rejects tampered ciphertext", true);
}

// ── Summary ────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

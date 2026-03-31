import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard
const TAG_LENGTH = 16; // auth tag

let _keyCache: Buffer | null = null;

function getKey(): Buffer {
  if (_keyCache) return _keyCache;
  const key = process.env.SALARY_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "SALARY_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) {
    throw new Error("SALARY_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  _keyCache = buf;
  return buf;
}

/**
 * Encrypt a salary value (or salary range string) into a Buffer
 * suitable for storing in a bytea column.
 *
 * Format: [12-byte IV] [ciphertext] [16-byte auth tag]
 */
export function encryptSalary(value: string): Buffer {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, tag]);
}

/**
 * Decrypt a salary value from the bytea column back to a string.
 */
export function decryptSalary(data: Buffer): string {
  const key = getKey();

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Encrypt a numeric salary for database storage.
 * Returns a base64 string that Supabase accepts for bytea columns.
 */
export function encryptSalaryForDB(salary: number): string {
  const encrypted = encryptSalary(salary.toString());
  return encrypted.toString("base64");
}

/**
 * Decrypt a salary from the database bytea column (base64-encoded) to a number.
 */
export function decryptSalaryFromDB(base64Data: string): number {
  const buffer = Buffer.from(base64Data, "base64");
  const decrypted = decryptSalary(buffer);
  return parseFloat(decrypted);
}

/**
 * Encrypt a salary range string (e.g., "$50,000 - $75,000") for database storage.
 */
export function encryptSalaryRangeForDB(range: string): string {
  const encrypted = encryptSalary(range);
  return encrypted.toString("base64");
}

/**
 * Decrypt a salary range from the database.
 */
export function decryptSalaryRangeFromDB(base64Data: string): string {
  const buffer = Buffer.from(base64Data, "base64");
  return decryptSalary(buffer);
}

/**
 * Calculate the donation percentage against salary.
 * Returns null if salary is not set.
 */
export function calculateDonationPercentage(
  totalDonated: number,
  encryptedSalary: string | null
): number | null {
  if (!encryptedSalary) return null;
  const salary = decryptSalaryFromDB(encryptedSalary);
  if (salary <= 0) return null;
  return (totalDonated / salary) * 100;
}

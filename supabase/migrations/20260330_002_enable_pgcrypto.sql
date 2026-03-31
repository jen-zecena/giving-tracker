-- TASK-008: Enable pgcrypto extension for salary encryption support
-- Primary encryption is handled at the application level (Node.js crypto)
-- pgcrypto is enabled as a foundation for any future DB-level encryption needs

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =============================================================
-- DB-level encrypt/decrypt functions (optional, for SQL-only use cases)
-- WARNING: These use pgp_sym_encrypt (OpenPGP format) which is NOT compatible
-- with the app-level AES-256-GCM encryption in src/lib/salary.ts.
-- Do NOT use these to read/write data encrypted by the app-level functions.
-- =============================================================

CREATE OR REPLACE FUNCTION public.encrypt_salary(salary numeric, key text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN extensions.pgp_sym_encrypt(salary::text, key);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_salary(encrypted_salary bytea, key text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN extensions.pgp_sym_decrypt(encrypted_salary, key)::numeric;
END;
$$;

-- Revoke direct access to these functions from anon/authenticated roles
-- They should only be called from server-side code via service role
REVOKE EXECUTE ON FUNCTION public.encrypt_salary(numeric, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_salary(bytea, text) FROM anon, authenticated;

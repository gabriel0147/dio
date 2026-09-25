-- 1. Add new enum values to user_role
-- We only add the values here. We MUST commit this transaction (by ending the migration file)
-- before we can use these new values in policies in the next migration file.
-- This avoids the "unsafe use of new value" error (55P04).

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'petroleum_engineer';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'operations_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'director';

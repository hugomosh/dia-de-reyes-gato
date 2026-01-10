-- Migration: Fix security vulnerability in claims table
-- Problem: Anyone can SELECT from claims table and read all emails
-- Solution: Remove SELECT policy and create a function that only returns canonical_ids

-- ============================================
-- 1. Drop the insecure policy
-- ============================================

DROP POLICY IF EXISTS "Anyone can view claims" ON claims;

-- ============================================
-- 2. Create a secure function to get claimed IDs only
-- ============================================

CREATE OR REPLACE FUNCTION get_claimed_canonical_ids()
RETURNS TABLE(canonical_id TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT canonical_id
  FROM claims;
$$;

-- ============================================
-- 3. Fix get_claim_stats to use SECURITY DEFINER
-- ============================================

-- The existing function needs SECURITY DEFINER so it can still access claims table
DROP FUNCTION IF EXISTS get_claim_stats();

CREATE OR REPLACE FUNCTION get_claim_stats()
RETURNS TABLE(
  total_states BIGINT,
  claimed_states BIGINT,
  available_states BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    COUNT(*)::BIGINT as total_states,
    COUNT(c.id)::BIGINT as claimed_states,
    (COUNT(*) - COUNT(c.id))::BIGINT as available_states
  FROM tic_tac_toe_states s
  LEFT JOIN claims c ON s.canonical_id = c.canonical_id;
$$;

-- ============================================
-- Done!
-- ============================================
-- Run this in Supabase SQL Editor to fix the security issue
-- After running this:
-- 1. Users can no longer SELECT from claims table directly
-- 2. They can only call get_claimed_canonical_ids() which returns ONLY canonical_ids
-- 3. get_claim_stats() still works because it uses SECURITY DEFINER
-- 4. Emails and names are now protected

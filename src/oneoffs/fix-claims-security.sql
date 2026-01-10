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
-- Done!
-- ============================================
-- Run this in Supabase SQL Editor to fix the security issue
-- After running this:
-- 1. Users can no longer SELECT from claims table directly
-- 2. They can only call get_claimed_canonical_ids() which returns ONLY canonical_ids
-- 3. Emails and names are now protected

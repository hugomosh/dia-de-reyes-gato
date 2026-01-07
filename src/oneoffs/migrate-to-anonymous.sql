-- Migration: Allow anonymous claims
-- This updates existing database to allow claiming without authentication
-- Safe to run multiple times

-- ============================================
-- Drop old policies if they exist
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can claim" ON claims;
DROP POLICY IF EXISTS "Anyone can claim" ON claims;

-- ============================================
-- Create new policy for anonymous claims
-- ============================================

-- Políticas: Cualquiera puede reclamar (para amigos y familia)
CREATE POLICY "Anyone can claim"
  ON claims FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- ============================================
-- Update functions to return all needed fields
-- ============================================

-- Drop existing functions first (since return types changed)
DROP FUNCTION IF EXISTS get_random_available_states(INTEGER);
DROP FUNCTION IF EXISTS claim_specific_state(TEXT, UUID, TEXT, TEXT);

-- Función para obtener N opciones aleatorias no reclamadas
CREATE OR REPLACE FUNCTION get_random_available_states(n INTEGER DEFAULT 3)
RETURNS TABLE(
  canonical_id TEXT,
  config INTEGER[],
  turn_count INTEGER,
  horoscope_corto TEXT,
  rareza_count INTEGER,
  progreso INTEGER,
  prob_x INTEGER,
  prob_o INTEGER,
  prob_empate INTEGER,
  is_terminal BOOLEAN,
  has_winner BOOLEAN,
  winners INTEGER[],
  winning_lines INTEGER[][]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.canonical_id,
    s.config,
    s.turn_count,
    s.horoscope_corto,
    s.rareza_count,
    s.progreso,
    s.prob_x,
    s.prob_o,
    s.prob_empate,
    s.is_terminal,
    s.has_winner,
    s.winners,
    s.winning_lines
  FROM tic_tac_toe_states s
  LEFT JOIN claims c ON s.canonical_id = c.canonical_id
  WHERE c.canonical_id IS NULL
  ORDER BY RANDOM()
  LIMIT n;
$$;

-- Función para reclamar un estado específico (permite user_id NULL para usuarios anónimos)
CREATE OR REPLACE FUNCTION claim_specific_state(
  p_canonical_id TEXT,
  p_user_id UUID,
  p_nombre TEXT,
  p_email TEXT
)
RETURNS TABLE(
  canonical_id TEXT,
  config INTEGER[],
  horoscope_corto TEXT,
  horoscope_completo TEXT,
  rareza_count INTEGER,
  progreso INTEGER,
  prob_x INTEGER,
  prob_o INTEGER,
  prob_empate INTEGER,
  turn_count INTEGER,
  is_terminal BOOLEAN,
  has_winner BOOLEAN,
  winners INTEGER[],
  winning_lines INTEGER[][]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el estado existe y no está reclamado
  IF NOT EXISTS (
    SELECT 1
    FROM tic_tac_toe_states s
    LEFT JOIN claims c ON s.canonical_id = c.canonical_id
    WHERE s.canonical_id = p_canonical_id
    AND c.canonical_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Estado no disponible';
  END IF;

  -- Insertar reclamo (user_id puede ser NULL para usuarios anónimos)
  INSERT INTO claims (canonical_id, user_id, nombre, email)
  VALUES (p_canonical_id, p_user_id, p_nombre, p_email);

  -- Retornar estado reclamado con todos los datos
  RETURN QUERY
  SELECT
    s.canonical_id,
    s.config,
    s.horoscope_corto,
    s.horoscope_completo,
    s.rareza_count,
    s.progreso,
    s.prob_x,
    s.prob_o,
    s.prob_empate,
    s.turn_count,
    s.is_terminal,
    s.has_winner,
    s.winners,
    s.winning_lines
  FROM tic_tac_toe_states s
  WHERE s.canonical_id = p_canonical_id;
END;
$$;

-- ============================================
-- Done!
-- ============================================
-- Run this script in Supabase SQL Editor
-- It's safe to run multiple times

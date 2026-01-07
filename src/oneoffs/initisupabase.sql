-- Tabla de estados canónicos
CREATE TABLE tic_tac_toe_states (
  canonical_id TEXT PRIMARY KEY,
  decimal_id INTEGER NOT NULL,
  config INTEGER[] NOT NULL,
  is_valid BOOLEAN NOT NULL,
  is_valid_first_player_x BOOLEAN NOT NULL,
  is_terminal BOOLEAN NOT NULL,
  has_unique_winner BOOLEAN NOT NULL,
  has_winner BOOLEAN NOT NULL,
  winners INTEGER[],
  winning_lines INTEGER[][],
  next_player INTEGER,
  next_player_first_player_x INTEGER,
  turn_count INTEGER NOT NULL,
  count_0 INTEGER NOT NULL,
  count_1 INTEGER NOT NULL,
  count_2 INTEGER NOT NULL,
  
  -- Horóscopo
  horoscope_corto TEXT NOT NULL,
  horoscope_completo TEXT NOT NULL,
  
  -- Stats
  rareza_count INTEGER NOT NULL, -- cuántos estados no-canónicos mapean a este
  progreso INTEGER NOT NULL, -- 0-100%
  prob_x INTEGER, -- probabilidad X gana (0-100)
  prob_o INTEGER, -- probabilidad O gana (0-100)
  prob_empate INTEGER, -- probabilidad empate (0-100)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de reclamos
CREATE TABLE claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  canonical_id TEXT NOT NULL REFERENCES tic_tac_toe_states(canonical_id),
  user_id UUID REFERENCES auth.users(id),
  nombre TEXT,
  email TEXT,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(canonical_id) -- Solo un reclamo por estado
);

-- Índices para performance
CREATE INDEX idx_claims_user ON claims(user_id);
CREATE INDEX idx_claims_canonical ON claims(canonical_id);
CREATE INDEX idx_states_turn_count ON tic_tac_toe_states(turn_count);

-- Row Level Security
ALTER TABLE tic_tac_toe_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos pueden leer estados
CREATE POLICY "Anyone can view states"
  ON tic_tac_toe_states FOR SELECT
  TO authenticated, anon
  USING (true);

-- Políticas: Todos pueden leer reclamos
CREATE POLICY "Anyone can view claims"
  ON claims FOR SELECT
  TO authenticated, anon
  USING (true);

-- Políticas: Cualquiera puede reclamar (para amigos y familia)
CREATE POLICY "Anyone can claim"
  ON claims FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Función para reclamar estado aleatorio no reclamado
CREATE OR REPLACE FUNCTION claim_random_state(
  p_user_id UUID, 
  p_nombre TEXT, 
  p_email TEXT
)
RETURNS TABLE(
  canonical_id TEXT, 
  horoscope_corto TEXT, 
  horoscope_completo TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_canonical_id TEXT;
BEGIN
  -- Seleccionar estado aleatorio no reclamado
  SELECT s.canonical_id INTO v_canonical_id
  FROM tic_tac_toe_states s
  LEFT JOIN claims c ON s.canonical_id = c.canonical_id
  WHERE c.canonical_id IS NULL
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF v_canonical_id IS NULL THEN
    RAISE EXCEPTION 'No hay estados disponibles';
  END IF;
  
  -- Insertar reclamo
  INSERT INTO claims (canonical_id, user_id, nombre, email)
  VALUES (v_canonical_id, p_user_id, p_nombre, p_email);
  
  -- Retornar estado reclamado
  RETURN QUERY
  SELECT s.canonical_id, s.horoscope_corto, s.horoscope_completo
  FROM tic_tac_toe_states s
  WHERE s.canonical_id = v_canonical_id;
END;
$$;

-- Reemplaza la función anterior con estas dos:

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

-- Función para obtener stats de reclamos
CREATE OR REPLACE FUNCTION get_claim_stats()
RETURNS TABLE(
  total_states BIGINT,
  claimed_states BIGINT,
  available_states BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COUNT(*)::BIGINT as total_states,
    COUNT(c.id)::BIGINT as claimed_states,
    (COUNT(*) - COUNT(c.id))::BIGINT as available_states
  FROM tic_tac_toe_states s
  LEFT JOIN claims c ON s.canonical_id = c.canonical_id;
$$;
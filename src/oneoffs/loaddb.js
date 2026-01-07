/**
 * Script para generar y subir los 756 estados canónicos a Supabase
 *
 * Instalación:
 * npm install @supabase/supabase-js
 *
 * Uso:
 * node generate_states.js
 */

import { createClient } from '@supabase/supabase-js';
import { TicTacToeState } from '../core/TicTacToeState.js';

// ============================================
// CONFIGURACIÓN - Edita estos valores
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'TU_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'TU_SERVICE_ROLE_KEY';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'TU_ANTHROPIC_API_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// GENERACIÓN DE ESTADOS CANÓNICOS
// ============================================

function generateAllCanonicalStates() {
  console.log('🎲 Generando estados canónicos...');

  const canonicalMap = new Map();
  let totalValid = 0;

  // Generar todos los estados posibles (3^9 = 19683)
  for (let i = 0; i < 19683; i++) {
    const config = [];
    let num = i;

    for (let j = 0; j < 9; j++) {
      config.push(num % 3);
      num = Math.floor(num / 3);
    }

    const state = new TicTacToeState(config);

    // Solo estados válidos con X empezando
    if (!state.isValidFirstPlayerX) continue;

    totalValid++;
    const canonical = state.canonical;

    // Contar cuántos estados mapean a este canónico
    if (!canonicalMap.has(canonical)) {
      canonicalMap.set(canonical, { state, count: 0 });
    }
    canonicalMap.get(canonical).count++;
  }

  const states = Array.from(canonicalMap.values()).map(({ state, count }) => ({
    ...state.toObject(),
    rarezaCount: count,
  }));

  console.log(`✅ Estados válidos (X primero): ${totalValid}`);
  console.log(`✅ Estados canónicos: ${states.length}`);

  return states;
}

// ============================================
// CÁLCULO DE PROBABILIDADES CON MINIMAX
// ============================================

const minimaxCache = new Map();

function minimax(state, isMaximizing) {
  const key = state.id;
  if (minimaxCache.has(key)) {
    return minimaxCache.get(key);
  }

  // Estados terminales
  if (state.isTerminal) {
    let score;
    if (state.winners.includes(1))
      score = 1; // X gana
    else if (state.winners.includes(2))
      score = -1; // O gana
    else score = 0; // Empate

    minimaxCache.set(key, score);
    return score;
  }

  const moves = state.getPossibleMoves();
  const player = state.nextPlayerFirstPlayerX;

  if (player === 1) {
    // X maximiza
    let maxScore = -Infinity;
    for (const move of moves) {
      const nextState = state.makeMove(move);
      const score = minimax(nextState, false);
      maxScore = Math.max(maxScore, score);
    }
    minimaxCache.set(key, maxScore);
    return maxScore;
  } else {
    // O minimiza
    let minScore = Infinity;
    for (const move of moves) {
      const nextState = state.makeMove(move);
      const score = minimax(nextState, true);
      minScore = Math.min(minScore, score);
    }
    minimaxCache.set(key, minScore);
    return minScore;
  }
}

function calculateProbabilities(stateObj) {
  const state = new TicTacToeState(stateObj.config);

  if (state.isTerminal) {
    if (state.winners.includes(1)) return { probX: 100, probO: 0, probEmpate: 0 };
    if (state.winners.includes(2)) return { probX: 0, probO: 100, probEmpate: 0 };
    return { probX: 0, probO: 0, probEmpate: 100 };
  }

  const result = minimax(state, state.nextPlayerFirstPlayerX === 1);

  // Convertir resultado a probabilidades (juego perfecto)
  if (result > 0) return { probX: 100, probO: 0, probEmpate: 0 };
  if (result < 0) return { probX: 0, probO: 100, probEmpate: 0 };
  return { probX: 0, probO: 0, probEmpate: 100 };
}

// ============================================
// GENERACIÓN DE HORÓSCOPOS CON CLAUDE
// ============================================

async function generateHoroscopes(states, batchSize = 50) {
  console.log('🔮 Generando horóscopos...');
  const horoscopes = [];

  for (let i = 0; i < states.length; i += batchSize) {
    const batch = states.slice(i, i + batchSize);
    console.log(
      `   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(states.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, states.length)})`
    );

    const stateDescriptions = batch
      .map(s => {
        const pieces = s.config.filter(x => x !== 0).length;
        const status = s.isTerminal ? 'terminal' : 'en juego';
        const winner = s.winners.length > 0 ? (s.winners[0] === 1 ? 'X' : 'O') : 'ninguno';

        return `ID: ${s.canonical}
Turno: ${s.turnCount}/9 (${pieces} piezas)
Estado: ${status}
Ganador: ${winner}`;
      })
      .join('\n\n');

    const prompt = `Genera horóscopos místicos en español para estos ${batch.length} estados de tic-tac-toe del Día de Reyes.

Contexto: Cada estado de tablero es un regalo único. El horóscopo debe sentirse como una lectura de tarot - conectando la configuración del juego con rasgos de personalidad y destino.

Estados:
${stateDescriptions}

Para CADA estado, crea:
1. CORTO: Una frase poética (máximo 12 palabras) que capture la esencia del tablero
2. COMPLETO: 2-3 frases que interpretan el estado como una lectura de personalidad, relacionando estrategia de juego con carácter

Estilo:
- Místico, cálido, inspirador
- Tema Día de Reyes: regalos, viaje, estrellas, destino
- Evita clichés obvios
- Cada horóscopo debe ser único y específico al estado

Responde SOLO con JSON (sin markdown):
[
  {
    "id": "000000000",
    "corto": "...",
    "completo": "..."
  },
  ...
]`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content[0].text;

      // Limpiar markdown si existe
      const jsonText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const batchHoroscopes = JSON.parse(jsonText);

      horoscopes.push(...batchHoroscopes);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`   ❌ Error en batch ${Math.floor(i / batchSize) + 1}:`, error.message);

      // Usar placeholders si falla
      batch.forEach(s => {
        horoscopes.push({
          id: s.canonical,
          corto: 'Un tablero único te aguarda en tu viaje.',
          completo:
            'Este estado revela tu camino singular. Como los Reyes Magos, cada decisión te acerca a tu destino. Tu regalo espera ser descubierto.',
        });
      });
    }
  }

  console.log(`✅ Horóscopos generados: ${horoscopes.length}`);
  return horoscopes;
}

// ============================================
// SUBIR A SUPABASE
// ============================================

async function uploadToSupabase(states, horoscopes) {
  console.log('📤 Subiendo a Supabase...');

  // Crear mapa de horóscopos
  const horoscopeMap = new Map(horoscopes.map(h => [h.id, h]));

  // Calcular probabilidades
  console.log('🧮 Calculando probabilidades con minimax...');

  // Preparar datos
  const rows = states.map((state, index) => {
    if (index % 50 === 0) {
      console.log(`   Procesando ${index + 1}/${states.length}...`);
    }

    const probs = calculateProbabilities(state);
    const horoscope = horoscopeMap.get(state.canonical) || {
      corto: 'Un tablero único te aguarda.',
      completo: 'Este es tu regalo especial del Día de Reyes.',
    };

    return {
      canonical_id: state.canonical,
      decimal_id: state.decimalId,
      config: state.config,
      is_valid: state.isValid,
      is_valid_first_player_x: state.isValidFirstPlayerX,
      is_terminal: state.isTerminal,
      has_unique_winner: state.hasUniqueWinner,
      has_winner: state.hasWinner,
      winners: state.winners,
      winning_lines: state.winningLines,
      next_player: state.nextPlayer,
      next_player_first_player_x: state.nextPlayerFirstPlayerX,
      turn_count: state.turnCount,
      count_0: state.count0,
      count_1: state.count1,
      count_2: state.count2,
      horoscope_corto: horoscope.corto,
      horoscope_completo: horoscope.completo,
      rareza_count: state.rarezaCount,
      progreso: Math.round((state.turnCount / 9) * 100),
      prob_x: probs.probX,
      prob_o: probs.probO,
      prob_empate: probs.probEmpate,
    };
  });

  console.log('📦 Subiendo en lotes...');

  // Subir en lotes de 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await supabase
      .from('tic_tac_toe_states')
      .upsert(batch, { onConflict: 'canonical_id' });

    if (error) {
      console.error(`   ❌ Error en batch ${Math.floor(i / 100) + 1}:`, error.message);
    } else {
      console.log(
        `   ✅ Subido batch ${Math.floor(i / 100) + 1} (${i + 1}-${Math.min(i + 100, rows.length)})`
      );
    }
  }

  console.log('🎉 ¡Completado!');
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🎁 Generador de Estados para Día de Reyes\n');

  try {
    // 1. Generar estados canónicos
    const states = generateAllCanonicalStates();

    // 2. Generar horóscopos
    const horoscopes = await generateHoroscopes(states);

    // 3. Subir a Supabase
    await uploadToSupabase(states, horoscopes);

    console.log('\n✨ Todo listo para el Día de Reyes! ✨');
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateAllCanonicalStates, generateHoroscopes, calculateProbabilities };

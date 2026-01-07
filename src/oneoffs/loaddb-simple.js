/**
 * Simplified script to generate and upload the 756 canonical states to Supabase
 * WITHOUT horoscope generation - uses placeholder text instead
 *
 * Installation:
 * npm install @supabase/supabase-js
 *
 * Usage:
 * node src/oneoffs/loaddb-simple.js
 */

import { createClient } from '@supabase/supabase-js';
import { TicTacToeState } from '../core/TicTacToeState.js';

// ============================================
// CONFIGURACIÓN - Edita estos valores
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'TU_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'TU_SERVICE_ROLE_KEY';

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
    if (i % 5000 === 0) {
      console.log(`   Generando... ${i}/19683`);
    }

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
  console.log(`   Generando... 19683/19683 ✓`);

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
// SUBIR A SUPABASE
// ============================================

async function uploadToSupabase(states) {
  console.log('\n📤 Subiendo a Supabase...');
  console.log(`   Total de estados: ${states.length}`);

  // Calcular probabilidades
  console.log('\n🧮 Calculando probabilidades con minimax...');

  // Preparar datos
  const rows = states.map((state, index) => {
    if (index % 100 === 0) {
      console.log(`   Calculando probabilidades ${index + 1}/${states.length}...`);
    }

    const probs = calculateProbabilities(state);

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
      horoscope_corto: 'Tu estado único te espera',
      horoscope_completo: 'Este es tu regalo especial del Día de Reyes',
      rareza_count: state.rarezaCount,
      progreso: Math.round((state.turnCount / 9) * 100),
      prob_x: probs.probX,
      prob_o: probs.probO,
      prob_empate: probs.probEmpate,
    };
  });

  console.log('\n📦 Subiendo en lotes de 100 estados...');
  console.log(`   Total de lotes: ${Math.ceil(rows.length / 100)}`);

  // Subir en lotes de 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    console.log(`   Subiendo batch ${Math.floor(i / 100) + 1}...`);

    const { error } = await supabase
      .from('tic_tac_toe_states')
      .upsert(batch, { onConflict: 'canonical_id' });

    if (error) {
      console.error(`   ❌ Error en batch ${Math.floor(i / 100) + 1}:`, error.message);
      console.error(`   Error details:`, JSON.stringify(error, null, 2));
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
  console.log('🎁 Generador de Estados para Día de Reyes (Versión Simplificada)\n');

  try {
    // 1. Generar estados canónicos
    console.log('Paso 1: Generando estados canónicos...');
    const states = generateAllCanonicalStates();
    console.log('✓ Estados generados\n');

    // 2. Subir a Supabase (sin horóscopos)
    console.log('Paso 2: Subiendo a Supabase...');
    await uploadToSupabase(states);

    console.log('\n✨ Todo listo para el Día de Reyes! ✨');
    console.log(`\nEstados subidos: ${states.length}/756`);
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Ejecutar si es el archivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Also export main so it can be called from other scripts
export { generateAllCanonicalStates, calculateProbabilities, main };

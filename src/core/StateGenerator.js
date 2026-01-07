/**
 * StateGenerator - Generates and manages all 19,683 tic-tac-toe states
 * 
 * This class creates all possible board configurations and provides
 * filtering and querying capabilities.
 */

import { TicTacToeState } from './TicTacToeState.js';

export class StateGenerator {
  constructor() {
    this.allStates = [];
    this.canonicalMap = new Map();
  }

  /**
   * Generate all 19,683 states
   * @returns {TicTacToeState[]}
   */
  generateAll() {
    console.time('generateAll');

    this.allStates = [];

    // Generate all 3^9 = 19,683 combinations
    for (let i = 0; i < 19683; i++) {
      // Convert decimal to base-3, pad to 9 digits
      const id = i.toString(3).padStart(9, '0');
      const config = id.split('').map(Number);
      const state = new TicTacToeState(config);

      this.allStates.push(state);

      // Build canonical map
      if (!this.canonicalMap.has(state.canonical)) {
        this.canonicalMap.set(state.canonical, state);
      }
    }

    console.timeEnd('generateAll');
    console.log(`✅ Generated ${this.allStates.length} states`);
    console.log(`📊 ${this.canonicalMap.size} canonical forms`);

    return this.allStates;
  }

  /**
   * Get state by ID
   * @param {string} id - 9-digit base-3 string
   * @returns {TicTacToeState|undefined}
   */
  getStateById(id) {
    const decimalId = parseInt(id, 3);
    return this.allStates[decimalId];
  }

  /**
   * Filter states by property
   * @param {Function} predicate - Filter function
   * @returns {TicTacToeState[]}
   */
  filterByProperty(predicate) {
    return this.allStates.filter(predicate);
  }

  /**
   * Get all valid states
   * @returns {TicTacToeState[]}
   */
  getValidStates() {
    return this.filterByProperty(state => state.isValid);
  }

  /**
   * Get all valid states assuming first player is X (1)
   * @returns {TicTacToeState[]}
   */
  getValidStatesFirstPlayerX() {
    return this.filterByProperty(state => state.isValidFirstPlayerX);
  }

  /**
   * Get all canonical valid states assuming first player is X (1)
   * @returns {TicTacToeState[]}
   */
  getCanonicalValidStatesFirstPlayerX() {
    return Array.from(this.canonicalMap.values()).filter(state =>
      this.getValidStatesFirstPlayerX().some(s => s.canonical === state.canonical)
    );
  }

  /**
   * Get all winning states
   * @returns {TicTacToeState[]}
   */
  getWinningStates() {
    return this.filterByProperty(state => state.isValid && state.hasUniqueWinner);
  }

  /**
   * Get all terminal states (game over)
   * @returns {TicTacToeState[]}
   */
  getTerminalStates() {
    return this.filterByProperty(state => state.isTerminal);
  }

  /**
   * Get states by turn count
   * @param {number} count - Number of moves made
   * @returns {TicTacToeState[]}
   */
  getStatesByTurnCount(count) {
    return this.filterByProperty(state => state.turnCount === count);
  }

  /**
   * Get all canonical states
   * @returns {TicTacToeState[]}
   */
  getCanonicalStates() {
    return Array.from(this.canonicalMap.values());
  }

  /**
   * Get comprehensive statistics
   * @returns {Object}
   */
  getStatistics() {
    const total = this.allStates.length;
    const valid = this.getValidStates();
    const validFirstPlayerX = this.getValidStatesFirstPlayerX();
    const winning = this.getWinningStates();
    const terminal = this.getTerminalStates();
    const canonical = Array.from(new Set(valid.map(state => state.canonical)));

    // Count by turn
    const byTurnCount = {};
    for (let i = 0; i <= 9; i++) {
      byTurnCount[i] = this.getStatesByTurnCount(i).length;
    }

    // Count X wins vs O wins
    const xWins = this.filterByProperty(
      state => state.isValid && state.winners.includes(1) && state.hasUniqueWinner
    );
    const oWins = this.filterByProperty(
      state => state.isValid && state.winners.includes(2) && state.hasUniqueWinner
    );
    const draws = this.filterByProperty(
      state => state.isValid && state.isTerminal && !state.hasUniqueWinner
    );

    //  Count statistics assuming first player is x
    const winningFirstPlayerX = validFirstPlayerX.filter(
      state => state.hasUniqueWinner
    );
    const xWinsFirstPlayerX = winningFirstPlayerX.filter(
      state => state.winners.includes(1)
    );
    const oWinsFirstPlayerX = winningFirstPlayerX.filter(
      state => state.winners.includes(2)
    );
    const drawsFirstPlayerX = validFirstPlayerX.filter(
      state => state.isTerminal && !state.hasUniqueWinner
    );
    const terminalFirstPlayerX = validFirstPlayerX.filter(
      state => state.isTerminal
    );
    const canonicalFirstPlayerX = Array.from(new Set(validFirstPlayerX.map(state => state.canonical)));

    return {
      total,
      valid: valid.length,
      validPercentage: ((valid.length / total) * 100).toFixed(2) + '%',
      validFirstPlayerX: validFirstPlayerX.length,
      canonicalFirstPlayerX: canonicalFirstPlayerX.length,

      winning: winning.length,
      xWins: xWins.length,
      oWins: oWins.length,
      draws: draws.length,

      winningFirstPlayerX: winningFirstPlayerX.length,
      xWinsFirstPlayerX: xWinsFirstPlayerX.length,
      oWinsFirstPlayerX: oWinsFirstPlayerX.length,
      drawsFirstPlayerX: drawsFirstPlayerX.length,
      terminalFirstPlayerX: terminalFirstPlayerX.length,

      terminal: terminal.length,
      canonical: canonical.length,
      canonicalPercentage: ((canonical.length / valid.length) * 100).toFixed(2) + '%',
      canonicalFirstPlayerX: canonicalFirstPlayerX.length,
      canonicalPercentageFirstPlayerX: ((canonicalFirstPlayerX.length / validFirstPlayerX.length) * 100).toFixed(2) + '%',

      byTurnCount
    };
  }

  /**
   * Print statistics to console
   */
  printStatistics() {
    const stats = this.getStatistics();

    console.log('\n📊 State Space Statistics:');
    console.log('─────────────────────────────');
    console.log(`Total states:         ${stats.total.toLocaleString()}`);
    console.log(`Valid states:         ${stats.valid.toLocaleString()} (${stats.validPercentage})`);
    console.log(`Invalid states:       ${(stats.total - stats.valid).toLocaleString()}`);
    console.log(`Valid (x first):      ${stats.validFirstPlayerX.toLocaleString()}`);
    console.log(`Canonical (x first):  ${stats.canonicalFirstPlayerX.toLocaleString()}`);
    console.log('');
    console.log(`Valid winning states: ${stats.winning.toLocaleString()}`);
    console.log(`  - X wins:           ${stats.xWins.toLocaleString()}`);
    console.log(`  - O wins:           ${stats.oWins.toLocaleString()}`);
    console.log(`  - Draws:            ${stats.draws.toLocaleString()}`);
    console.log(`Terminal states:      ${stats.terminal.toLocaleString()}`);
    console.log(`Canonical forms:      ${stats.canonical.toLocaleString()} (${stats.canonicalPercentage})`);
    console.log('');
    console.log(`Assuming first player is X\n`);
    console.log(`Valid winning states: ${stats.winningFirstPlayerX.toLocaleString()}`);
    console.log(`  - X wins:           ${stats.xWinsFirstPlayerX.toLocaleString()}`);
    console.log(`  - O wins:           ${stats.oWinsFirstPlayerX.toLocaleString()}`);
    console.log(`  - Draws:            ${stats.drawsFirstPlayerX.toLocaleString()}`);
    console.log(`Terminal states:      ${stats.terminalFirstPlayerX.toLocaleString()}`);
    console.log(`Canonical forms (X first): ${stats.canonicalFirstPlayerX.toLocaleString()} (${stats.canonicalPercentageFirstPlayerX})`);
    console.log('─────────────────────────────\n');

    return stats;
  }
}

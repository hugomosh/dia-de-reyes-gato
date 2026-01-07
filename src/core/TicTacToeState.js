/**
 * TicTacToeState - Represents a single tic-tac-toe board configuration
 * 
 * This class is rendering-agnostic and handles all logic related to
 * a single board state including validation, winner detection, and
 * canonical form calculation.
 */

import { SymmetryUtils } from './SymmetryUtils.js';

export class TicTacToeState {
  /**
   * @param {number[]} config - Array of 9 values (0=empty, 1=X, 2=O)
   */
  constructor(config) {
    if (!Array.isArray(config) || config.length !== 9) {
      throw new Error('Config must be an array of 9 numbers');
    }

    this.config = config;
    this.id = config.join('');
    this.decimalId = parseInt(this.id, 3);

    // Calculate all properties
    this._analyze();
  }

  /**
   * Internal method to analyze the state and set all properties
   * @private
   */
  _analyze() {
    // Count pieces
    const count0 = this.config.filter(v => v === 0).length;
    const count1 = this.config.filter(v => v === 1).length;
    const count2 = this.config.filter(v => v === 2).length;
    this.count0 = count0;
    this.count1 = count1;
    this.count2 = count2;

    this.turnCount = count1 + count2;

    // Calculate winners first, as validation depends on it
    const winnerInfo = this._calculateWinners();
    this.winners = winnerInfo.winners;
    this.hasWinner = winnerInfo.hasWinner;
    this.winningLines = winnerInfo.lines;
    this.hasUniqueWinner = winnerInfo.winners.length === 1;

    // Lax validation
    this.isValid = this._checkValid(count0, count1, count2);

    // Strict validation for "X first"
    this.isValidFirstPlayerX = this._checkValidFirstPlayerX(count0, count1, count2, winnerInfo);

    // Determine next player
    this.nextPlayer = !this.isValid ? null : (count1 === count2 ? undefined : (count1 > count2 ? 2 : 1));
    this.nextPlayerFirstPlayerX = !this.isValidFirstPlayerX ? null : (count1 === count2 ? 1 : 2);

    // Check if terminal
    this.isTerminal = this.isValid && (this.hasWinner || count0 === 0);

    // Determine valid one winner (valid game ending)
    this.isValidOneWinner = this.isValid && this.hasUniqueWinner;
    this.isValidWinningPosition = this.hasUniqueWinner && this.nextPlayer === (this.winners[0] === 1 ? 2 : 1);

    // Canonical form
    this.canonical = SymmetryUtils.getCanonicalForm(this.config);
  }

  /**
   * Check if state is valid (reachable through legal play but not enforcing first player nor winning rules)
   * @private
   */
  _checkValid(count0, count1, count2) {
    // Players must alternate, no assumptions about who started
    const totalPieces = count1 + count2;

    if (count0 + totalPieces !== 9) return false;
    if (Math.abs(count1 - count2) > 1) return false;
    return true;
  }

  /**
   * Check if state is valid assuming X started
   * @private
   */
  _checkValidFirstPlayerX(count0, count1, count2, winnerInfo) {
    // Check piece counts, assuming X starts
    if (count1 < count2 || count1 > count2 + 1) {
      return false;
    }

    // Check for impossible winner combinations
    if (winnerInfo.winners.length > 1) {
      const hasX = winnerInfo.winners.includes(1);
      const hasO = winnerInfo.winners.includes(2);
      if (hasX && hasO) {
        return false; // Impossible for both to have winning lines
      }
    }

    // If there is a winner, check if the board state is valid
    if (winnerInfo.hasWinner) {
      if (winnerInfo.winners.includes(1)) { // X won
        if (count1 <= count2) {
          return false; // X must have made more moves
        }
      }
      if (winnerInfo.winners.includes(2)) { // O won
        if (count1 !== count2) {
          return false; // Counts must be equal
        }
      }
    }

    return true;
  }

  /**
   * Calculate all winning lines for this state
   * @private
   * @returns {Object} { winners: number[], hasWinner: boolean, lines: number[][] }
   */
  _calculateWinners() {
    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6],            // diagonals
    ];

    const lines = [];
    const winnersSet = new Set();

    for (const line of winningLines) {
      const [a, b, c] = line;
      if (this.config[a] !== 0 &&
        this.config[a] === this.config[b] &&
        this.config[a] === this.config[c]) {
        winnersSet.add(this.config[a]);
        lines.push(line);
      }
    }

    const winners = Array.from(winnersSet);

    return {
      winners,
      hasWinner: winners.length > 0,
      lines,
    };
  }

  /**
   * Get all possible next moves (empty cell indices)
   * @returns {number[]}
   */
  getPossibleMoves() {
    if (!this.isValid || this.isTerminal) {
      return [];
    }

    return this.config
      .map((val, idx) => val === 0 ? idx : -1)
      .filter(idx => idx !== -1);
  }

  /**
   * Create a new state with a move applied
   * @param {number} position - Cell index (0-8)
   * @returns {TicTacToeState}
   */
  makeMove(position) {
    if (!this.isValid || this.isTerminal) {
      throw new Error('Cannot make move on invalid or terminal state');
    }

    if (this.config[position] !== 0) {
      throw new Error('Position already occupied');
    }

    const newConfig = [...this.config];
    newConfig[position] = this.nextPlayer || 1; // Default to Player 1 if undefined

    return new TicTacToeState(newConfig);
  }

  /**
   * Check equality with another state
   * @param {TicTacToeState} other
   * @returns {boolean}
   */
  equals(other) {
    return this.id === other.id;
  }

  /**
   * Convert to plain object for serialization
   * @returns {Object}
   */
  toObject() {
    return {
      id: this.id,
      decimalId: this.decimalId,
      config: this.config,
      canonical: this.canonical,
      isValid: this.isValid,
      isValidFirstPlayerX: this.isValidFirstPlayerX,
      isTerminal: this.isTerminal,
      hasUniqueWinner: this.hasUniqueWinner,
      // The player who made the winning move created a valid winning position
      isValidWinningPosition: this.isValidWinningPosition,
      hasWinner: this.hasWinner,
      winners: this.winners,
      winningLines: this.winningLines,
      nextPlayer: this.nextPlayer,
      nextPlayerFirstPlayerX: this.nextPlayerFirstPlayerX,
      turnCount: this.turnCount,
      count0: this.count0,
      count1: this.count1,
      count2: this.count2,
    };
  }

  toPrettyString() {
    const symbols = ['.', 'X', 'O'];
    let str = '';
    for (let i = 0; i < 9; i++) {
      str += symbols[this.config[i]];
      if (i % 3 === 2 && i < 8) str += '\n';
    }
    return str;
  }

  /** Convert to ASCII representation
   *      |   | 
   *   –--+---+---
   *     | X |  
   *   –--+---+---
   *        |   | O 
        returns {string}
   */
  toAscii() {
    const symbols = [' ', 'x', 'o'];
    let str = '';
    for (let i = 0; i < 9; i++) {
      str += ` ${symbols[this.config[i]]} `;
      if (i % 3 === 2 && i < 8) str += '\n---+---+---\n';
      else if (i % 3 !== 2) str += '|';
    }
    return str;
  }

  /**
   * Create state from ID string
   * @param {string} id - 9-digit base-3 string
   * @returns {TicTacToeState}
   */
  static fromId(id) {
    if (typeof id !== 'string' || id.length !== 9) {
      throw new Error('ID must be a 9-character string');
    }

    const config = id.split('').map(Number);
    return new TicTacToeState(config);
  }

  /**
   * Create empty board
   * @returns {TicTacToeState}
   */
  static empty() {
    return new TicTacToeState([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  }
}

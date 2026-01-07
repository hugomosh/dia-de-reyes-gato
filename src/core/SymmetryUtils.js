/**
 * SymmetryUtils - Handles rotations, reflections, and canonical forms
 * 
 * Tic-tac-toe boards have 8 symmetries (4 rotations + 4 reflections).
 * This class provides transformations and canonical form calculation.
 * 
 * Board positions:
 * 0 1 2
 * 3 4 5
 * 6 7 8
 */

export class SymmetryUtils {
  /**
   * Rotate board 90 degrees clockwise
   * @param {number[]} config
   * @returns {number[]}
   */
  static rotate90(config) {
    // Mapping: [6,3,0,7,4,1,8,5,2]
    return [config[6], config[3], config[0], config[7], config[4], config[1], config[8], config[5], config[2]];
  }
  
  /**
   * Rotate board 180 degrees
   * @param {number[]} config
   * @returns {number[]}
   */
  static rotate180(config) {
    // Mapping: [8,7,6,5,4,3,2,1,0]
    return [config[8], config[7], config[6], config[5], config[4], config[3], config[2], config[1], config[0]];
  }
  
  /**
   * Rotate board 270 degrees clockwise
   * @param {number[]} config
   * @returns {number[]}
   */
  static rotate270(config) {
    // Mapping: [2,5,8,1,4,7,0,3,6]
    return [config[2], config[5], config[8], config[1], config[4], config[7], config[0], config[3], config[6]];
  }
  
  /**
   * Reflect board horizontally
   * @param {number[]} config
   * @returns {number[]}
   */
  static reflectHorizontal(config) {
    // Mapping: [6,7,8,3,4,5,0,1,2]
    return [config[6], config[7], config[8], config[3], config[4], config[5], config[0], config[1], config[2]];
  }
  
  /**
   * Reflect board vertically
   * @param {number[]} config
   * @returns {number[]}
   */
  static reflectVertical(config) {
    // Mapping: [2,1,0,5,4,3,8,7,6]
    return [config[2], config[1], config[0], config[5], config[4], config[3], config[8], config[7], config[6]];
  }
  
  /**
   * Reflect board across main diagonal (top-left to bottom-right)
   * @param {number[]} config
   * @returns {number[]}
   */
  static reflectDiagonal(config) {
    // Mapping: [0,3,6,1,4,7,2,5,8]
    return [config[0], config[3], config[6], config[1], config[4], config[7], config[2], config[5], config[8]];
  }
  
  /**
   * Reflect board across anti-diagonal (top-right to bottom-left)
   * @param {number[]} config
   * @returns {number[]}
   */
  static reflectAntiDiagonal(config) {
    // Mapping: [8,5,2,7,4,1,6,3,0]
    return [config[8], config[5], config[2], config[7], config[4], config[1], config[6], config[3], config[0]];
  }
  
  /**
   * Get all 8 symmetric transformations of a board
   * @param {number[]} config
   * @returns {number[][]} 
   */
  static getAllSymmetries(config) {
    return [
      config,
      this.rotate90(config),
      this.rotate180(config),
      this.rotate270(config),
      this.reflectHorizontal(config),
      this.reflectVertical(config),
      this.reflectDiagonal(config),
      this.reflectAntiDiagonal(config),
    ];
  }
  
  /**
   * Get canonical form (lexicographically smallest equivalent)
   * @param {number[]} config
   * @returns {string}
   */
  static getCanonicalForm(config) {
    const symmetries = this.getAllSymmetries(config);
    const stringSymmetries = symmetries.map(c => c.join(''));
    return stringSymmetries.reduce((min, current) => current < min ? current : min, stringSymmetries[0]);
  }
  
  /**
   * Check if two boards are equivalent under symmetry
   * @param {number[]} config1
   * @param {number[]} config2
   * @returns {boolean}
   */
  static areEquivalent(config1, config2) {
    return this.getCanonicalForm(config1) === this.getCanonicalForm(config2);
  }
}
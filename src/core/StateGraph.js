/**
 * StateGraph - Builds and manages the game tree structure
 *
 * Represents the tree of all possible games starting from empty board.
 * Each node is a state, edges are legal moves.
 */

import { TicTacToeState } from './TicTacToeState';

export class StateGraph {
  constructor() {
    this.graph = new Map();
    this.root = null;
  }

  /**
   * Build game tree from empty board
   * @param {boolean} useCanonical - Use only canonical states
   */
  buildTree(useCanonical = false) {
    let currentNode = TicTacToeState.empty();
    this.root = currentNode.id;
    this.graph.set(currentNode.id, {
      state: currentNode,
      parent: null,
      children: [],
      depth: 0,
    });
    const queue = [currentNode];

    while (queue.length > 0) {
      const currentState = queue.shift();
      const currentKey = useCanonical ? currentState.canonical : currentState.id;
      currentNode = this.graph.get(currentKey);

      if (currentState.isTerminal) {
        continue; // No children for terminal states
      }
      const possibleMoves = currentState.getPossibleMoves();

      for (const move of possibleMoves) {
        const newState = currentState.makeMove(move);
        const stateId = useCanonical ? newState.canonical : newState.id;
        if (!this.graph.has(stateId)) {
          this.graph.set(stateId, {
            state: newState,
            parent: currentKey,
            children: [],
            depth: currentNode.depth + 1,
          });
          queue.push(newState);
        }
        // Add child to current node
        currentNode.children.push(stateId);
      }
    }
  }

  /**
   * Get node for a state
   * @param {string} stateId
   * @returns {Object|undefined}
   */
  getNode(stateId) {
    return this.graph.get(stateId);
  }

  /**
   * Get path from root to a state
   * @param {string} stateId
   * @returns {string[]}
   */
  getPathToState(stateId) {
    if (!this.graph.has(stateId)) {
      throw new Error('State not found in graph');
    }

    const path = [stateId];
    let currentId = stateId;

    while (this.graph.get(currentId).parent !== null) {
      currentId = this.graph.get(currentId).parent;
      path.unshift(currentId);
    }

    return path;
  }

  /**
   * Get depth of a state (turn count)
   * @param {string} stateId
   * @returns {number}
   */
  getDepth(stateId) {
    const node = this.getNode(stateId);
    return node ? node.depth : -1;
  }

  /**
   * Calculate average branching factor
   * @returns {number}
   */
  getAverageBranching() {
    let totalChildren = 0;
    let totalNodes = 0;

    for (const node of this.graph.values()) {
      if (!node.state.isTerminal) {
        totalChildren += node.children.length;
        totalNodes += 1;
      }
    }

    return totalNodes === 0 ? 0 : totalChildren / totalNodes;
  }
}

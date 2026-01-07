/**
 * Scene1Controller - Animates a single game playthrough
 *
 * Shows a random tic-tac-toe game from start to finish, then loops with a new game.
 * Uses its own simple board renderer, independent of the main instanced renderer.
 */

import * as THREE from 'three';
import { StateGraph } from '../core/StateGraph.js';
import { TicTacToeState } from '../core/TicTacToeState.js';

export class Scene1Controller {
  constructor(scene) {
    this.scene = scene;

    // Build game tree (non-canonical for actual game sequences)
    this.stateGraph = new StateGraph();
    this.stateGraph.buildTree(false);

    // Find all good terminal states (games that end with a winner in 5-9 moves)
    this.terminalStates = Array.from(this.stateGraph.graph.values())
      .filter(node => node.state.isTerminal)
      .filter(node => node.state.hasWinner)
      .filter(node => node.depth >= 5 && node.depth <= 9);

    console.log(`🎮 Scene1Controller: Found ${this.terminalStates.length} playable games`);

    // Animation state
    this.currentGamePath = [];
    this.currentStepIndex = 0;
    this.lastStepTime = 0;
    this.stepDuration = 400; // ms per move (semi-fast)
    this.isPlaying = false;
    this.isPaused = false;

    // Create dedicated board group for Scene 1
    this.boardGroup = new THREE.Group();
    this.boardGroup.visible = false; // Hidden initially
    this.scene.add(this.boardGroup);

    // Create materials and geometries
    this._createMaterials();
    this._createGeometries();

    // Create a persistent set of meshes for the board
    this._createBoardMeshes();
  }

  /**
   * Create materials for the board
   * @private
   */
  _createMaterials() {
    this.materials = {
      board: new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        roughness: 1,
        metalness: 0.0,
      }),
      X: new THREE.MeshStandardMaterial({
        color: 0xe24a4a, // Red
        roughness: 0.4,
        metalness: 0.3,
      }),
      O: new THREE.MeshStandardMaterial({
        color: 0x4a90e2, // Blue
        roughness: 0.4,
        metalness: 0.3,
      }),
      winner: new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.15,
        metalness: 0.5,
        emissive: 0xffd700,
        emissiveIntensity: 0.2,
      }),
    };
  }

  /**
   * Create geometries for pieces
   * @private
   */
  _createGeometries() {
    this.geometries = {
      boardBase: new THREE.BoxGeometry(3.2, 0.1, 3.2),
      gridLine: new THREE.BoxGeometry(3.0, 0.05, 0.05),
      xBar: new THREE.BoxGeometry(0.1, 0.05, 1),
    };

    // Create O ring geometry
    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, 0.4, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
    ringShape.holes.push(holePath);

    this.geometries.oRing = new THREE.ExtrudeGeometry(ringShape, {
      depth: 0.1,
      bevelEnabled: false,
    });
    this.geometries.oRing.center();
  }

  /**
   * Create a persistent set of meshes for the board, grid, and all possible pieces.
   * @private
   */
  _createBoardMeshes() {
    // Add board base and grid lines (they don't change)
    const boardMesh = new THREE.Mesh(this.geometries.boardBase, this.materials.board);
    this.boardGroup.add(boardMesh);
    const lineY = 0.05;
    for (let i = -1; i <= 1; i += 2) {
      const vLine = new THREE.Mesh(this.geometries.gridLine, this.materials.board);
      vLine.rotation.y = Math.PI / 2;
      vLine.position.set(i * 0.5, lineY, 0);
      this.boardGroup.add(vLine);
      const hLine = new THREE.Mesh(this.geometries.gridLine, this.materials.board);
      hLine.position.set(0, lineY, i * 0.5);
      this.boardGroup.add(hLine);
    }

    // Create and store all possible X and O pieces
    this.pieceMeshes = [];
    for (let i = 0; i < 9; i++) {
      const cellPos = this._indexToPosition(i);
      const pieceY = 0.075;

      // Create X pieces (2 bars per X)
      const xGroup = new THREE.Group();
      const bar1 = new THREE.Mesh(this.geometries.xBar, this.materials.X);
      bar1.rotation.y = Math.PI / 4;
      const bar2 = new THREE.Mesh(this.geometries.xBar, this.materials.X);
      bar2.rotation.y = -Math.PI / 4;
      xGroup.add(bar1, bar2);
      xGroup.position.set(cellPos.x, pieceY, cellPos.z);
      xGroup.visible = false;
      this.boardGroup.add(xGroup);

      // Create O piece
      const oRing = new THREE.Mesh(this.geometries.oRing, this.materials.O);
      oRing.rotation.x = Math.PI / 2;
      oRing.position.set(cellPos.x, pieceY, cellPos.z);
      oRing.visible = false;
      this.boardGroup.add(oRing);
      
      this.pieceMeshes[i] = { x: xGroup, o: oRing };
    }
  }


  /**
   * Start the scene - pick a random game and begin animation
   */
  start() {
    this.isPlaying = true;
    this.boardGroup.visible = true;
    this._startNewGame();
    console.log('▶️  Scene 1: Started game animation');
  }

  /**
   * Stop the scene
   */
  stop() {
    this.isPlaying = false;
    this.boardGroup.visible = false;
    console.log('⏸️  Scene 1: Stopped game animation');
  }

  /**
   * Update animation - call this every frame
   * @param {number} currentTime - Current time in ms
   */
  update(currentTime) {
    if (!this.isPlaying || this.currentGamePath.length === 0 || this.isPaused) return;

    // Check if enough time has passed for next step
    if (currentTime - this.lastStepTime >= this.stepDuration) {
      this.lastStepTime = currentTime;
      this.currentStepIndex++;

      // Check if game is complete
      if (this.currentStepIndex >= this.currentGamePath.length) {
        // Wait a bit, then start new game
        setTimeout(() => {
          if (this.isPlaying && !this.isPaused) {
            this._startNewGame();
          }
        }, 1000); // 1 second pause before new game
        return;
      }

      // Update the board to show current step
      this._updateBoard();
    }
  }

  /**
   * Pause the animation (e.g., during scroll)
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume the animation
   */
  resume() {
    this.isPaused = false;
    this.lastStepTime = performance.now(); // Reset timing to avoid jumps
  }

  /**
   * Pick a random game and start animating it
   * @private
   */
  _startNewGame() {
    // Pick random terminal state
    const randomState = this.terminalStates[
      Math.floor(Math.random() * this.terminalStates.length)
    ];

    // Get path from empty board to this state
    this.currentGamePath = this.stateGraph.getPathToState(randomState.state.id)
      .map(stateId => this.stateGraph.getNode(stateId).state);

    // Reset animation
    this.currentStepIndex = 0;
    this.lastStepTime = performance.now();

    // Show first state (empty board)
    this._updateBoard();

    const winner = randomState.state.winners[0] === 1 ? 'X' : 'O';
    console.log(`🎲 New game: ${this.currentGamePath.length} moves, ${winner} wins`);
  }

  /**
   * Update the rendered board to show current state by toggling visibility of pieces.
   * @private
   */
  _updateBoard() {
    if (this.currentStepIndex >= this.currentGamePath.length) return;

    // First, hide all pieces to reset the board from the previous state
    for (const piece of this.pieceMeshes) {
      piece.x.visible = false;
      piece.o.visible = false;
    }

    const currentState = this.currentGamePath[this.currentStepIndex];

    // Check for winning cells
    const winningCells = new Set();
    if (currentState.winningLines && currentState.winningLines.length > 0) {
      currentState.winningLines.forEach(line => {
        line.forEach(cellIndex => winningCells.add(cellIndex));
      });
    }

    // Update visibility and material of pieces for the current state
    for (let i = 0; i < 9; i++) {
      const value = currentState.config[i];
      const isWinning = winningCells.has(i);
      const piece = this.pieceMeshes[i];
      
      const isX = value === 1;
      const isO = value === 2;

      if (isX) {
        piece.x.visible = true;
        const material = isWinning ? this.materials.winner : this.materials.X;
        piece.x.children.forEach(bar => bar.material = material);
      }
      if (isO) {
        piece.o.visible = true;
        piece.o.material = isWinning ? this.materials.winner : this.materials.O;
      }
    }
  }

  /**
   * Convert cell index (0-8) to position
   * @private
   */
  _indexToPosition(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    return {
      x: (col - 1) * 1.0,
      z: (row - 1) * 1.0,
    };
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();
    this.stateGraph = null;
    this.terminalStates = [];
    this.currentGamePath = [];
  }
}
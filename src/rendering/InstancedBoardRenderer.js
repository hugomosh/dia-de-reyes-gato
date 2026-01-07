/**
 * InstancedBoardRenderer.js
 *
 * High-performance renderer for thousands of tic-tac-toe boards using instanced rendering.
 * Instead of creating individual meshes (43,773 draw calls for 10K boards),
 * we create just 3 instanced meshes (~3 draw calls total).
 *
 * Performance improvement: ~14,000x fewer draw calls!
 */

import * as THREE from 'three';

export class InstancedBoardRenderer {
  constructor() {
    // Shared materials (same as BoardRenderer)
    this.materials = {
      board: new THREE.MeshStandardMaterial({
        color: 0x2a2a3a,
        roughness: 1,
        metalness: 0.0,
        transparent: true,
        opacity: 1,
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
      xWinner: new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.15,
        metalness: 0.5,
        emissive: 0xffd700,
        emissiveIntensity: 0.1,
      }),
      oWinner: new THREE.MeshStandardMaterial({
        color: 0xff8c00,
        emissive: 0xff8c00,
        roughness: 0.05,
        metalness: 0.7,
        emissiveIntensity: 0.3,
      }),
      stroke: new THREE.MeshStandardMaterial({
        color: 0xffbf00,
        emissive: 0xffbf00,
        roughness: 0.3,
        metalness: 0.7,
        transparent: false,
        opacity: 0.8,
        emissiveIntensity: 0.4,
      }),
    };

    // Create a shape for the ring
    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, 0.4, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, 0.3, 0, Math.PI * 2, true);
    ringShape.holes.push(holePath);

    // Define extrusion settings
    const extrudeSettings = {
      depth: 0.1,
      bevelEnabled: false,
    };

    const oRingGeometry = new THREE.ExtrudeGeometry(ringShape, extrudeSettings);
    oRingGeometry.center();

    // Shared geometries
    this.geometries = {
      boardBase: new THREE.BoxGeometry(3.2, 0.1, 3.2),
      gridLine: new THREE.BoxGeometry(3.0, 0.05, 0.05),
      xBar: new THREE.BoxGeometry(0.1, 0.05, 1), // Bar for X
      oRing: oRingGeometry,
    };

    // Instanced meshes (will be created when we know board count)
    this.instancedBoards = null;
    this.instancedGridLines = null; // Add grid lines
    this.instancedXs = null;
    this.instancedXsWinner = null; // Winning X's
    this.instancedOs = null;
    this.instancedOsWinner = null; // Winning O's

    // Track how many instances we've used
    this.boardCount = 0;
    this.gridLineCount = 0;
    this.xCount = 0;
    this.xWinnerCount = 0;
    this.oCount = 0;
    this.oWinnerCount = 0;

    // Track which instances belong to which board (for updating positions)
    this.boardInstanceMap = []; // Array of { gridLineStart, gridLineCount, xStart, xCount, xWinnerStart, xWinnerCount, oStart, oCount, oWinnerStart, oWinnerCount, strokeStart, strokeCount, state }

    // Winning line strokes (now instanced)
    this.instancedStrokes = null;
    this.strokeCount = 0;

    // Geometry for winning strokes
    this.strokeGeometry = new THREE.BoxGeometry(1, 0.055, 0.1); // Will be scaled for length

    // Winning highlight mode: 'strokes', 'gold', 'both', 'none'
    this.winningHighlightMode = 'both';

    console.log('📦 InstancedBoardRenderer initialized');
  }

  /**
   * Initialize instanced meshes for a given number of boards
   * Call this once before adding boards
   *
   * @param {number} maxBoards - Maximum number of boards to render
   */
  init(maxBoards) {
    console.log(`\n🚀 Initializing instanced rendering for ${maxBoards} boards...`);

    // Calculate max instances needed
    const maxGridLines = maxBoards * 4; // 4 grid lines per board (2 vertical, 2 horizontal)
    const maxXs = maxBoards * 9; // Max 5 X's per board
    const maxOs = maxBoards * 9; // Max 5 O's per board (changed from 4 to handle invalid states with all O's)
    const maxStrokes = maxBoards * 2; // Max 2 winning lines per board (rare but possible)

    console.log(`   Allocating:
      ${maxBoards} board instances
      ${maxGridLines} grid line instances
      ${maxXs} X instances
      ${maxOs} O instances
      ${maxStrokes} stroke instances`);

    // Create instanced meshes
    this.instancedBoards = new THREE.InstancedMesh(
      this.geometries.boardBase,
      this.materials.board,
      maxBoards
    );
    this.instancedBoards.castShadow = false;
    this.instancedBoards.receiveShadow = true;

    // Grid lines (using board material but could be separate)
    this.instancedGridLines = new THREE.InstancedMesh(
      this.geometries.gridLine,
      this.materials.board,
      maxGridLines
    );
    this.instancedGridLines.castShadow = true;

    this.instancedXs = new THREE.InstancedMesh(this.geometries.xBar, this.materials.X, maxXs);
    this.instancedXs.castShadow = true;

    this.instancedXsWinner = new THREE.InstancedMesh(
      this.geometries.xBar,
      this.materials.xWinner,
      maxXs
    );
    this.instancedXsWinner.castShadow = true;

    this.instancedOs = new THREE.InstancedMesh(this.geometries.oRing, this.materials.O, maxOs);
    this.instancedOs.castShadow = true;

    this.instancedOsWinner = new THREE.InstancedMesh(
      this.geometries.oRing,
      this.materials.oWinner,
      maxOs
    );
    this.instancedOsWinner.castShadow = true;

    // Winning line strokes (instanced)
    this.instancedStrokes = new THREE.InstancedMesh(
      this.strokeGeometry,
      this.materials.stroke,
      maxStrokes
    );
    this.instancedStrokes.castShadow = true;

    // Reset counters
    this.boardCount = 0;
    this.gridLineCount = 0;
    this.xCount = 0;
    this.xWinnerCount = 0;
    this.oCount = 0;
    this.oWinnerCount = 0;
    this.strokeCount = 0;

    console.log('   ✅ Instanced meshes created');
  }

  /**
   * Add a board to the instanced renderer
   * Instead of creating new meshes, we just set transformation matrices
   *
   * @param {TicTacToeState} state - The state to render
   * @param {Object} position - {x, y, z} position of the board
   */
  addBoard(state, position = { x: 0, y: 0, z: 0 }) {
    // Track instance indices for this board
    const boardIndex = this.boardCount;
    const gridLineStart = this.gridLineCount;
    const xStart = this.xCount;
    const xWinnerStart = this.xWinnerCount;
    const oStart = this.oCount;
    const oWinnerStart = this.oWinnerCount;
    const strokeStart = this.strokeCount;

    // 1. Add the board base
    const boardMatrix = new THREE.Matrix4();
    boardMatrix.setPosition(position.x, position.y, position.z);
    this.instancedBoards.setMatrixAt(this.boardCount, boardMatrix);
    this.boardCount++;

    // 2. Add grid lines (4 lines per board)
    const lineY = position.y + 0.05;

    // Vertical lines (2)
    for (let i = -1; i <= 1; i += 2) {
      const matrix = new THREE.Matrix4();
      matrix.makeRotationY(Math.PI / 2); // Rotate to align with Z axis
      matrix.setPosition(position.x + i * 0.5, lineY, position.z);
      this.instancedGridLines.setMatrixAt(this.gridLineCount, matrix);
      this.gridLineCount++;
    }

    // Horizontal lines (2)
    for (let i = -1; i <= 1; i += 2) {
      const matrix = new THREE.Matrix4();
      matrix.setPosition(position.x, lineY, position.z + i * 0.5);
      this.instancedGridLines.setMatrixAt(this.gridLineCount, matrix);
      this.gridLineCount++;
    }

    // 3. Determine winning cells for highlighting
    const winningCells = new Set();
    if (state.winningLines && state.winningLines.length > 0) {
      state.winningLines.forEach(line => {
        line.forEach(cellIndex => winningCells.add(cellIndex));
      });
    }

    // 4. Add X's and O's based on state configuration
    for (let i = 0; i < 9; i++) {
      const value = state.config[i];
      if (value === 0) continue; // Empty cell

      // Get cell position relative to board
      const cellPos = this.indexToPosition(i);
      const worldX = position.x + cellPos.x;
      const worldY = position.y + 0.075; // Slightly above board
      const worldZ = position.z + cellPos.z;

      // Check if this cell is part of a winning line
      const isWinningCell = winningCells.has(i);

      if (value === 1) {
        // Add X (two crossed bars)
        this.addX(worldX, worldY, worldZ, isWinningCell);
      } else if (value === 2) {
        // Add O (one ring)
        this.addO(worldX, worldY, worldZ, isWinningCell);
      }
    }

    // 5. Add winning line strokes (instanced 3D boxes)
    if (state.winningLines && state.winningLines.length > 0) {
      state.winningLines.forEach(line => {
        const strokeY = position.y + 0.1; // Above the pieces

        // Get positions of first and last cell in winning line
        const startPos = this.indexToPosition(line[0]);
        const endPos = this.indexToPosition(line[2]);

        const start = new THREE.Vector3(position.x + startPos.x, strokeY, position.z + startPos.z);
        const end = new THREE.Vector3(position.x + endPos.x, strokeY, position.z + endPos.z);

        // Calculate midpoint, distance, and angle
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(end, start);
        const distance = direction.length();
        const angle = Math.atan2(direction.z, direction.x);

        // Add overshoot to fully cover the X's and O's (extend by 0.6 on each side)
        const overshoot = 0.6;
        const totalLength = distance + overshoot * 2;

        // Create transformation matrix for this stroke
        const matrix = new THREE.Matrix4();
        const strokePosition = midpoint;
        const strokeRotation = new THREE.Quaternion();
        const strokeScale = new THREE.Vector3(totalLength, 1, 1);

        // Rotation around Y axis
        strokeRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);

        // Compose matrix from position, rotation, and scale
        matrix.compose(strokePosition, strokeRotation, strokeScale);
        this.instancedStrokes.setMatrixAt(this.strokeCount, matrix);
        this.strokeCount++;
      });
    }

    // Store mapping for this board
    this.boardInstanceMap.push({
      state,
      gridLineStart,
      gridLineCount: this.gridLineCount - gridLineStart,
      xStart,
      xCount: this.xCount - xStart,
      xWinnerStart,
      xWinnerCount: this.xWinnerCount - xWinnerStart,
      oStart,
      oCount: this.oCount - oStart,
      oWinnerStart,
      oWinnerCount: this.oWinnerCount - oWinnerStart,
      strokeStart,
      strokeCount: this.strokeCount - strokeStart,
    });
  }

  /**
   * Update the position of an existing board and all its components
   * @param {number} boardIndex - Index of the board to update
   * @param {Object} position - New {x, y, z} position
   */
  updateBoardPosition(boardIndex, position) {
    const mapping = this.boardInstanceMap[boardIndex];
    if (!mapping) return;

    // 1. Update board base
    const boardMatrix = new THREE.Matrix4();
    boardMatrix.setPosition(position.x, position.y, position.z);
    this.instancedBoards.setMatrixAt(boardIndex, boardMatrix);

    // 2. Update grid lines
    const lineY = position.y + 0.05;
    let lineIndex = mapping.gridLineStart;

    // Vertical lines (2)
    for (let i = -1; i <= 1; i += 2) {
      const matrix = new THREE.Matrix4();
      matrix.makeRotationY(Math.PI / 2);
      matrix.setPosition(position.x + i * 0.5, lineY, position.z);
      this.instancedGridLines.setMatrixAt(lineIndex++, matrix);
    }

    // Horizontal lines (2)
    for (let i = -1; i <= 1; i += 2) {
      const matrix = new THREE.Matrix4();
      matrix.setPosition(position.x, lineY, position.z + i * 0.5);
      this.instancedGridLines.setMatrixAt(lineIndex++, matrix);
    }

    // 3. Determine winning cells for this board
    const winningCells = new Set();
    if (mapping.state.winningLines && mapping.state.winningLines.length > 0) {
      mapping.state.winningLines.forEach(line => {
        line.forEach(cellIndex => winningCells.add(cellIndex));
      });
    }

    // 4. Update X's, O's, and their winning variants
    let xIndex = mapping.xStart;
    let xWinnerIndex = mapping.xWinnerStart;
    let oIndex = mapping.oStart;
    let oWinnerIndex = mapping.oWinnerStart;

    for (let i = 0; i < 9; i++) {
      const value = mapping.state.config[i];
      if (value === 0) continue;

      const cellPos = this.indexToPosition(i);
      const worldX = position.x + cellPos.x;
      const worldY = position.y + 0.075;
      const worldZ = position.z + cellPos.z;

      const isWinningCell = winningCells.has(i);

      if (value === 1) {
        // Update X (two bars)
        const matrix1 = new THREE.Matrix4();
        matrix1.makeRotationY(Math.PI / 4);
        matrix1.setPosition(worldX, worldY, worldZ);
        this.instancedXs.setMatrixAt(xIndex++, matrix1);

        const matrix2 = new THREE.Matrix4();
        matrix2.makeRotationY(-Math.PI / 4);
        matrix2.setPosition(worldX, worldY, worldZ);
        this.instancedXs.setMatrixAt(xIndex++, matrix2);

        // Update winning X instances if this is a winning cell
        if (isWinningCell) {
          this.instancedXsWinner.setMatrixAt(xWinnerIndex++, matrix1);
          this.instancedXsWinner.setMatrixAt(xWinnerIndex++, matrix2);
        }
      } else if (value === 2) {
        // Update O
        const matrix = new THREE.Matrix4();
        const pos = new THREE.Vector3(worldX, worldY, worldZ);
        const rotation = new THREE.Quaternion();
        rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        matrix.compose(pos, rotation, new THREE.Vector3(1, 1, 1));
        this.instancedOs.setMatrixAt(oIndex++, matrix);

        // Update winning O instances if this is a winning cell
        if (isWinningCell) {
          this.instancedOsWinner.setMatrixAt(oWinnerIndex++, matrix);
        }
      }
    }

    // 5. Update winning line strokes
    if (mapping.state.winningLines && mapping.state.winningLines.length > 0) {
      let strokeIndex = mapping.strokeStart;

      mapping.state.winningLines.forEach(line => {
        const strokeY = position.y + 0.1; // Above the pieces

        // Get positions of first and last cell in winning line
        const startPos = this.indexToPosition(line[0]);
        const endPos = this.indexToPosition(line[2]);

        const start = new THREE.Vector3(position.x + startPos.x, strokeY, position.z + startPos.z);
        const end = new THREE.Vector3(position.x + endPos.x, strokeY, position.z + endPos.z);

        // Calculate midpoint, distance, and angle
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(end, start);
        const distance = direction.length();
        const angle = Math.atan2(direction.z, direction.x);

        // Add overshoot to fully cover the X's and O's
        const overshoot = 0.6;
        const totalLength = distance + overshoot * 2;

        // Create transformation matrix for this stroke
        const matrix = new THREE.Matrix4();
        const strokePosition = midpoint;
        const strokeRotation = new THREE.Quaternion();
        const strokeScale = new THREE.Vector3(totalLength, 1, 1);

        // Rotation around Y axis
        strokeRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);

        // Compose matrix from position, rotation, and scale
        matrix.compose(strokePosition, strokeRotation, strokeScale);
        this.instancedStrokes.setMatrixAt(strokeIndex++, matrix);
      });
    }

    // Mark matrices as needing update
    this.instancedBoards.instanceMatrix.needsUpdate = true;
    this.instancedGridLines.instanceMatrix.needsUpdate = true;
    this.instancedXs.instanceMatrix.needsUpdate = true;
    this.instancedXsWinner.instanceMatrix.needsUpdate = true;
    this.instancedOs.instanceMatrix.needsUpdate = true;
    this.instancedOsWinner.instanceMatrix.needsUpdate = true;
    this.instancedStrokes.instanceMatrix.needsUpdate = true;
  }

  /**
   * Add an X at the specified position
   * An X is made of 2 bars rotated 45° from each other
   */
  addX(x, y, z, isWinner = false) {
    // Bar 1: rotated 45°
    const matrix1 = new THREE.Matrix4();
    matrix1.makeRotationY(Math.PI / 4);
    matrix1.setPosition(x, y, z);

    // Bar 2: rotated -45°
    const matrix2 = new THREE.Matrix4();
    matrix2.makeRotationY(-Math.PI / 4);
    matrix2.setPosition(x, y, z);

    // Always add to regular mesh (visible in all modes)
    this.instancedXs.setMatrixAt(this.xCount, matrix1);
    this.instancedXs.setMatrixAt(this.xCount + 1, matrix2);
    this.xCount += 2;

    // If winner, also add to winner mesh (visible only in 'gold' and 'both' modes)
    if (isWinner) {
      this.instancedXsWinner.setMatrixAt(this.xWinnerCount, matrix1);
      this.instancedXsWinner.setMatrixAt(this.xWinnerCount + 1, matrix2);
      this.xWinnerCount += 2;
    }
  }

  /**
   * Add an O at the specified position
   */
  addO(x, y, z, isWinner = false) {
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3(x, y, z);
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    // Rotate to lay flat (torus is vertical by default)
    rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

    // Compose matrix from position, rotation, and scale
    matrix.compose(position, rotation, scale);

    // Always add to regular mesh (visible in all modes)
    this.instancedOs.setMatrixAt(this.oCount, matrix);
    this.oCount++;

    // If winner, also add to winner mesh (visible only in 'gold' and 'both' modes)
    if (isWinner) {
      this.instancedOsWinner.setMatrixAt(this.oWinnerCount, matrix);
      this.oWinnerCount++;
    }
  }

  /**
   * Finalize and add to scene
   * Call this after adding all boards
   *
   * @param {THREE.Scene} scene - The scene to add to
   */
  finalize(scene) {
    console.log(`\n✅ Finalizing instanced renderer...`);
    console.log(`   Used ${this.boardCount} board instances`);
    console.log(`   Used ${this.gridLineCount} grid line instances`);
    console.log(`   Used ${this.xCount} X instances + ${this.xWinnerCount} winner X instances`);
    console.log(`   Used ${this.oCount} O instances + ${this.oWinnerCount} winner O instances`);
    console.log(`   Used ${this.strokeCount} stroke instances`);

    // Store scene reference for mode toggling
    this.scene = scene;

    // Set the actual count (hides unused instances)
    this.instancedBoards.count = this.boardCount;
    this.instancedGridLines.count = this.gridLineCount;
    this.instancedXs.count = this.xCount;
    this.instancedXsWinner.count = this.xWinnerCount;
    this.instancedOs.count = this.oCount;
    this.instancedOsWinner.count = this.oWinnerCount;
    this.instancedStrokes.count = this.strokeCount;

    // Tell Three.js to update the instance matrices
    this.instancedBoards.instanceMatrix.needsUpdate = true;
    this.instancedGridLines.instanceMatrix.needsUpdate = true;
    this.instancedXs.instanceMatrix.needsUpdate = true;
    this.instancedXsWinner.instanceMatrix.needsUpdate = true;
    this.instancedOs.instanceMatrix.needsUpdate = true;
    this.instancedOsWinner.instanceMatrix.needsUpdate = true;
    this.instancedStrokes.instanceMatrix.needsUpdate = true;

    // Always add base meshes
    scene.add(this.instancedBoards);
    scene.add(this.instancedGridLines);
    scene.add(this.instancedXs);
    scene.add(this.instancedOs);

    // Apply current winning highlight mode
    this._updateWinningHighlights();

    const totalMeshes =
      4 +
      (this.winningHighlightMode === 'strokes' ? 1 : 0) +
      (this.winningHighlightMode === 'gold' ? 2 : 0) +
      (this.winningHighlightMode === 'both' ? 3 : 0);

    console.log(
      `   🎉 Added ${totalMeshes} instanced meshes to scene (mode: ${this.winningHighlightMode})`
    );
    console.log(
      `   📊 Expected draw calls: ~${totalMeshes} (vs ${this.boardCount * 6}+ with normal rendering)`
    );
  }

  /**
   * Update winning highlights based on current mode
   * @private
   */
  _updateWinningHighlights() {
    if (!this.scene) return;

    // Remove all winning highlight meshes first
    this.scene.remove(this.instancedXsWinner);
    this.scene.remove(this.instancedOsWinner);
    this.scene.remove(this.instancedStrokes);

    // Add back based on mode
    if (this.winningHighlightMode === 'strokes') {
      // Only strokes
      this.scene.add(this.instancedStrokes);
    } else if (this.winningHighlightMode === 'gold') {
      // Only gold pieces
      this.scene.add(this.instancedXsWinner);
      this.scene.add(this.instancedOsWinner);
    } else if (this.winningHighlightMode === 'both') {
      // Both gold pieces and strokes
      this.scene.add(this.instancedXsWinner);
      this.scene.add(this.instancedOsWinner);
      this.scene.add(this.instancedStrokes);
    }
    // 'none' mode: don't add any winning highlights
  }

  /**
   * Set the winning highlight mode
   * @param {'strokes' | 'gold' | 'both' | 'none'} mode - The highlight mode to use
   */
  setWinningHighlightMode(mode) {
    if (!['strokes', 'gold', 'both', 'none'].includes(mode)) {
      console.warn(`Invalid winning highlight mode: ${mode}`);
      return;
    }

    this.winningHighlightMode = mode;
    this._updateWinningHighlights();
    console.log(`   🎨 Winning highlight mode set to: ${mode}`);
  }

  /**
   * Convert board index (0-8) to local position on board
   */
  indexToPosition(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = col - 1;
    const z = 1 - row;
    return { x, z };
  }

  /**
   * Clean up resources
   */
  dispose() {
    Object.values(this.geometries).forEach(geom => geom.dispose());
    Object.values(this.materials).forEach(mat => mat.dispose());
    console.log('🧹 InstancedBoardRenderer disposed');
  }
}

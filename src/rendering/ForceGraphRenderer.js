/**
 * ForceGraphRenderer.js
 *
 * Force-directed graph layout for visualizing the StateGraph.
 * Uses physics simulation: nodes repel each other, edges attract connected nodes.
 */

import * as THREE from 'three';

export class ForceGraphRenderer {
  constructor() {
    // Graph data
    this.nodes = []; // Array of { id, state, position: THREE.Vector3, velocity: THREE.Vector3 }
    this.edges = []; // Array of { source: nodeIndex, target: nodeIndex }

    // Simulation parameters (tune these!)
    this.params = {
      repulsion: 0.00001, // How strongly nodes push apart
      attraction: 0, // How strongly edges pull nodes together
      damping: 1, // Velocity decay (0-1, higher = more friction)
      centerPull: 0, // Pull toward origin to keep graph centered
      maxVelocity: 0.2, // Cap velocity to prevent explosions
      cooling: 0.995, // Temperature decay per step (0.99 = slow, 0.999 = very slow)
    };

    // Simulation state
    this.isSimulating = false;
    this.temperature = 1.0; // Current simulation "temperature" (1.0 = hot, 0 = frozen)

    // Three.js objects
    this.edgeLines = null;
    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x444466,
      transparent: true,
      opacity: 0.3,
      linewidth: 20,
    });

    console.log('🔮 ForceGraphRenderer initialized');
  }

  /**
   * Load graph data from StateGraph
   * @param {StateGraph} stateGraph - The graph to visualize
   * @param {string} layout - Layout mode: 'radial' or 'tree'
   */
  loadFromStateGraph(stateGraph, layout = 'radial') {
    console.log(`📊 Loading graph with ${stateGraph.graph.size} nodes (${layout} layout)...`);

    this.nodes = [];
    this.edges = [];

    // Create maps for positioning
    const idToIndex = new Map();

    // Group nodes by depth
    const nodesByDepth = new Map();
    for (const [stateId, graphNode] of stateGraph.graph) {
      const depth = graphNode.depth;
      if (!nodesByDepth.has(depth)) {
        nodesByDepth.set(depth, []);
      }
      nodesByDepth.get(depth).push({ stateId, graphNode });
    }

    // Sort depths to process in order
    const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
    let index = 0;

    if (layout === 'tree') {
      // Tree layout: each depth is a row (Z), nodes spread horizontally (X)
      const rowSpacing = 10; // Distance between rows (depth levels)
      const nodeSpacing = 5; // Minimum spacing between nodes in a row

      for (const depth of depths) {
        const nodesAtDepth = nodesByDepth.get(depth);
        const count = nodesAtDepth.length;
        const rowWidth = count * nodeSpacing;
        const z = depth * rowSpacing;

        for (let i = 0; i < count; i++) {
          const { stateId, graphNode } = nodesAtDepth[i];

          // Spread horizontally, centered around origin
          const x = (i - (count - 1) / 2) * nodeSpacing;

          const position = new THREE.Vector3(x, 0, z);

          this.nodes.push({
            id: stateId,
            state: graphNode.state,
            depth: graphNode.depth,
            position: position,
            velocity: new THREE.Vector3(0, 0, 0),
          });

          idToIndex.set(stateId, index);
          index++;
        }
      }
    } else {
      // Radial layout: each depth level on a ring
      const radiusPerDepth = 10; // Distance between rings

      for (let d = 0; d < depths.length; d++) {
        const depth = depths[d];
        const nodesAtDepth = nodesByDepth.get(depth);
        const count = nodesAtDepth.length;
        const radius = depth * radiusPerDepth * d * 0.2;

        for (let i = 0; i < count; i++) {
          const { stateId, graphNode } = nodesAtDepth[i];

          // Distribute evenly around the ring
          const angle = (i / count) * Math.PI * 2;

          const position = new THREE.Vector3(
            Math.cos(angle) * radius,
            -radius * 0.2,
            Math.sin(angle) * radius
          );

          this.nodes.push({
            id: stateId,
            state: graphNode.state,
            depth: graphNode.depth,
            position: position,
            velocity: new THREE.Vector3(0, 0, 0),
          });

          idToIndex.set(stateId, index);
          index++;
        }
      }
    }

    // Create edges from parent-child relationships
    for (const [stateId, graphNode] of stateGraph.graph) {
      const sourceIndex = idToIndex.get(stateId);

      for (const childId of graphNode.children) {
        const targetIndex = idToIndex.get(childId);
        if (targetIndex !== undefined) {
          this.edges.push({
            source: sourceIndex,
            target: targetIndex,
          });
        }
      }
    }

    console.log(`   ✅ Loaded ${this.nodes.length} nodes and ${this.edges.length} edges`);
    console.log(
      `   📊 Depths: ${depths.map(d => `${d}:${nodesByDepth.get(d).length}`).join(', ')}`
    );
  }

  /**
   * Run one step of the force simulation
   * This is where the physics happens!
   */
  simulateStep() {
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const force = new THREE.Vector3(0, 0, 0);
      // Repulsion from other nodes
      for (let j = 0; j < this.nodes.length; j++) {
        if (i === j) continue;
        const other = this.nodes[j];
        const diff = new THREE.Vector3().subVectors(node.position, other.position);
        const distance = diff.length() + 0.1; // Prevent division by zero

        // Repulsion force (inverse square law)
        const repulsionForce = diff
          .normalize()
          .multiplyScalar(this.params.repulsion / (distance * distance));
        force.add(repulsionForce);
      }
      // Attraction from connected nodes
      for (const edge of this.edges) {
        if (edge.source === i) {
          const targetNode = this.nodes[edge.target];
          const diff = new THREE.Vector3().subVectors(targetNode.position, node.position);
          const distance = diff.length() + 0.1; // Prevent division by zero

          // Attraction force (linear)
          const attractionForce = diff
            .normalize()
            .multiplyScalar(this.params.attraction * distance);
          force.add(attractionForce);
        } else if (edge.target === i) {
          const sourceNode = this.nodes[edge.source];
          const diff = new THREE.Vector3().subVectors(sourceNode.position, node.position);
          const distance = diff.length() + 0.1; // Prevent division by zero
          // Attraction force (linear)
          const attractionForce = diff
            .normalize()
            .multiplyScalar(this.params.attraction * distance);
          force.add(attractionForce);
        }
      }
      // Pull toward center
      const centerDiff = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), node.position);
      const centerForce = centerDiff.multiplyScalar(this.params.centerPull);
      force.add(centerForce);
      // Scale force by temperature (cooling)
      force.multiplyScalar(this.temperature);
      // Update velocity
      node.velocity.add(force);
      // Apply damping
      node.velocity.multiplyScalar(this.params.damping);
      // Keep flat (2D simulation on X-Z plane)
      //node.velocity.y = 0;
      node.velocity.clampLength(0, this.params.maxVelocity * this.temperature);
      node.position.add(node.velocity);
      //node.position.y = 0; // Ensure Y stays at 0
    }

    // Cool down the simulation
    this.temperature *= this.params.cooling;

    // Auto-stop when nearly frozen
    if (this.temperature < 0.001) {
      this.temperature = 0.001; // Keep a tiny bit of movement
    }
  }

  /**
   * Create the edge lines geometry
   * Call after loading graph data
   */
  createEdgeGeometry() {
    // Create line segments for all edges
    const positions = [];

    for (const edge of this.edges) {
      const sourcePos = this.nodes[edge.source].position;
      const targetPos = this.nodes[edge.target].position;

      positions.push(sourcePos.x, sourcePos.y, sourcePos.z);
      positions.push(targetPos.x, targetPos.y, targetPos.z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    this.edgeLines = new THREE.LineSegments(geometry, this.edgeMaterial);

    console.log(`   📏 Created edge geometry with ${this.edges.length} lines`);
  }

  /**
   * Update edge positions after simulation step
   * Call this every frame during simulation
   */
  updateEdgePositions() {
    if (!this.edgeLines) return;

    const positions = this.edgeLines.geometry.attributes.position.array;
    let i = 0;

    for (const edge of this.edges) {
      const sourcePos = this.nodes[edge.source].position;
      const targetPos = this.nodes[edge.target].position;

      positions[i++] = sourcePos.x;
      positions[i++] = sourcePos.y;
      positions[i++] = sourcePos.z;
      positions[i++] = targetPos.x;
      positions[i++] = targetPos.y;
      positions[i++] = targetPos.z;
    }

    this.edgeLines.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Add edge lines to the scene
   */
  addToScene(scene) {
    if (this.edgeLines) {
      scene.add(this.edgeLines);
      console.log('   ✅ Added edge lines to scene');
    }
  }

  /**
   * Start the force simulation
   */
  startSimulation() {
    this.isSimulating = true;
    console.log('▶️  Force simulation started');
  }

  /**
   * Stop the force simulation
   */
  stopSimulation() {
    this.isSimulating = false;
    console.log('⏸️  Force simulation stopped');
  }

  /**
   * Reheat the simulation (restart cooling)
   * @param {number} temp - New temperature (default 1.0)
   */
  reheat(temp = 1.0) {
    this.temperature = temp;
    console.log(`🔥 Reheated to temperature ${temp}`);
  }

  /**
   * Get node positions for the board renderer
   * @returns {Array} Array of { state, position: {x, y, z} }
   */
  getNodePositions() {
    return this.nodes.map(node => ({
      state: node.state,
      position: {
        x: node.position.x,
        y: node.position.y,
        z: node.position.z,
      },
    }));
  }

  /**
   * Clean up resources
   */
  dispose() {
    if (this.edgeLines) {
      this.edgeLines.geometry.dispose();
    }
    this.edgeMaterial.dispose();
    console.log('🧹 ForceGraphRenderer disposed');
  }
}

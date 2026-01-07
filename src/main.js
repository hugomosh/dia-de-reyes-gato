/**
 * Main entry point for Tic-Tac-Toe State Space Visualization
 */

import './style.css';
import * as THREE from 'three';

// Core classes
import { StateGenerator } from './core/StateGenerator.js';

// Rendering
import { ThreeSetup } from './rendering/ThreeSetup.js';
import { InstancedBoardRenderer } from './rendering/InstancedBoardRenderer.js';

// Scene Management
import { ScrollController } from './scenes/ScrollController.js';
import { SceneManager } from './scenes/SceneManager.js';
import { Scene1Controller } from './scenes/Scene1Controller.js';

console.log('🎮 Tic-Tac-Toe State Space Visualization - Story Mode');

// Export for debugging in console
window.TicTacToeApp = {
  version: '0.2.0',
  status: 'initializing',
};

// Initialize state generator and core functionality
function init() {
  // 1. Initialize core state generation
  // console.log('📊 Generating 19,683 states...');
  // const stateGenerator = new StateGenerator();
  // const allStates = stateGenerator.generateAll();
  // stateGenerator.printStatistics();

  // 2. Initialize Three.js rendering
  console.log('\n🎨 Initializing Three.js scene...');
  const canvas = document.getElementById('three-canvas');
  const threeSetup = new ThreeSetup(canvas);
  threeSetup.init();
  // Set camera for Scene 1
  threeSetup.camera.position.set(0, 3, 8);


  threeSetup.start(); // Start Three.js render loop immediately

  // 3. Render the complete state space as the base "world"
  // console.log('\n🌌 Rendering all 19,683 states in a grid...');
  // const instancedRenderer = renderWorldGrid(threeSetup, allStates);
  // instancedRenderer.setWinningHighlightMode('strokes');

  // 4. Initialize Scene Controllers
  const scene1Controller = new Scene1Controller(threeSetup.scene);

  // Hook Scene 1 animation into render loop
  threeSetup.onAnimate(() => {
    if (scene1Controller.isPlaying) {
      scene1Controller.update(performance.now());
    }
  });

  // Directly start Scene 1 for debugging
  scene1Controller.start();


  // 5. Initialize ScrollController
  // const scrollController = new ScrollController();
  // scrollController.init();

  // 6. Define Scene Configurations
  // const sceneConfigs = [ ... ];

  // 7. Initialize SceneManager
  // const sceneManager = new SceneManager(threeSetup, instancedRenderer);
  // sceneManager.init(sceneConfigs, scrollController.totalScrollHeight);

  // Manually trigger Scene 1 on page load (scroll position 0)
  // sceneManager.onScroll(0, 0);

  // 8. Connect ScrollController to SceneManager
  // scrollController.onScroll((scrollPosition, scrollProgress) => { ... });

  // Store references for debugging and future scenes
  window.TicTacToeApp = {
    ...window.TicTacToeApp,
    // stateGenerator,
    threeSetup,
    // instancedRenderer,
    // scrollController,
    // sceneManager,
    scene1Controller,
    status: 'ready',
  };

  // Hide loading screen
  const loading = document.getElementById('loading');
  loading.classList.add('hidden');
  console.log('✅ Ready to debug Scene 1!');
}

/**
 * Renders all 19,683 states in a large grid.
 * This forms the "world" for our narrative journey.
 * @param {ThreeSetup} threeSetup - The Three.js setup object.
 * @param {TicTacToeState[]} allStates - Array of all states.
 * @returns {InstancedBoardRenderer}
 */
function renderWorldGrid(threeSetup, allStates) {
  const startTime = performance.now();
  const totalStates = allStates.length;

  // Grid dimensions for all 19,683 states
  // A grid of 141x140 gives 19,740 spots, which is big enough.
  const cols = 141;
  const rows = 141;
  const spacing = 3.5;

  // Adjust camera to a default starting position, looking down at the center.
  // This will be controlled by the scroll manager later.
  threeSetup.camera.position.set(0, 150, 10);
  threeSetup.camera.lookAt(0, 0, 0);

  // Create and initialize the instanced renderer
  const instancedRenderer = new InstancedBoardRenderer();
  instancedRenderer.init(totalStates);

  // Add all states to the renderer in a grid layout
  let stateIndex = 0;
  for (let row = 0; row < rows && stateIndex < totalStates; row++) {
    for (let col = 0; col < cols && stateIndex < totalStates; col++) {
      const state = allStates[stateIndex];
      // Center the grid around the origin (0,0,0)
      const x = (col - cols / 2) * spacing;
      const z = (row - rows / 2) * spacing;
      instancedRenderer.addBoard(state, { x, y: 0, z });
      stateIndex++;
    }
  }

  // Finalize and add the meshes to the scene
  instancedRenderer.finalize(threeSetup.scene);

  const duration = (performance.now() - startTime).toFixed(2);
  console.log(`   ✅ Rendered ${totalStates} states in ${duration}ms`);

  // Log detailed render stats after a short delay
  setTimeout(() => threeSetup.logRenderStats(), 100);

  return instancedRenderer;
}

init();

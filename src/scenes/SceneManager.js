import * as THREE from 'three';

export class SceneManager {
  constructor(threeSetup, instancedBoardRenderer) {
    this.threeSetup = threeSetup;
    this.camera = threeSetup.camera;
    this.instancedBoardRenderer = instancedBoardRenderer;

    this.scenes = []; // Array of scene configurations
    this.currentSceneIndex = -1; // Index of the currently active scene

    this.scrollProgress = 0; // Global scroll progress (0-1)
    this.totalScrollHeight = 1; // Will be set by ScrollController

    // Camera target for smooth movement
    this.targetCameraPosition = new THREE.Vector3();
    this.targetCameraLookAt = new THREE.Vector3();

    // Default camera position/lookAt (from ThreeSetup)
    this.initialCameraPosition = this.camera.position.clone();
    this.initialCameraLookAt = new THREE.Vector3(0, 0, 0); // Assuming ThreeSetup looks at origin
  }

  /**
   * Initializes the SceneManager with predefined scenes.
   * @param {Array} sceneConfigs - An array of scene configuration objects.
   * @param {number} totalScrollHeight - The total height of the scrollable content.
   */
  init(sceneConfigs, totalScrollHeight) {
    console.log('🎬 Initializing SceneManager...');
    this.scenes = sceneConfigs;
    this.totalScrollHeight = totalScrollHeight;

    // Set initial camera targets to current camera state
    this.targetCameraPosition.copy(this.camera.position);
    this.targetCameraLookAt.copy(this.initialCameraLookAt);

    // Make sure there's always a render loop running to update camera
    if (!this.threeSetup.isRunning) {
      this.threeSetup.start();
    }
    this.threeSetup.onAnimate(() => this._updateCamera());

    console.log(`✅ SceneManager initialized with ${this.scenes.length} scenes.`);
  }

  /**
   * Updates the camera position and look-at target based on global scroll progress.
   * This method is called by the ScrollController.
   * @param {number} scrollPosition - The current raw scroll position.
   * @param {number} scrollProgress - The normalized global scroll progress (0-1).
   */
  onScroll(scrollPosition, scrollProgress) {
    this.scrollProgress = scrollProgress;

    // Determine the active scene
    let newSceneIndex = -1;
    for (let i = 0; i < this.scenes.length; i++) {
      const scene = this.scenes[i];
      const sceneStart = scene.startScroll / this.totalScrollHeight;
      const sceneEnd = scene.endScroll / this.totalScrollHeight;

      if (scrollProgress >= sceneStart && scrollProgress < sceneEnd) {
        newSceneIndex = i;
        break;
      }
    }

    if (newSceneIndex !== this.currentSceneIndex) {
      this._transitionScene(this.currentSceneIndex, newSceneIndex);
      this.currentSceneIndex = newSceneIndex;
    }

    // If a scene is active, update its progress
    if (this.currentSceneIndex !== -1) {
      const activeScene = this.scenes[this.currentSceneIndex];
      const sceneStart = activeScene.startScroll / this.totalScrollHeight;
      const sceneEnd = activeScene.endScroll / this.totalScrollHeight;

      // Calculate progress within the current scene (0-1)
      const sceneProgress = (scrollProgress - sceneStart) / (sceneEnd - sceneStart);

      // Interpolate camera path for the active scene
      if (activeScene.cameraPath) {
        const startPos = activeScene.cameraPath.startPosition || this.initialCameraPosition;
        const endPos = activeScene.cameraPath.endPosition || this.initialCameraPosition;
        const startLookAt = activeScene.cameraPath.startLookAt || this.initialCameraLookAt;
        const endLookAt = activeScene.cameraPath.endLookAt || this.initialCameraLookAt;

        this.targetCameraPosition.lerpVectors(startPos, endPos, sceneProgress);
        this.targetCameraLookAt.lerpVectors(startLookAt, endLookAt, sceneProgress);
      }

      // Call the scene's onProgress callback
      if (activeScene.onProgress) {
        activeScene.onProgress(sceneProgress, this.camera, this.instancedBoardRenderer);
      }
    }
  }

  /**
   * Smoothly updates the camera's position and look-at point towards its targets.
   * Called on every animation frame.
   * @private
   */
  _updateCamera() {
    this.camera.position.lerp(this.targetCameraPosition, 0.1);
    this.camera.lookAt(this.targetCameraLookAt);
  }

  /**
   * Handles scene transitions (onEnter, onExit callbacks).
   * @param {number} oldIndex - Index of the scene being exited.
   * @param {number} newIndex - Index of the scene being entered.
   * @private
   */
  _transitionScene(oldIndex, newIndex) {
    if (oldIndex !== -1) {
      const exitedScene = this.scenes[oldIndex];
      if (exitedScene.onExit) {
        exitedScene.onExit(this.camera, this.instancedBoardRenderer);
        console.log(`   Exited Scene: ${exitedScene.id}`);
      }
    }
    if (newIndex !== -1) {
      const enteredScene = this.scenes[newIndex];
      if (enteredScene.onEnter) {
        enteredScene.onEnter(this.camera, this.instancedBoardRenderer);
        console.log(`   Entered Scene: ${enteredScene.id}`);
      }
    }
  }

  /**
   * Disposes the SceneManager and cleans up resources.
   */
  dispose() {
    this.scenes = [];
    this.onScrollCallbacks = [];
    // Ensure ThreeSetup's animation loop is stopped if no longer needed
    // this.threeSetup.stop(); // Only if SceneManager is the sole controller
    console.log('🧹 SceneManager disposed.');
  }
}

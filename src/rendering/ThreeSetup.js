/**
 * ThreeSetup.js
 *
 * Bootstraps the Three.js scene with camera, renderer, and lighting.
 * This is the foundation for rendering all 19,683 tic-tac-toe boards.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ThreeSetup {
  constructor(canvas) {
    this.canvas = canvas;

    // Core Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // Animation state
    this.animationId = null;
    this.isRunning = false;

    // Callbacks to run during animation loop
    this._onAnimateCallbacks = [];
  }

  /**
   * Initializes the Three.js scene
   */
  init() {
    console.log('🎨 Initializing Three.js scene...');

    // 1. CREATE SCENE
    // The scene is like a stage - it holds all objects, lights, and cameras
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e); // Dark blue background

    // 2. CREATE CAMERA
    // PerspectiveCamera mimics how human eyes see (with depth/perspective)
    // Parameters: FOV (field of view), aspect ratio, near plane, far plane
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV: 75 degrees (wider = more visible)
      aspect, // Aspect ratio (will update on resize)
      0.1, // Near plane: objects closer than this are invisible
      1000 // Far plane: objects farther than this are invisible
    );

    // Position camera back and up a bit so we can see the origin
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0); // Look at the center of the scene

    // 3. CREATE RENDERER
    // The renderer takes what the camera sees and draws it on the canvas
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true, // Smooth edges (costs performance but looks better)
      alpha: false, // No transparency needed
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance

    // Enable shadows for more realistic lighting (we'll use this later)
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. ADD ORBIT CONTROLS
    // OrbitControls let you rotate/zoom the camera with mouse/touch
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true; // Smooth, inertial movement
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5; // How close you can zoom
    this.controls.maxDistance = 500; // How far you can zoom out

    // 5. ADD LIGHTING
    this.setupLighting();

    // 6. ADD TEST OBJECTS
    //this.addTestObjects();

    // 7. HANDLE WINDOW RESIZE
    window.addEventListener('resize', () => this.onResize());

    console.log('✅ Three.js scene initialized');
    console.log(`   Scene: ${this.scene.children.length} objects`);
    console.log(
      `   Camera: ${this.camera.position.x.toFixed(1)}, ${this.camera.position.y.toFixed(1)}, ${this.camera.position.z.toFixed(1)}`
    );
    console.log(`   Canvas: ${this.canvas.width}x${this.canvas.height}`);
  }

  /**
   * Set up scene lighting
   *
   * We use two types of lights:
   * - AmbientLight: Lights everything equally (no shadows, base illumination)
   * - DirectionalLight: Like sunlight, comes from one direction (creates shadows)
   */
  setupLighting() {
    // Ambient light: Soft, overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // Directional light: Main light source (like the sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 200, 10);
    directionalLight.castShadow = true;

    // Configure shadow quality
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -400;
    directionalLight.shadow.camera.right = 400;
    directionalLight.shadow.camera.top = 400;
    directionalLight.shadow.camera.bottom = -400;

    this.scene.add(directionalLight);

    // Optional: Add a subtle fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.2);
    fillLight.position.set(-10, 10, -10);
    this.scene.add(fillLight);
  }

  /**
   * Add test objects to verify rendering works
   * This cube will be replaced with tic-tac-toe boards later
   */
  addTestObjects() {
    // Create a simple cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x02ff88, // Bright green-cyan
      roughness: 0.3, // How rough/shiny the surface is (0 = mirror, 1 = rough)
      metalness: 0.5, // How metallic it looks
    });

    // Add a ground plane to receive shadows
    const planeGeometry = new THREE.PlaneGeometry(50, 50);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    plane.position.y = -2;
    plane.receiveShadow = true;
    this.scene.add(plane);

    // Add a grid helper to see the coordinate system
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    gridHelper.position.y = -1.99; // Slightly above the plane to avoid z-fighting
    this.scene.add(gridHelper);

    console.log('   Added test cube and ground plane');
  }

  /**
   * Start the animation loop
   * This is called 60 times per second (or as fast as the display allows)
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.animate();
    console.log('▶️  Animation loop started');
  }

  /**
   * Stop the animation loop
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    console.log('⏸️  Animation loop stopped');
  }

  /**
   * Animation loop - called every frame
   * This is where we update objects and render the scene
   */
  animate() {
    if (!this.isRunning) return;

    // Request next frame
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update controls (needed for damping)
    this.controls.update();

    // Execute registered callbacks
    this._onAnimateCallbacks.forEach(callback => callback());

    // Render the scene from the camera's perspective
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Register a callback function to be executed on each animation frame.
   * @param {Function} callback - The function to call.
   */
  onAnimate(callback) {
    this._onAnimateCallbacks.push(callback);
  }

  /**
   * Handle window resize
   * Update camera aspect ratio and renderer size
   */
  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update camera
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    console.log(`📐 Resized to ${width}x${height}`);
  }

  /**
   * Get rendering statistics for performance profiling
   */
  getRenderStats() {
    const stats = {
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs.length,
      calls: this.renderer.info.render.calls,
      points: this.renderer.info.render.points,
      lines: this.renderer.info.render.lines,
      sceneObjects: 0,
      meshes: 0,
      lights: 0,
    };

    // Count scene objects
    this.scene.traverse(object => {
      stats.sceneObjects++;
      if (object.isMesh) stats.meshes++;
      if (object.isLight) stats.lights++;
    });

    return stats;
  }

  /**
   * Log rendering statistics to console
   */
  logRenderStats() {
    const stats = this.getRenderStats();
    console.log('\n📊 Rendering Statistics:');
    console.log(`   Draw Calls: ${stats.calls} (lower is better)`);
    console.log(`   Triangles: ${stats.triangles.toLocaleString()}`);
    console.log(`   Meshes: ${stats.meshes} objects`);
    console.log(`   Scene Objects: ${stats.sceneObjects} total`);
    console.log(`   Geometries in Memory: ${stats.geometries}`);
    console.log(`   Shader Programs: ${stats.programs}`);
    console.log(`   Lights: ${stats.lights}`);
    return stats;
  }

  /**
   * Toggle shadows on/off for performance testing
   */
  toggleShadows(enabled) {
    this.renderer.shadowMap.enabled = enabled;

    // Update all objects
    this.scene.traverse(object => {
      if (object.isMesh) {
        object.castShadow = enabled;
        object.receiveShadow = enabled;
      }
      if (object.isLight && object.castShadow !== undefined) {
        object.castShadow = enabled;
      }
    });

    console.log(`💡 Shadows ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop();

    // Remove event listeners
    window.removeEventListener('resize', () => this.onResize());

    // Dispose of Three.js objects
    this.scene.traverse(object => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    this.controls.dispose();

    console.log('🧹 Three.js resources cleaned up');
  }
}

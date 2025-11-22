// Three.js Scene Manager for Voxel Battleship

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Setup camera
    this.camera = this.createCamera();

    // Setup renderer
    this.renderer = this.createRenderer();

    // Setup controls
    this.controls = this.createControls();

    // Setup lights
    this.setupLights();

    // Setup environment
    this.setupEnvironment();

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Handle mouse move
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(15, 20, 15);
    camera.lookAt(5, 0, 5);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x87ceeb, 1); // Sky blue background
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2.2; // Limit camera angle
    controls.target.set(5, 0, 5); // Look at center of board
    return controls;
  }

  private setupLights(): void {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light for sun effect
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Hemisphere light for sky/ground effect
    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3a7ca5, 0.4);
    this.scene.add(hemisphereLight);
  }

  private setupEnvironment(): void {
    // Add fog for depth
    this.scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

    // Add grid helper (optional, for debugging)
    // const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc);
    // this.scene.add(gridHelper);
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * Add an object to the scene
   */
  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remove an object from the scene
   */
  public remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Get objects intersecting with mouse ray
   */
  public getIntersects(objects: THREE.Object3D[]): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  /**
   * Start animation loop
   */
  public startAnimation(onUpdate?: () => void): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // Update controls
      this.controls.update();

      // Call custom update function
      if (onUpdate) {
        onUpdate();
      }

      // Render scene
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Stop animation loop
   */
  public stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stopAnimation();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize);

    // Remove renderer from DOM
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }

  /**
   * Get camera for external use
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Get scene for external use
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Get renderer for external use
   */
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Get controls for external use
   */
  public getControls(): OrbitControls {
    return this.controls;
  }

  /**
   * Get mouse position
   */
  public getMouse(): THREE.Vector2 {
    return this.mouse;
  }
}

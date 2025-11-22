// Voxel utility functions for Minecraft-style rendering

import * as THREE from 'three';
import { Coordinate } from '../types';

/**
 * Create a single voxel cube
 */
export function createVoxel(
  x: number,
  y: number,
  z: number,
  size: number,
  color: number,
  options?: {
    wireframe?: boolean;
    opacity?: number;
    transparent?: boolean;
    emissive?: number;
  }
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size, size, size);

  const material = new THREE.MeshStandardMaterial({
    color,
    wireframe: options?.wireframe || false,
    transparent: options?.transparent || false,
    opacity: options?.opacity !== undefined ? options.opacity : 1,
    emissive: options?.emissive || 0x000000,
    emissiveIntensity: 0.2,
    roughness: 0.7,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Create a voxel cube with edge highlighting (Minecraft style)
 */
export function createStylizedVoxel(
  x: number,
  y: number,
  z: number,
  size: number,
  color: number
): THREE.Group {
  const group = new THREE.Group();

  // Main cube
  const mainCube = createVoxel(x, y, z, size, color);
  group.add(mainCube);

  // Edge wireframe for Minecraft aesthetic
  const edges = new THREE.EdgesGeometry(mainCube.geometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 1,
    opacity: 0.3,
    transparent: true,
  });
  const wireframe = new THREE.LineSegments(edges, lineMaterial);
  wireframe.position.set(x, y, z);
  group.add(wireframe);

  return group;
}

/**
 * Create a water voxel (animated/translucent)
 */
export function createWaterVoxel(x: number, y: number, z: number, size: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size, size * 0.8, size);

  const material = new THREE.MeshStandardMaterial({
    color: 0x3a7ca5,
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.8,
    emissive: 0x1a5c8a,
    emissiveIntensity: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * Create a grid of voxels (for water board)
 */
export function createVoxelGrid(
  rows: number,
  cols: number,
  voxelSize: number,
  spacing: number,
  createVoxelFn: (x: number, y: number, z: number, size: number) => THREE.Object3D
): THREE.Group {
  const group = new THREE.Group();
  const totalSize = voxelSize + spacing;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * totalSize;
      const z = row * totalSize;
      const voxel = createVoxelFn(x, 0, z, voxelSize);

      // Store grid coordinates as user data
      voxel.userData = {
        gridX: col,
        gridY: row,
        type: 'cell',
      };

      group.add(voxel);
    }
  }

  return group;
}

/**
 * Create a ship from voxels
 */
export function createVoxelShip(
  coordinates: Coordinate[],
  voxelSize: number,
  spacing: number,
  color: number,
  yOffset: number = 0.5
): THREE.Group {
  const group = new THREE.Group();
  const totalSize = voxelSize + spacing;

  coordinates.forEach((coord) => {
    const x = coord.x * totalSize;
    const z = coord.y * totalSize;
    const y = yOffset;

    const voxel = createStylizedVoxel(x, y, z, voxelSize * 0.9, color);
    voxel.userData = {
      gridX: coord.x,
      gridY: coord.y,
      type: 'ship',
    };

    group.add(voxel);
  });

  return group;
}

/**
 * Create a hit marker (red voxel)
 */
export function createHitMarker(
  x: number,
  y: number,
  z: number,
  size: number
): THREE.Mesh {
  const voxel = createVoxel(x, y, z, size * 0.6, 0xff0000, {
    emissive: 0xff0000,
  });
  voxel.userData = { type: 'hit' };
  return voxel;
}

/**
 * Create a miss marker (white voxel)
 */
export function createMissMarker(
  x: number,
  y: number,
  z: number,
  size: number
): THREE.Mesh {
  const voxel = createVoxel(x, y, z, size * 0.4, 0xffffff, {
    opacity: 0.8,
    transparent: true,
  });
  voxel.userData = { type: 'miss' };
  return voxel;
}

/**
 * Create a targeting reticle
 */
export function createTargetingReticle(size: number): THREE.Group {
  const group = new THREE.Group();

  // Outer ring
  const ringGeometry = new THREE.RingGeometry(size * 0.4, size * 0.5, 32);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  group.add(ring);

  // Crosshair
  const crosshairGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array([
    -size * 0.3, 0, 0,
    size * 0.3, 0, 0,
    0, 0, -size * 0.3,
    0, 0, size * 0.3,
  ]);
  crosshairGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const crosshairMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    linewidth: 2,
  });
  const crosshair = new THREE.LineSegments(crosshairGeometry, crosshairMaterial);
  crosshair.position.y = 0.01;
  group.add(crosshair);

  group.visible = false;
  return group;
}

/**
 * Highlight a voxel cell
 */
export function highlightVoxel(voxel: THREE.Object3D, highlighted: boolean): void {
  voxel.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      if (highlighted) {
        child.material.emissive.setHex(0x444444);
        child.material.emissiveIntensity = 0.5;
      } else {
        child.material.emissive.setHex(0x000000);
        child.material.emissiveIntensity = 0.1;
      }
    }
  });
}

/**
 * Animate explosion effect at coordinate
 */
export function createExplosionEffect(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  color: number
): void {
  const particleCount = 20;
  const particles: THREE.Mesh[] = [];

  for (let i = 0; i < particleCount; i++) {
    const particle = createVoxel(x, y, z, 0.1, color, {
      transparent: true,
      opacity: 1,
    });

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 2,
      (Math.random() - 0.5) * 2
    );
    particle.userData.velocity = velocity;

    particles.push(particle);
    scene.add(particle);
  }

  // Animate particles
  let frame = 0;
  const maxFrames = 60;

  const animate = () => {
    frame++;

    particles.forEach((particle) => {
      particle.position.add(particle.userData.velocity as THREE.Vector3);
      particle.userData.velocity.y -= 0.05; // Gravity

      if (particle.material instanceof THREE.MeshStandardMaterial) {
        particle.material.opacity = 1 - (frame / maxFrames);
      }
    });

    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      // Clean up
      particles.forEach((particle) => {
        scene.remove(particle);
        particle.geometry.dispose();
        if (particle.material instanceof THREE.Material) {
          particle.material.dispose();
        }
      });
    }
  };

  animate();
}

/**
 * Convert grid coordinates to world position
 */
export function gridToWorld(
  gridX: number,
  gridY: number,
  voxelSize: number,
  spacing: number
): { x: number; z: number } {
  const totalSize = voxelSize + spacing;
  return {
    x: gridX * totalSize,
    z: gridY * totalSize,
  };
}

/**
 * Convert world position to grid coordinates
 */
export function worldToGrid(
  x: number,
  z: number,
  voxelSize: number,
  spacing: number
): { gridX: number; gridY: number } {
  const totalSize = voxelSize + spacing;
  return {
    gridX: Math.floor(x / totalSize),
    gridY: Math.floor(z / totalSize),
  };
}

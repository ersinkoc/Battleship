// Game Board visualization with voxel-based water grid

import * as THREE from 'three';
import { Coordinate, Ship, BOARD_SIZE } from '../types';
import {
  createVoxelGrid,
  createWaterVoxel,
  createVoxelShip,
  createHitMarker,
  createMissMarker,
  createTargetingReticle,
  highlightVoxel,
  createExplosionEffect,
  gridToWorld,
} from '../utils/voxel.util';

export class GameBoard {
  private group: THREE.Group;
  private waterGrid: THREE.Group;
  private shipsGroup: THREE.Group;
  private markersGroup: THREE.Group;
  private targetingReticle: THREE.Group;
  private voxelSize = 0.9;
  private spacing = 0.1;
  private currentHighlight: THREE.Object3D | null = null;

  constructor() {
    this.group = new THREE.Group();

    // Create water grid
    this.waterGrid = this.createWaterGrid();
    this.group.add(this.waterGrid);

    // Create groups for ships and markers
    this.shipsGroup = new THREE.Group();
    this.group.add(this.shipsGroup);

    this.markersGroup = new THREE.Group();
    this.group.add(this.markersGroup);

    // Create targeting reticle
    this.targetingReticle = createTargetingReticle(this.voxelSize);
    this.group.add(this.targetingReticle);

    // Add base platform
    this.createBasePlatform();
  }

  private createWaterGrid(): THREE.Group {
    return createVoxelGrid(
      BOARD_SIZE,
      BOARD_SIZE,
      this.voxelSize,
      this.spacing,
      (x, y, z, size) => createWaterVoxel(x, y, z, size)
    );
  }

  private createBasePlatform(): void {
    const totalSize = (this.voxelSize + this.spacing) * BOARD_SIZE;
    const geometry = new THREE.BoxGeometry(totalSize, 0.2, totalSize);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
    });

    const platform = new THREE.Mesh(geometry, material);
    platform.position.set(
      totalSize / 2 - (this.voxelSize + this.spacing) / 2,
      -0.6,
      totalSize / 2 - (this.voxelSize + this.spacing) / 2
    );
    platform.receiveShadow = true;
    this.group.add(platform);
  }

  /**
   * Place ships on the board
   */
  public placeShips(ships: Ship[]): void {
    // Clear existing ships
    this.shipsGroup.clear();

    ships.forEach((ship, index) => {
      const shipGroup = createVoxelShip(
        ship.coordinates,
        this.voxelSize,
        this.spacing,
        this.getShipColor(ship.id),
        0.5
      );

      shipGroup.userData = {
        shipId: ship.id,
        shipName: ship.name,
      };

      this.shipsGroup.add(shipGroup);
    });
  }

  /**
   * Add hit marker at coordinate
   */
  public addHitMarker(coord: Coordinate, scene?: THREE.Scene): void {
    const worldPos = gridToWorld(coord.x, coord.y, this.voxelSize, this.spacing);

    const marker = createHitMarker(
      worldPos.x,
      0.5,
      worldPos.z,
      this.voxelSize
    );

    this.markersGroup.add(marker);

    // Add explosion effect
    if (scene) {
      createExplosionEffect(scene, worldPos.x, 0.5, worldPos.z, 0xff4444);
    }
  }

  /**
   * Add miss marker at coordinate
   */
  public addMissMarker(coord: Coordinate): void {
    const worldPos = gridToWorld(coord.x, coord.y, this.voxelSize, this.spacing);

    const marker = createMissMarker(
      worldPos.x,
      0.3,
      worldPos.z,
      this.voxelSize
    );

    this.markersGroup.add(marker);
  }

  /**
   * Show targeting reticle at coordinate
   */
  public showTargetingReticle(coord: Coordinate): void {
    const worldPos = gridToWorld(coord.x, coord.y, this.voxelSize, this.spacing);

    this.targetingReticle.position.set(worldPos.x, 0.6, worldPos.z);
    this.targetingReticle.visible = true;
  }

  /**
   * Hide targeting reticle
   */
  public hideTargetingReticle(): void {
    this.targetingReticle.visible = false;
  }

  /**
   * Highlight a cell
   */
  public highlightCell(coord: Coordinate | null): void {
    // Remove previous highlight
    if (this.currentHighlight) {
      highlightVoxel(this.currentHighlight, false);
      this.currentHighlight = null;
    }

    // Add new highlight
    if (coord !== null) {
      const cell = this.getCellAt(coord);
      if (cell) {
        highlightVoxel(cell, true);
        this.currentHighlight = cell;
      }
    }
  }

  /**
   * Get cell at grid coordinate
   */
  public getCellAt(coord: Coordinate): THREE.Object3D | null {
    let found: THREE.Object3D | null = null;

    this.waterGrid.children.forEach((child) => {
      if (
        child.userData.gridX === coord.x &&
        child.userData.gridY === coord.y
      ) {
        found = child;
      }
    });

    return found;
  }

  /**
   * Get all interactive cells
   */
  public getInteractiveCells(): THREE.Object3D[] {
    return this.waterGrid.children;
  }

  /**
   * Clear all markers
   */
  public clearMarkers(): void {
    this.markersGroup.clear();
  }

  /**
   * Clear all ships
   */
  public clearShips(): void {
    this.shipsGroup.clear();
  }

  /**
   * Clear board completely
   */
  public clear(): void {
    this.clearShips();
    this.clearMarkers();
    this.hideTargetingReticle();
    this.highlightCell(null);
  }

  /**
   * Get ship color by ID
   */
  private getShipColor(shipId: string): number {
    const colors: { [key: string]: number } = {
      carrier: 0x4a90e2,
      battleship: 0xe74c3c,
      cruiser: 0xf39c12,
      submarine: 0x9b59b6,
      destroyer: 0x2ecc71,
    };

    return colors[shipId] || 0x888888;
  }

  /**
   * Get the board group
   */
  public getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Animate water (optional effect)
   */
  public animateWater(time: number): void {
    this.waterGrid.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        const offset = (index % 10) * 0.1;
        child.position.y = Math.sin(time * 0.001 + offset) * 0.02;
      }
    });
  }

  /**
   * Set board position in world
   */
  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}

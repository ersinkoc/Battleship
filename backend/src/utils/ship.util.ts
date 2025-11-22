// Ship placement validation utilities

import { Ship, ShipPlacement, Coordinate } from '../types';
import { REQUIRED_SHIPS, SHIP_TYPES } from '../models/game.constants';
import {
  generateShipCoordinates,
  allCoordinatesValid,
  coordinatesOverlap,
  coordinateExists,
} from './coordinate.util';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a single ship placement
 */
export function validateShipPlacement(
  placement: ShipPlacement,
  existingShips: Ship[]
): ValidationResult {
  // Check if ship type is valid
  const shipType = Object.values(SHIP_TYPES).find((s) => s.id === placement.id);
  if (!shipType) {
    return { valid: false, error: `Invalid ship type: ${placement.id}` };
  }

  // Check if size matches
  if (placement.size !== shipType.size) {
    return {
      valid: false,
      error: `Ship ${placement.name} should have size ${shipType.size}, got ${placement.size}`,
    };
  }

  // Generate coordinates
  const coordinates = generateShipCoordinates(
    placement.startCoordinate,
    placement.size,
    placement.orientation
  );

  // Check if all coordinates are valid (within board)
  if (!allCoordinatesValid(coordinates)) {
    return { valid: false, error: `Ship ${placement.name} goes out of bounds` };
  }

  // Check for overlap with existing ships
  for (const existingShip of existingShips) {
    if (coordinatesOverlap(coordinates, existingShip.coordinates)) {
      return {
        valid: false,
        error: `Ship ${placement.name} overlaps with ${existingShip.name}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate all ship placements at once
 */
export function validateAllShipPlacements(
  placements: ShipPlacement[]
): ValidationResult {
  // Check if correct number of ships
  if (placements.length !== REQUIRED_SHIPS.length) {
    return {
      valid: false,
      error: `Expected ${REQUIRED_SHIPS.length} ships, got ${placements.length}`,
    };
  }

  // Check if all required ships are present
  const requiredIds = REQUIRED_SHIPS.map((s) => s.id).sort();
  const providedIds = placements.map((p) => p.id).sort();

  if (JSON.stringify(requiredIds) !== JSON.stringify(providedIds)) {
    return {
      valid: false,
      error: 'Missing or duplicate ships in placement',
    };
  }

  // Validate each ship incrementally
  const ships: Ship[] = [];

  for (const placement of placements) {
    const result = validateShipPlacement(placement, ships);
    if (!result.valid) {
      return result;
    }

    // Add to ships array for next iteration
    const coordinates = generateShipCoordinates(
      placement.startCoordinate,
      placement.size,
      placement.orientation
    );

    ships.push({
      id: placement.id,
      name: placement.name,
      size: placement.size,
      coordinates,
      hits: 0,
      isSunk: false,
    });
  }

  return { valid: true };
}

/**
 * Convert ship placements to Ship objects
 */
export function convertPlacementsToShips(placements: ShipPlacement[]): Ship[] {
  return placements.map((placement) => {
    const coordinates = generateShipCoordinates(
      placement.startCoordinate,
      placement.size,
      placement.orientation
    );

    return {
      id: placement.id,
      name: placement.name,
      size: placement.size,
      coordinates,
      hits: 0,
      isSunk: false,
    };
  });
}

/**
 * Check if a coordinate hits a ship
 */
export function checkHit(coordinate: Coordinate, ships: Ship[]): Ship | null {
  for (const ship of ships) {
    if (coordinateExists(coordinate, ship.coordinates)) {
      return ship;
    }
  }
  return null;
}

/**
 * Update ship after being hit
 */
export function updateShipAfterHit(ship: Ship): Ship {
  const updatedShip = { ...ship };
  updatedShip.hits += 1;

  if (updatedShip.hits >= updatedShip.size) {
    updatedShip.isSunk = true;
  }

  return updatedShip;
}

/**
 * Check if all ships are sunk
 */
export function allShipsSunk(ships: Ship[]): boolean {
  return ships.length > 0 && ships.every((ship) => ship.isSunk);
}

/**
 * Count remaining (not sunk) ships
 */
export function countRemainingShips(ships: Ship[]): number {
  return ships.filter((ship) => !ship.isSunk).length;
}

/**
 * Get sunk ships
 */
export function getSunkShips(ships: Ship[]): Ship[] {
  return ships.filter((ship) => ship.isSunk);
}

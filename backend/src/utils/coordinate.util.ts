// Coordinate validation and manipulation utilities

import { Coordinate } from '../types';
import { BOARD_SIZE } from '../models/game.constants';

/**
 * Check if a coordinate is within board boundaries
 */
export function isValidCoordinate(coord: Coordinate): boolean {
  return (
    coord.x >= 0 &&
    coord.x < BOARD_SIZE &&
    coord.y >= 0 &&
    coord.y < BOARD_SIZE
  );
}

/**
 * Check if two coordinates are equal
 */
export function coordinatesEqual(a: Coordinate, b: Coordinate): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Check if a coordinate exists in an array
 */
export function coordinateExists(
  coord: Coordinate,
  coordArray: Coordinate[]
): boolean {
  return coordArray.some((c) => coordinatesEqual(c, coord));
}

/**
 * Generate coordinates for a ship based on start position, size, and orientation
 */
export function generateShipCoordinates(
  start: Coordinate,
  size: number,
  orientation: 'horizontal' | 'vertical'
): Coordinate[] {
  const coordinates: Coordinate[] = [];

  for (let i = 0; i < size; i++) {
    if (orientation === 'horizontal') {
      coordinates.push({ x: start.x + i, y: start.y });
    } else {
      coordinates.push({ x: start.x, y: start.y + i });
    }
  }

  return coordinates;
}

/**
 * Check if all coordinates are within board boundaries
 */
export function allCoordinatesValid(coordinates: Coordinate[]): boolean {
  return coordinates.every(isValidCoordinate);
}

/**
 * Check if any coordinates overlap between two arrays
 */
export function coordinatesOverlap(
  coords1: Coordinate[],
  coords2: Coordinate[]
): boolean {
  return coords1.some((c1) => coords2.some((c2) => coordinatesEqual(c1, c2)));
}

/**
 * Get all adjacent coordinates (including diagonals)
 */
export function getAdjacentCoordinates(coord: Coordinate): Coordinate[] {
  const adjacent: Coordinate[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue; // Skip the center coordinate

      const newCoord = { x: coord.x + dx, y: coord.y + dy };
      if (isValidCoordinate(newCoord)) {
        adjacent.push(newCoord);
      }
    }
  }

  return adjacent;
}

/**
 * Get all coordinates adjacent to a ship (for spacing validation)
 */
export function getShipAdjacentCoordinates(shipCoords: Coordinate[]): Coordinate[] {
  const adjacentSet = new Set<string>();

  shipCoords.forEach((coord) => {
    getAdjacentCoordinates(coord).forEach((adj) => {
      // Don't include coordinates that are part of the ship itself
      if (!coordinateExists(adj, shipCoords)) {
        adjacentSet.add(`${adj.x},${adj.y}`);
      }
    });
  });

  return Array.from(adjacentSet).map((str) => {
    const [x, y] = str.split(',').map(Number);
    return { x, y };
  });
}

/**
 * Convert coordinate to string representation (for logging)
 */
export function coordinateToString(coord: Coordinate): string {
  const letter = String.fromCharCode(65 + coord.x); // A-J
  const number = coord.y + 1; // 1-10
  return `${letter}${number}`;
}

/**
 * Parse coordinate from string representation (e.g., "A1" -> {x: 0, y: 0})
 */
export function parseCoordinate(str: string): Coordinate | null {
  const match = str.match(/^([A-J])(\d{1,2})$/i);
  if (!match) return null;

  const x = match[1].toUpperCase().charCodeAt(0) - 65;
  const y = parseInt(match[2]) - 1;

  const coord = { x, y };
  return isValidCoordinate(coord) ? coord : null;
}

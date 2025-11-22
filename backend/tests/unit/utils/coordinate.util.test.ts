// Coordinate Utility Tests

import {
  isValidCoordinate,
  coordinatesEqual,
  coordinateExists,
  generateShipCoordinates,
  allCoordinatesValid,
  coordinatesOverlap,
  getAdjacentCoordinates,
  getShipAdjacentCoordinates,
  coordinateToString,
  parseCoordinate,
} from '../../../src/utils/coordinate.util';
import { Coordinate } from '../../../src/types';

describe('Coordinate Utils', () => {
  describe('isValidCoordinate', () => {
    it('should return true for valid coordinate', () => {
      expect(isValidCoordinate({ x: 0, y: 0 })).toBe(true);
      expect(isValidCoordinate({ x: 5, y: 5 })).toBe(true);
      expect(isValidCoordinate({ x: 9, y: 9 })).toBe(true);
    });

    it('should return false for negative coordinates', () => {
      expect(isValidCoordinate({ x: -1, y: 0 })).toBe(false);
      expect(isValidCoordinate({ x: 0, y: -1 })).toBe(false);
    });

    it('should return false for out of bounds coordinates', () => {
      expect(isValidCoordinate({ x: 10, y: 0 })).toBe(false);
      expect(isValidCoordinate({ x: 0, y: 10 })).toBe(false);
    });
  });

  describe('coordinatesEqual', () => {
    it('should return true for equal coordinates', () => {
      const a = { x: 5, y: 5 };
      const b = { x: 5, y: 5 };

      expect(coordinatesEqual(a, b)).toBe(true);
    });

    it('should return false for different coordinates', () => {
      const a = { x: 5, y: 5 };
      const b = { x: 6, y: 5 };

      expect(coordinatesEqual(a, b)).toBe(false);
    });
  });

  describe('coordinateExists', () => {
    const coords: Coordinate[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];

    it('should return true if coordinate exists in array', () => {
      expect(coordinateExists({ x: 1, y: 1 }, coords)).toBe(true);
    });

    it('should return false if coordinate does not exist', () => {
      expect(coordinateExists({ x: 5, y: 5 }, coords)).toBe(false);
    });
  });

  describe('generateShipCoordinates', () => {
    it('should generate horizontal ship coordinates', () => {
      const coords = generateShipCoordinates({ x: 0, y: 0 }, 3, 'horizontal');

      expect(coords).toHaveLength(3);
      expect(coords).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]);
    });

    it('should generate vertical ship coordinates', () => {
      const coords = generateShipCoordinates({ x: 0, y: 0 }, 3, 'vertical');

      expect(coords).toHaveLength(3);
      expect(coords).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ]);
    });

    it('should generate coordinates for size 1 ship', () => {
      const coords = generateShipCoordinates({ x: 5, y: 5 }, 1, 'horizontal');

      expect(coords).toHaveLength(1);
      expect(coords[0]).toEqual({ x: 5, y: 5 });
    });
  });

  describe('allCoordinatesValid', () => {
    it('should return true if all coordinates are valid', () => {
      const coords = [
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        { x: 9, y: 9 },
      ];

      expect(allCoordinatesValid(coords)).toBe(true);
    });

    it('should return false if any coordinate is invalid', () => {
      const coords = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];

      expect(allCoordinatesValid(coords)).toBe(false);
    });
  });

  describe('coordinatesOverlap', () => {
    it('should return true if coordinates overlap', () => {
      const coords1 = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
      const coords2 = [{ x: 1, y: 0 }, { x: 2, y: 0 }];

      expect(coordinatesOverlap(coords1, coords2)).toBe(true);
    });

    it('should return false if coordinates do not overlap', () => {
      const coords1 = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
      const coords2 = [{ x: 5, y: 5 }, { x: 6, y: 5 }];

      expect(coordinatesOverlap(coords1, coords2)).toBe(false);
    });
  });

  describe('getAdjacentCoordinates', () => {
    it('should return all 8 adjacent coordinates for center cell', () => {
      const adjacent = getAdjacentCoordinates({ x: 5, y: 5 });

      expect(adjacent).toHaveLength(8);
    });

    it('should return fewer adjacent coordinates for corner cell', () => {
      const adjacent = getAdjacentCoordinates({ x: 0, y: 0 });

      expect(adjacent).toHaveLength(3);
    });

    it('should return only valid coordinates', () => {
      const adjacent = getAdjacentCoordinates({ x: 0, y: 0 });

      adjacent.forEach(coord => {
        expect(isValidCoordinate(coord)).toBe(true);
      });
    });
  });

  describe('getShipAdjacentCoordinates', () => {
    it('should return coordinates adjacent to ship', () => {
      const shipCoords = [{ x: 5, y: 5 }, { x: 6, y: 5 }];
      const adjacent = getShipAdjacentCoordinates(shipCoords);

      expect(adjacent.length).toBeGreaterThan(0);
      adjacent.forEach(coord => {
        expect(coordinateExists(coord, shipCoords)).toBe(false);
      });
    });

    it('should not include ship coordinates themselves', () => {
      const shipCoords = [{ x: 5, y: 5 }];
      const adjacent = getShipAdjacentCoordinates(shipCoords);

      expect(coordinateExists({ x: 5, y: 5 }, adjacent)).toBe(false);
    });
  });

  describe('coordinateToString', () => {
    it('should convert coordinate to string format', () => {
      expect(coordinateToString({ x: 0, y: 0 })).toBe('A1');
      expect(coordinateToString({ x: 9, y: 9 })).toBe('J10');
      expect(coordinateToString({ x: 5, y: 7 })).toBe('F8');
    });
  });

  describe('parseCoordinate', () => {
    it('should parse valid coordinate string', () => {
      expect(parseCoordinate('A1')).toEqual({ x: 0, y: 0 });
      expect(parseCoordinate('J10')).toEqual({ x: 9, y: 9 });
      expect(parseCoordinate('F8')).toEqual({ x: 5, y: 7 });
    });

    it('should handle lowercase input', () => {
      expect(parseCoordinate('a1')).toEqual({ x: 0, y: 0 });
    });

    it('should return null for invalid format', () => {
      expect(parseCoordinate('invalid')).toBeNull();
      expect(parseCoordinate('A')).toBeNull();
      expect(parseCoordinate('1')).toBeNull();
    });

    it('should return null for out of bounds', () => {
      expect(parseCoordinate('A11')).toBeNull();
      expect(parseCoordinate('K1')).toBeNull();
    });
  });
});

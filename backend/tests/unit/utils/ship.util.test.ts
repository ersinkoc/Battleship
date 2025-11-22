// Ship Utility Tests

import {
  validateShipPlacement,
  validateAllShipPlacements,
  convertPlacementsToShips,
  checkHit,
  updateShipAfterHit,
  allShipsSunk,
  countRemainingShips,
  getSunkShips,
} from '../../../src/utils/ship.util';
import { Ship, ShipPlacement } from '../../../src/types';
import { SHIP_TYPES } from '../../../src/models/game.constants';

describe('Ship Utils', () => {
  describe('validateShipPlacement', () => {
    it('should validate a valid ship placement', () => {
      const placement: ShipPlacement = {
        id: 'carrier',
        name: 'Carrier',
        size: 5,
        startCoordinate: { x: 0, y: 0 },
        orientation: 'horizontal',
      };

      const result = validateShipPlacement(placement, []);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid ship type', () => {
      const placement: ShipPlacement = {
        id: 'invalid-ship',
        name: 'Invalid Ship',
        size: 5,
        startCoordinate: { x: 0, y: 0 },
        orientation: 'horizontal',
      };

      const result = validateShipPlacement(placement, []);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid ship type');
    });

    it('should reject ship with wrong size', () => {
      const placement: ShipPlacement = {
        id: 'carrier',
        name: 'Carrier',
        size: 3, // Should be 5
        startCoordinate: { x: 0, y: 0 },
        orientation: 'horizontal',
      };

      const result = validateShipPlacement(placement, []);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('should have size');
    });

    it('should reject ship going out of bounds horizontally', () => {
      const placement: ShipPlacement = {
        id: 'carrier',
        name: 'Carrier',
        size: 5,
        startCoordinate: { x: 7, y: 0 }, // Would go to x=11
        orientation: 'horizontal',
      };

      const result = validateShipPlacement(placement, []);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('out of bounds');
    });

    it('should reject ship going out of bounds vertically', () => {
      const placement: ShipPlacement = {
        id: 'carrier',
        name: 'Carrier',
        size: 5,
        startCoordinate: { x: 0, y: 7 }, // Would go to y=11
        orientation: 'vertical',
      };

      const result = validateShipPlacement(placement, []);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('out of bounds');
    });

    it('should reject overlapping ships', () => {
      const existingShips: Ship[] = [
        {
          id: 'battleship',
          name: 'Battleship',
          size: 4,
          coordinates: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 3, y: 0 },
          ],
          hits: 0,
          isSunk: false,
        },
      ];

      const placement: ShipPlacement = {
        id: 'carrier',
        name: 'Carrier',
        size: 5,
        startCoordinate: { x: 2, y: 0 }, // Overlaps at x=2,3
        orientation: 'horizontal',
      };

      const result = validateShipPlacement(placement, existingShips);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('overlaps');
    });

    it('should accept non-overlapping adjacent ships', () => {
      const existingShips: Ship[] = [
        {
          id: 'battleship',
          name: 'Battleship',
          size: 4,
          coordinates: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
            { x: 3, y: 0 },
          ],
          hits: 0,
          isSunk: false,
        },
      ];

      const placement: ShipPlacement = {
        id: 'carrier',
        name: 'Carrier',
        size: 5,
        startCoordinate: { x: 0, y: 1 }, // Adjacent but not overlapping
        orientation: 'horizontal',
      };

      const result = validateShipPlacement(placement, existingShips);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateAllShipPlacements', () => {
    const validPlacements: ShipPlacement[] = [
      {
        id: 'carrier',
        name: 'Carrier',
        size: 5,
        startCoordinate: { x: 0, y: 0 },
        orientation: 'horizontal',
      },
      {
        id: 'battleship',
        name: 'Battleship',
        size: 4,
        startCoordinate: { x: 0, y: 1 },
        orientation: 'horizontal',
      },
      {
        id: 'cruiser',
        name: 'Cruiser',
        size: 3,
        startCoordinate: { x: 0, y: 2 },
        orientation: 'horizontal',
      },
      {
        id: 'submarine',
        name: 'Submarine',
        size: 3,
        startCoordinate: { x: 0, y: 3 },
        orientation: 'horizontal',
      },
      {
        id: 'destroyer',
        name: 'Destroyer',
        size: 2,
        startCoordinate: { x: 0, y: 4 },
        orientation: 'horizontal',
      },
    ];

    it('should validate all valid ship placements', () => {
      const result = validateAllShipPlacements(validPlacements);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject wrong number of ships', () => {
      const result = validateAllShipPlacements(validPlacements.slice(0, 3));

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expected 5 ships');
    });

    it('should reject missing required ships', () => {
      const invalidPlacements: ShipPlacement[] = [
        ...validPlacements.slice(0, 4),
        {
          id: 'carrier', // Duplicate
          name: 'Carrier',
          size: 5,
          startCoordinate: { x: 0, y: 5 },
          orientation: 'horizontal' as const,
        },
      ];

      const result = validateAllShipPlacements(invalidPlacements);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing or duplicate ships');
    });

    it('should reject if any ship placement is invalid', () => {
      const invalidPlacements: ShipPlacement[] = [
        ...validPlacements.slice(0, 4),
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          startCoordinate: { x: 9, y: 0 }, // Goes out of bounds
          orientation: 'horizontal' as const,
        },
      ];

      const result = validateAllShipPlacements(invalidPlacements);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('out of bounds');
    });

    it('should reject if ships overlap', () => {
      const overlappingPlacements: ShipPlacement[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          startCoordinate: { x: 0, y: 0 },
          orientation: 'horizontal' as const,
        },
        {
          id: 'battleship',
          name: 'Battleship',
          size: 4,
          startCoordinate: { x: 2, y: 0 }, // Overlaps with carrier
          orientation: 'horizontal' as const,
        },
        {
          id: 'cruiser',
          name: 'Cruiser',
          size: 3,
          startCoordinate: { x: 0, y: 2 },
          orientation: 'horizontal' as const,
        },
        {
          id: 'submarine',
          name: 'Submarine',
          size: 3,
          startCoordinate: { x: 0, y: 3 },
          orientation: 'horizontal' as const,
        },
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          startCoordinate: { x: 0, y: 4 },
          orientation: 'horizontal' as const,
        },
      ];

      const result = validateAllShipPlacements(overlappingPlacements);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('overlaps');
    });
  });

  describe('convertPlacementsToShips', () => {
    it('should convert ship placements to ships', () => {
      const placements: ShipPlacement[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          startCoordinate: { x: 0, y: 0 },
          orientation: 'horizontal',
        },
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          startCoordinate: { x: 0, y: 1 },
          orientation: 'vertical',
        },
      ];

      const ships = convertPlacementsToShips(placements);

      expect(ships).toHaveLength(2);
      expect(ships[0].id).toBe('carrier');
      expect(ships[0].coordinates).toHaveLength(5);
      expect(ships[0].hits).toBe(0);
      expect(ships[0].isSunk).toBe(false);

      expect(ships[1].id).toBe('destroyer');
      expect(ships[1].coordinates).toHaveLength(2);
    });

    it('should generate correct coordinates for horizontal ship', () => {
      const placements: ShipPlacement[] = [
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          startCoordinate: { x: 5, y: 3 },
          orientation: 'horizontal',
        },
      ];

      const ships = convertPlacementsToShips(placements);

      expect(ships[0].coordinates).toEqual([
        { x: 5, y: 3 },
        { x: 6, y: 3 },
      ]);
    });

    it('should generate correct coordinates for vertical ship', () => {
      const placements: ShipPlacement[] = [
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          startCoordinate: { x: 5, y: 3 },
          orientation: 'vertical',
        },
      ];

      const ships = convertPlacementsToShips(placements);

      expect(ships[0].coordinates).toEqual([
        { x: 5, y: 3 },
        { x: 5, y: 4 },
      ]);
    });

    it('should handle empty placements array', () => {
      const ships = convertPlacementsToShips([]);

      expect(ships).toEqual([]);
    });
  });

  describe('checkHit', () => {
    const ships: Ship[] = [
      {
        id: 'carrier',
        name: 'Carrier',
        size: 5,
        coordinates: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 },
          { x: 3, y: 0 },
          { x: 4, y: 0 },
        ],
        hits: 0,
        isSunk: false,
      },
      {
        id: 'destroyer',
        name: 'Destroyer',
        size: 2,
        coordinates: [
          { x: 5, y: 5 },
          { x: 5, y: 6 },
        ],
        hits: 0,
        isSunk: false,
      },
    ];

    it('should return ship when coordinate hits', () => {
      const hit = checkHit({ x: 2, y: 0 }, ships);

      expect(hit).toBeDefined();
      expect(hit?.id).toBe('carrier');
    });

    it('should return correct ship for multiple ships', () => {
      const hit = checkHit({ x: 5, y: 6 }, ships);

      expect(hit).toBeDefined();
      expect(hit?.id).toBe('destroyer');
    });

    it('should return null when coordinate misses', () => {
      const hit = checkHit({ x: 9, y: 9 }, ships);

      expect(hit).toBeNull();
    });

    it('should return null for empty ships array', () => {
      const hit = checkHit({ x: 0, y: 0 }, []);

      expect(hit).toBeNull();
    });
  });

  describe('updateShipAfterHit', () => {
    it('should increment hit count', () => {
      const ship: Ship = {
        id: 'destroyer',
        name: 'Destroyer',
        size: 2,
        coordinates: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        hits: 0,
        isSunk: false,
      };

      const updated = updateShipAfterHit(ship);

      expect(updated.hits).toBe(1);
      expect(updated.isSunk).toBe(false);
    });

    it('should mark ship as sunk when hits equal size', () => {
      const ship: Ship = {
        id: 'destroyer',
        name: 'Destroyer',
        size: 2,
        coordinates: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        hits: 1,
        isSunk: false,
      };

      const updated = updateShipAfterHit(ship);

      expect(updated.hits).toBe(2);
      expect(updated.isSunk).toBe(true);
    });

    it('should mark ship as sunk when hits exceed size', () => {
      const ship: Ship = {
        id: 'destroyer',
        name: 'Destroyer',
        size: 2,
        coordinates: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        hits: 2,
        isSunk: false,
      };

      const updated = updateShipAfterHit(ship);

      expect(updated.hits).toBe(3);
      expect(updated.isSunk).toBe(true);
    });

    it('should not mutate original ship', () => {
      const ship: Ship = {
        id: 'destroyer',
        name: 'Destroyer',
        size: 2,
        coordinates: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        hits: 0,
        isSunk: false,
      };

      const updated = updateShipAfterHit(ship);

      expect(ship.hits).toBe(0);
      expect(ship.isSunk).toBe(false);
      expect(updated.hits).toBe(1);
    });
  });

  describe('allShipsSunk', () => {
    it('should return true when all ships are sunk', () => {
      const ships: Ship[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          coordinates: [],
          hits: 5,
          isSunk: true,
        },
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          coordinates: [],
          hits: 2,
          isSunk: true,
        },
      ];

      expect(allShipsSunk(ships)).toBe(true);
    });

    it('should return false when some ships are not sunk', () => {
      const ships: Ship[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          coordinates: [],
          hits: 5,
          isSunk: true,
        },
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          coordinates: [],
          hits: 1,
          isSunk: false,
        },
      ];

      expect(allShipsSunk(ships)).toBe(false);
    });

    it('should return false when no ships are sunk', () => {
      const ships: Ship[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          coordinates: [],
          hits: 0,
          isSunk: false,
        },
      ];

      expect(allShipsSunk(ships)).toBe(false);
    });

    it('should return false for empty ships array', () => {
      expect(allShipsSunk([])).toBe(false);
    });
  });

  describe('countRemainingShips', () => {
    it('should count ships that are not sunk', () => {
      const ships: Ship[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          coordinates: [],
          hits: 5,
          isSunk: true,
        },
        {
          id: 'battleship',
          name: 'Battleship',
          size: 4,
          coordinates: [],
          hits: 0,
          isSunk: false,
        },
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          coordinates: [],
          hits: 1,
          isSunk: false,
        },
      ];

      expect(countRemainingShips(ships)).toBe(2);
    });

    it('should return 0 when all ships are sunk', () => {
      const ships: Ship[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          coordinates: [],
          hits: 5,
          isSunk: true,
        },
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          coordinates: [],
          hits: 2,
          isSunk: true,
        },
      ];

      expect(countRemainingShips(ships)).toBe(0);
    });

    it('should return total count when no ships are sunk', () => {
      const ships: Ship[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          coordinates: [],
          hits: 0,
          isSunk: false,
        },
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          coordinates: [],
          hits: 0,
          isSunk: false,
        },
      ];

      expect(countRemainingShips(ships)).toBe(2);
    });

    it('should return 0 for empty ships array', () => {
      expect(countRemainingShips([])).toBe(0);
    });
  });

  describe('getSunkShips', () => {
    it('should return only sunk ships', () => {
      const ships: Ship[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          coordinates: [],
          hits: 5,
          isSunk: true,
        },
        {
          id: 'battleship',
          name: 'Battleship',
          size: 4,
          coordinates: [],
          hits: 0,
          isSunk: false,
        },
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          coordinates: [],
          hits: 2,
          isSunk: true,
        },
      ];

      const sunkShips = getSunkShips(ships);

      expect(sunkShips).toHaveLength(2);
      expect(sunkShips[0].id).toBe('carrier');
      expect(sunkShips[1].id).toBe('destroyer');
    });

    it('should return empty array when no ships are sunk', () => {
      const ships: Ship[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          coordinates: [],
          hits: 0,
          isSunk: false,
        },
      ];

      const sunkShips = getSunkShips(ships);

      expect(sunkShips).toEqual([]);
    });

    it('should return all ships when all are sunk', () => {
      const ships: Ship[] = [
        {
          id: 'carrier',
          name: 'Carrier',
          size: 5,
          coordinates: [],
          hits: 5,
          isSunk: true,
        },
        {
          id: 'destroyer',
          name: 'Destroyer',
          size: 2,
          coordinates: [],
          hits: 2,
          isSunk: true,
        },
      ];

      const sunkShips = getSunkShips(ships);

      expect(sunkShips).toHaveLength(2);
    });

    it('should return empty array for empty ships array', () => {
      const sunkShips = getSunkShips([]);

      expect(sunkShips).toEqual([]);
    });
  });
});

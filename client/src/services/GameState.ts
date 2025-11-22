// Client-side game state manager

import { User, Ship, ShipPlacement, Coordinate, SHIP_TYPES, BOARD_SIZE } from '../types';

export class GameState {
  // User data
  public user: User | null = null;
  public token: string | null = null;

  // Room data
  public roomCode: string | null = null;
  public opponentEmail: string | null = null;

  // Game state
  public isMyTurn: boolean = false;
  public myShips: ShipPlacement[] = [];
  public placedShips: Ship[] = [];
  public myHits: Coordinate[] = [];
  public myMisses: Coordinate[] = [];
  public opponentHits: Coordinate[] = [];
  public opponentMisses: Coordinate[] = [];
  public sunkShips: Ship[] = [];

  // Ship placement state
  public currentShipIndex: number = 0;
  public currentOrientation: 'horizontal' | 'vertical' = 'horizontal';
  public allShipsPlaced: boolean = false;

  constructor() {
    // Try to load token from localStorage
    const savedToken = localStorage.getItem('battleship_token');
    if (savedToken) {
      this.token = savedToken;
    }
  }

  /**
   * Set user data
   */
  public setUser(user: User, token: string): void {
    this.user = user;
    this.token = token;
    localStorage.setItem('battleship_token', token);
  }

  /**
   * Clear user data
   */
  public clearUser(): void {
    this.user = null;
    this.token = null;
    localStorage.removeItem('battleship_token');
  }

  /**
   * Set room code
   */
  public setRoomCode(code: string): void {
    this.roomCode = code;
  }

  /**
   * Clear room data
   */
  public clearRoom(): void {
    this.roomCode = null;
    this.opponentEmail = null;
    this.isMyTurn = false;
    this.myShips = [];
    this.placedShips = [];
    this.myHits = [];
    this.myMisses = [];
    this.opponentHits = [];
    this.opponentMisses = [];
    this.sunkShips = [];
    this.currentShipIndex = 0;
    this.currentOrientation = 'horizontal';
    this.allShipsPlaced = false;
  }

  /**
   * Get current ship to place
   */
  public getCurrentShip(): typeof SHIP_TYPES[keyof typeof SHIP_TYPES] | null {
    const ships = Object.values(SHIP_TYPES);
    if (this.currentShipIndex >= ships.length) return null;
    return ships[this.currentShipIndex];
  }

  /**
   * Toggle ship orientation
   */
  public toggleOrientation(): void {
    this.currentOrientation =
      this.currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
  }

  /**
   * Add a ship placement
   */
  public addShipPlacement(placement: ShipPlacement): void {
    this.myShips.push(placement);
    this.currentShipIndex++;

    if (this.currentShipIndex >= Object.values(SHIP_TYPES).length) {
      this.allShipsPlaced = true;
    }
  }

  /**
   * Check if can place ship at coordinate
   */
  public canPlaceShip(startCoord: Coordinate, shipSize: number, orientation: 'horizontal' | 'vertical'): boolean {
    // Generate coordinates for the ship
    const coordinates: Coordinate[] = [];
    for (let i = 0; i < shipSize; i++) {
      if (orientation === 'horizontal') {
        coordinates.push({ x: startCoord.x + i, y: startCoord.y });
      } else {
        coordinates.push({ x: startCoord.x, y: startCoord.y + i });
      }
    }

    // Check if all coordinates are within bounds
    const allInBounds = coordinates.every(
      (coord) => coord.x >= 0 && coord.x < BOARD_SIZE && coord.y >= 0 && coord.y < BOARD_SIZE
    );

    if (!allInBounds) return false;

    // Check if any coordinate overlaps with existing ships
    for (const existingShip of this.myShips) {
      const existingCoords = this.getShipCoordinates(existingShip);
      for (const newCoord of coordinates) {
        for (const existingCoord of existingCoords) {
          if (newCoord.x === existingCoord.x && newCoord.y === existingCoord.y) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Get coordinates for a ship placement
   */
  private getShipCoordinates(placement: ShipPlacement): Coordinate[] {
    const coordinates: Coordinate[] = [];
    for (let i = 0; i < placement.size; i++) {
      if (placement.orientation === 'horizontal') {
        coordinates.push({
          x: placement.startCoordinate.x + i,
          y: placement.startCoordinate.y,
        });
      } else {
        coordinates.push({
          x: placement.startCoordinate.x,
          y: placement.startCoordinate.y + i,
        });
      }
    }
    return coordinates;
  }

  /**
   * Check if coordinate has been attacked
   */
  public hasBeenAttacked(coord: Coordinate): boolean {
    return (
      this.myHits.some((c) => c.x === coord.x && c.y === coord.y) ||
      this.myMisses.some((c) => c.x === coord.x && c.y === coord.y)
    );
  }

  /**
   * Add hit marker
   */
  public addHit(coord: Coordinate): void {
    if (!this.myHits.some((c) => c.x === coord.x && c.y === coord.y)) {
      this.myHits.push(coord);
    }
  }

  /**
   * Add miss marker
   */
  public addMiss(coord: Coordinate): void {
    if (!this.myMisses.some((c) => c.x === coord.x && c.y === coord.y)) {
      this.myMisses.push(coord);
    }
  }

  /**
   * Add opponent hit
   */
  public addOpponentHit(coord: Coordinate): void {
    if (!this.opponentHits.some((c) => c.x === coord.x && c.y === coord.y)) {
      this.opponentHits.push(coord);
    }
  }

  /**
   * Add opponent miss
   */
  public addOpponentMiss(coord: Coordinate): void {
    if (!this.opponentMisses.some((c) => c.x === coord.x && c.y === coord.y)) {
      this.opponentMisses.push(coord);
    }
  }

  /**
   * Get user ID
   */
  public getUserId(): string | null {
    return this.user?.id || null;
  }

  /**
   * Check if authenticated
   */
  public isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Reset ship placement
   */
  public resetShipPlacement(): void {
    this.myShips = [];
    this.currentShipIndex = 0;
    this.currentOrientation = 'horizontal';
    this.allShipsPlaced = false;
  }
}

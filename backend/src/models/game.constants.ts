// Game constants and ship definitions for Battleship

/**
 * Board dimensions (classic 10x10 grid)
 */
export const BOARD_SIZE = 10;

/**
 * Ship definitions for classic Battleship
 */
export const SHIP_TYPES = {
  CARRIER: {
    name: 'Carrier',
    size: 5,
    id: 'carrier',
  },
  BATTLESHIP: {
    name: 'Battleship',
    size: 4,
    id: 'battleship',
  },
  CRUISER: {
    name: 'Cruiser',
    size: 3,
    id: 'cruiser',
  },
  SUBMARINE: {
    name: 'Submarine',
    size: 3,
    id: 'submarine',
  },
  DESTROYER: {
    name: 'Destroyer',
    size: 2,
    id: 'destroyer',
  },
} as const;

/**
 * Array of all ships required for the game
 */
export const REQUIRED_SHIPS = Object.values(SHIP_TYPES);

/**
 * Total number of ships per player
 */
export const TOTAL_SHIPS = REQUIRED_SHIPS.length;

/**
 * Ship orientations
 */
export enum ShipOrientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

/**
 * Game status enum
 */
export enum GameStatus {
  WAITING = 'waiting',      // Waiting for second player
  SETUP = 'setup',          // Players placing ships
  PLAYING = 'playing',      // Active gameplay
  FINISHED = 'finished',    // Game completed
  ABANDONED = 'abandoned',  // Player left during game
}

/**
 * Cell status on the board
 */
export enum CellStatus {
  EMPTY = 'empty',          // No ship, not attacked
  SHIP = 'ship',            // Ship present, not attacked
  MISS = 'miss',            // Attacked, no ship
  HIT = 'hit',              // Attacked, ship present
  SUNK = 'sunk',            // Ship completely destroyed
}

/**
 * Game phase enum
 */
export enum GamePhase {
  WAITING_FOR_PLAYERS = 'waiting_for_players',
  SHIP_PLACEMENT = 'ship_placement',
  BATTLE = 'battle',
  GAME_OVER = 'game_over',
}

/**
 * Maximum time for ship placement (5 minutes)
 */
export const SHIP_PLACEMENT_TIMEOUT = 5 * 60 * 1000;

/**
 * Maximum time for a turn (30 seconds)
 */
export const TURN_TIMEOUT = 30 * 1000;

/**
 * Game configuration
 */
export const GAME_CONFIG = {
  boardSize: BOARD_SIZE,
  requiredShips: REQUIRED_SHIPS,
  totalShips: TOTAL_SHIPS,
  shipPlacementTimeout: SHIP_PLACEMENT_TIMEOUT,
  turnTimeout: TURN_TIMEOUT,
} as const;

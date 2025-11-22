// Type definitions for Voxel Battleship client

// API Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

export interface User {
  id: string;
  email: string;
  stats: UserStats;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalShots: number;
  totalHits: number;
}

// Game Types
export interface Coordinate {
  x: number;
  y: number;
  z?: number;
}

export interface Ship {
  id: string;
  name: string;
  size: number;
  coordinates: Coordinate[];
  hits: number;
  isSunk: boolean;
}

export interface ShipPlacement {
  id: string;
  name: string;
  size: number;
  startCoordinate: Coordinate;
  orientation: 'horizontal' | 'vertical';
}

export interface ShotResult {
  coordinate: Coordinate;
  result: 'hit' | 'miss' | 'sunk';
  shipName?: string;
  shipId?: string;
  attacker: string;
  defender: string;
}

export interface GameOverData {
  winnerId: string;
  winnerEmail: string;
  loserId: string;
  reason: 'all_ships_sunk' | 'opponent_left' | 'timeout';
  stats: {
    [playerId: string]: {
      shots: number;
      hits: number;
      misses: number;
      shipsRemaining: number;
    };
  };
}

export interface GameStateUpdate {
  roomCode: string;
  status: 'waiting' | 'setup' | 'playing' | 'finished';
  currentTurn?: string;
  players: {
    player1: { id: string; email: string; ready: boolean };
    player2?: { id: string; email: string; ready: boolean };
  };
  yourBoard?: {
    ships: Ship[];
    opponentHits: Coordinate[];
    opponentMisses: Coordinate[];
  };
  opponentBoard?: {
    yourHits: Coordinate[];
    yourMisses: Coordinate[];
    sunkShips: Ship[];
  };
}

// Socket.io Events
export interface ServerToClientEvents {
  error: (message: string) => void;
  roomCreated: (roomCode: string) => void;
  playerJoined: (data: { playerId: string; email: string }) => void;
  gameStarted: (data: { message: string }) => void;
  opponentLeft: (data: { message: string }) => void;
  shipsPlaced: (data: { playerId: string; ready: boolean }) => void;
  bothPlayersReady: (data: { firstPlayer: string; message: string }) => void;
  shotResult: (data: ShotResult) => void;
  turnChanged: (data: { currentPlayer: string; isYourTurn: boolean }) => void;
  shipSunk: (data: { shipName: string; playerId: string }) => void;
  gameOver: (data: GameOverData) => void;
  gameState: (data: GameStateUpdate) => void;
}

export interface ClientToServerEvents {
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;
  placeShips: (ships: ShipPlacement[]) => void;
  fireShot: (coordinate: Coordinate) => void;
  requestGameState: () => void;
}

// UI State
export enum GamePhase {
  LOGIN = 'login',
  LOBBY = 'lobby',
  WAITING = 'waiting',
  SHIP_PLACEMENT = 'ship_placement',
  BATTLE = 'battle',
  GAME_OVER = 'game_over',
}

export interface AppState {
  phase: GamePhase;
  user: User | null;
  token: string | null;
  roomCode: string | null;
  gameState: GameStateUpdate | null;
  isMyTurn: boolean;
  errorMessage: string | null;
}

// Ship definitions
export const SHIP_TYPES = {
  CARRIER: { id: 'carrier', name: 'Carrier', size: 5, color: 0x4a90e2 },
  BATTLESHIP: { id: 'battleship', name: 'Battleship', size: 4, color: 0xe74c3c },
  CRUISER: { id: 'cruiser', name: 'Cruiser', size: 3, color: 0xf39c12 },
  SUBMARINE: { id: 'submarine', name: 'Submarine', size: 3, color: 0x9b59b6 },
  DESTROYER: { id: 'destroyer', name: 'Destroyer', size: 2, color: 0x2ecc71 },
} as const;

export const BOARD_SIZE = 10;

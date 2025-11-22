// Type definitions for Voxel Battleship backend

import { Request } from 'express';
import { User } from '@prisma/client';

// Extend Express Request to include authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// JWT Payload structure
export interface JWTPayload {
  userId: string;
  email: string;
}

// Auth DTOs (Data Transfer Objects)
export interface RegisterDTO {
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    stats: {
      gamesPlayed: number;
      gamesWon: number;
      gamesLost: number;
      totalShots: number;
      totalHits: number;
    };
  };
}

// Socket.io types
export interface SocketUser {
  id: string;
  email: string;
}

export interface ServerToClientEvents {
  // General events
  error: (message: string) => void;

  // Room events
  roomCreated: (roomCode: string) => void;
  playerJoined: (data: { playerId: string; email: string }) => void;
  gameStarted: (data: { message: string }) => void;
  opponentLeft: (data: { message: string }) => void;

  // Game setup events
  shipsPlaced: (data: { playerId: string; ready: boolean }) => void;
  bothPlayersReady: (data: { firstPlayer: string; message: string }) => void;

  // Gameplay events
  shotResult: (data: ShotResult) => void;
  turnChanged: (data: { currentPlayer: string; isYourTurn: boolean }) => void;
  shipSunk: (data: { shipName: string; playerId: string }) => void;
  gameOver: (data: GameOverData) => void;

  // State sync
  gameState: (data: GameStateUpdate) => void;
}

export interface ClientToServerEvents {
  // Room management
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;

  // Game setup
  placeShips: (ships: ShipPlacement[]) => void;

  // Gameplay
  fireShot: (coordinate: Coordinate) => void;

  // State requests
  requestGameState: () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  user: SocketUser;
  roomCode?: string;
}

// Redis Game State types
export interface PlayerBoard {
  ships: Ship[];
  hits: Coordinate[];
  misses: Coordinate[];
}

export interface Ship {
  id: string;
  name: string;
  size: number;
  coordinates: Coordinate[];
  hits: number;
  isSunk: boolean;
}

export interface Coordinate {
  x: number;
  y: number;
  z?: number; // For 3D voxel representation
}

// Ship placement request
export interface ShipPlacement {
  id: string;
  name: string;
  size: number;
  startCoordinate: Coordinate;
  orientation: 'horizontal' | 'vertical';
}

// Shot result response
export interface ShotResult {
  coordinate: Coordinate;
  result: 'hit' | 'miss' | 'sunk';
  shipName?: string;
  shipId?: string;
  attacker: string;
  defender: string;
}

// Game over data
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

// Game state update for sync
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

export interface GameRoom {
  roomCode: string;
  player1Id: string;
  player2Id?: string;
  status: 'waiting' | 'setup' | 'playing' | 'finished';
  currentTurn?: string; // userId of current player
  boards: {
    [playerId: string]: PlayerBoard;
  };
  playersReady: {
    [playerId: string]: boolean;
  };
  gameStats: {
    [playerId: string]: {
      shots: number;
      hits: number;
      misses: number;
    };
  };
  createdAt: number;
  startedAt?: number;
  matchId?: string; // Reference to Prisma Match record
  winnerId?: string;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// User without sensitive data
export type SafeUser = Omit<User, 'passwordHash'>;

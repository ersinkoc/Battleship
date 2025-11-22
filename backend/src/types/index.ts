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
  error: (message: string) => void;
  roomCreated: (roomCode: string) => void;
  playerJoined: (data: { playerId: string; email: string }) => void;
  gameStarted: (data: { message: string }) => void;
  opponentLeft: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  leaveRoom: () => void;
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

export interface GameRoom {
  roomCode: string;
  player1Id: string;
  player2Id?: string;
  status: 'waiting' | 'setup' | 'playing' | 'finished';
  currentTurn?: string; // userId of current player
  boards: {
    [playerId: string]: PlayerBoard;
  };
  createdAt: number;
  matchId?: string; // Reference to Prisma Match record
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

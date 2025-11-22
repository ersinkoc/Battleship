// Socket.io client service

import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ShipPlacement,
  Coordinate,
} from '../types';

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private token: string | null = null;

  /**
   * Connect to server with authentication token
   */
  public connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.token = token;

      this.socket = io('http://localhost:4000', {
        auth: {
          token: token,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to server');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        reject(error);
      });

      this.socket.on('error', (message) => {
        console.error('Socket error:', message);
      });
    });
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Room Events

  /**
   * Create a new game room
   */
  public createRoom(): void {
    this.socket?.emit('createRoom');
  }

  /**
   * Join an existing room
   */
  public joinRoom(roomCode: string): void {
    this.socket?.emit('joinRoom', roomCode);
  }

  /**
   * Leave current room
   */
  public leaveRoom(): void {
    this.socket?.emit('leaveRoom');
  }

  // Game Events

  /**
   * Place ships on the board
   */
  public placeShips(ships: ShipPlacement[]): void {
    this.socket?.emit('placeShips', ships);
  }

  /**
   * Fire a shot at coordinate
   */
  public fireShot(coordinate: Coordinate): void {
    this.socket?.emit('fireShot', coordinate);
  }

  /**
   * Request current game state
   */
  public requestGameState(): void {
    this.socket?.emit('requestGameState');
  }

  // Event Listeners

  /**
   * Listen for room created event
   */
  public onRoomCreated(callback: (roomCode: string) => void): void {
    this.socket?.on('roomCreated', callback);
  }

  /**
   * Listen for player joined event
   */
  public onPlayerJoined(callback: (data: { playerId: string; email: string }) => void): void {
    this.socket?.on('playerJoined', callback);
  }

  /**
   * Listen for game started event
   */
  public onGameStarted(callback: (data: { message: string }) => void): void {
    this.socket?.on('gameStarted', callback);
  }

  /**
   * Listen for opponent left event
   */
  public onOpponentLeft(callback: (data: { message: string }) => void): void {
    this.socket?.on('opponentLeft', callback);
  }

  /**
   * Listen for ships placed event
   */
  public onShipsPlaced(callback: (data: { playerId: string; ready: boolean }) => void): void {
    this.socket?.on('shipsPlaced', callback);
  }

  /**
   * Listen for both players ready event
   */
  public onBothPlayersReady(
    callback: (data: { firstPlayer: string; message: string }) => void
  ): void {
    this.socket?.on('bothPlayersReady', callback);
  }

  /**
   * Listen for shot result event
   */
  public onShotResult(
    callback: (data: {
      coordinate: Coordinate;
      result: 'hit' | 'miss' | 'sunk';
      shipName?: string;
      shipId?: string;
      attacker: string;
      defender: string;
    }) => void
  ): void {
    this.socket?.on('shotResult', callback);
  }

  /**
   * Listen for turn changed event
   */
  public onTurnChanged(
    callback: (data: { currentPlayer: string; isYourTurn: boolean }) => void
  ): void {
    this.socket?.on('turnChanged', callback);
  }

  /**
   * Listen for ship sunk event
   */
  public onShipSunk(callback: (data: { shipName: string; playerId: string }) => void): void {
    this.socket?.on('shipSunk', callback);
  }

  /**
   * Listen for game over event
   */
  public onGameOver(
    callback: (data: {
      winnerId: string;
      winnerEmail: string;
      loserId: string;
      reason: string;
      stats: any;
    }) => void
  ): void {
    this.socket?.on('gameOver', callback);
  }

  /**
   * Listen for game state event
   */
  public onGameState(callback: (data: any) => void): void {
    this.socket?.on('gameState', callback);
  }

  /**
   * Listen for error event
   */
  public onError(callback: (message: string) => void): void {
    this.socket?.on('error', callback);
  }

  /**
   * Remove all event listeners
   */
  public removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  /**
   * Remove specific event listener
   */
  public off(event: keyof ServerToClientEvents, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();

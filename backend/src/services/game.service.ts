// Game state management service

import { GameRoom, PlayerBoard, Ship, ShipPlacement, Coordinate, ShotResult } from '../types';
import { redisService } from './redis.service';
import {
  validateAllShipPlacements,
  convertPlacementsToShips,
  checkHit,
  updateShipAfterHit,
  allShipsSunk,
  countRemainingShips,
} from '../utils/ship.util';
import { coordinateExists } from '../utils/coordinate.util';

class GameService {
  /**
   * Initialize a new game room with default values
   */
  initializeGameRoom(roomCode: string, player1Id: string): GameRoom {
    return {
      roomCode,
      player1Id,
      status: 'waiting',
      boards: {},
      playersReady: {},
      gameStats: {},
      createdAt: Date.now(),
    };
  }

  /**
   * Add player 2 to the game room
   */
  async addPlayer2(roomCode: string, player2Id: string): Promise<GameRoom | null> {
    const room = await redisService.getGameRoom(roomCode);
    if (!room) return null;

    room.player2Id = player2Id;
    room.status = 'setup';

    await redisService.updateGameRoom(roomCode, room);
    return room;
  }

  /**
   * Place ships for a player
   */
  async placeShips(
    roomCode: string,
    playerId: string,
    placements: ShipPlacement[]
  ): Promise<{ success: boolean; error?: string }> {
    // Validate placements
    const validation = validateAllShipPlacements(placements);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Get room
    const room = await redisService.getGameRoom(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Check if player is in the room
    if (room.player1Id !== playerId && room.player2Id !== playerId) {
      return { success: false, error: 'You are not in this room' };
    }

    // Check if already placed ships
    if (room.playersReady[playerId]) {
      return { success: false, error: 'Ships already placed' };
    }

    // Convert placements to ships
    const ships = convertPlacementsToShips(placements);

    // Initialize player board
    room.boards[playerId] = {
      ships,
      hits: [],
      misses: [],
    };

    // Mark player as ready
    room.playersReady[playerId] = true;

    // Initialize game stats
    room.gameStats[playerId] = {
      shots: 0,
      hits: 0,
      misses: 0,
    };

    // Check if both players are ready
    if (room.player2Id && room.playersReady[room.player1Id] && room.playersReady[room.player2Id]) {
      room.status = 'playing';
      room.startedAt = Date.now();
      // Randomly choose who goes first
      room.currentTurn = Math.random() < 0.5 ? room.player1Id : room.player2Id;
    }

    await redisService.updateGameRoom(roomCode, room);
    return { success: true };
  }

  /**
   * Process a shot
   */
  async fireShot(
    roomCode: string,
    shooterId: string,
    coordinate: Coordinate
  ): Promise<{ success: boolean; result?: ShotResult; error?: string }> {
    const room = await redisService.getGameRoom(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Check if game is in playing state
    if (room.status !== 'playing') {
      return { success: false, error: 'Game is not in playing state' };
    }

    // Check if it's the shooter's turn
    if (room.currentTurn !== shooterId) {
      return { success: false, error: 'Not your turn' };
    }

    // Determine defender
    const defenderId = room.player1Id === shooterId ? room.player2Id! : room.player1Id;
    const defenderBoard = room.boards[defenderId];

    if (!defenderBoard) {
      return { success: false, error: 'Defender board not found' };
    }

    // Check if coordinate already shot
    if (
      coordinateExists(coordinate, defenderBoard.hits) ||
      coordinateExists(coordinate, defenderBoard.misses)
    ) {
      return { success: false, error: 'Coordinate already attacked' };
    }

    // Check if shot hits a ship
    const hitShip = checkHit(coordinate, defenderBoard.ships);

    let result: ShotResult;

    if (hitShip) {
      // Hit!
      defenderBoard.hits.push(coordinate);
      room.gameStats[shooterId].hits += 1;

      // Update ship
      const shipIndex = defenderBoard.ships.findIndex((s) => s.id === hitShip.id);
      defenderBoard.ships[shipIndex] = updateShipAfterHit(hitShip);
      const updatedShip = defenderBoard.ships[shipIndex];

      result = {
        coordinate,
        result: updatedShip.isSunk ? 'sunk' : 'hit',
        shipName: updatedShip.name,
        shipId: updatedShip.id,
        attacker: shooterId,
        defender: defenderId,
      };

      // Check if all ships are sunk (game over)
      if (allShipsSunk(defenderBoard.ships)) {
        room.status = 'finished';
        room.winnerId = shooterId;
      }
    } else {
      // Miss
      defenderBoard.misses.push(coordinate);
      room.gameStats[shooterId].misses += 1;

      result = {
        coordinate,
        result: 'miss',
        attacker: shooterId,
        defender: defenderId,
      };
    }

    // Increment shot count
    room.gameStats[shooterId].shots += 1;

    // Switch turns
    room.currentTurn = defenderId;

    await redisService.updateGameRoom(roomCode, room);

    return { success: true, result };
  }

  /**
   * Get game state for a specific player
   */
  async getGameState(roomCode: string, playerId: string): Promise<GameRoom | null> {
    return await redisService.getGameRoom(roomCode);
  }

  /**
   * End game (player left or timeout)
   */
  async endGame(
    roomCode: string,
    winnerId: string,
    reason: 'opponent_left' | 'timeout'
  ): Promise<void> {
    const room = await redisService.getGameRoom(roomCode);
    if (!room) return;

    room.status = 'finished';
    room.winnerId = winnerId;

    await redisService.updateGameRoom(roomCode, room);
  }

  /**
   * Check if player is in room
   */
  async isPlayerInRoom(roomCode: string, playerId: string): Promise<boolean> {
    const room = await redisService.getGameRoom(roomCode);
    if (!room) return false;
    return room.player1Id === playerId || room.player2Id === playerId;
  }

  /**
   * Get opponent ID
   */
  getOpponentId(room: GameRoom, playerId: string): string | null {
    if (room.player1Id === playerId) return room.player2Id || null;
    if (room.player2Id === playerId) return room.player1Id;
    return null;
  }

  /**
   * Calculate game statistics
   */
  calculateStats(room: GameRoom) {
    const stats: any = {};

    for (const playerId in room.gameStats) {
      const playerStats = room.gameStats[playerId];
      const board = room.boards[playerId];

      stats[playerId] = {
        shots: playerStats.shots,
        hits: playerStats.hits,
        misses: playerStats.misses,
        shipsRemaining: board ? countRemainingShips(board.ships) : 0,
      };
    }

    return stats;
  }
}

export const gameService = new GameService();

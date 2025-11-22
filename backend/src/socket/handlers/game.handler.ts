// Game event handlers for ship placement and gameplay

import { Socket } from 'socket.io';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  ShipPlacement,
  Coordinate,
  GameOverData,
  GameStateUpdate,
} from '../../types';
import { gameService } from '../../services/game.service';
import { matchService } from '../../services/match.service';
import { redisService } from '../../services/redis.service';
import { authService } from '../../services/auth.service';

/**
 * Handle ship placement
 */
export async function handlePlaceShips(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  io: any,
  ships: ShipPlacement[]
): Promise<void> {
  const user = socket.data.user;
  const roomCode = socket.data.roomCode;

  if (!user || !roomCode) {
    socket.emit('error', 'Not in a game room');
    return;
  }

  try {
    // Place ships
    const result = await gameService.placeShips(roomCode, user.id, ships);

    if (!result.success) {
      socket.emit('error', result.error || 'Failed to place ships');
      return;
    }

    // Get updated room
    const room = await redisService.getGameRoom(roomCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Notify both players
    io.to(roomCode).emit('shipsPlaced', {
      playerId: user.id,
      ready: true,
    });

    // Check if both players are ready
    if (room.status === 'playing' && room.currentTurn) {
      // Create match in database
      const matchId = await matchService.createMatchFromRoom(room);
      if (matchId) {
        room.matchId = matchId;
        await redisService.updateGameRoom(roomCode, room);
      }

      // Notify both players that game has started
      io.to(roomCode).emit('bothPlayersReady', {
        firstPlayer: room.currentTurn,
        message: 'Both players ready! Game starting...',
      });

      // Notify whose turn it is
      const player1Socket = await redisService.getUserSocket(room.player1Id);
      const player2Socket = await redisService.getUserSocket(room.player2Id!);

      if (player1Socket) {
        io.to(player1Socket).emit('turnChanged', {
          currentPlayer: room.currentTurn,
          isYourTurn: room.currentTurn === room.player1Id,
        });
      }

      if (player2Socket) {
        io.to(player2Socket).emit('turnChanged', {
          currentPlayer: room.currentTurn,
          isYourTurn: room.currentTurn === room.player2Id,
        });
      }
    }
  } catch (error) {
    console.error('Error placing ships:', error);
    socket.emit('error', 'Failed to place ships');
  }
}

/**
 * Handle firing a shot
 */
export async function handleFireShot(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  io: any,
  coordinate: Coordinate
): Promise<void> {
  const user = socket.data.user;
  const roomCode = socket.data.roomCode;

  if (!user || !roomCode) {
    socket.emit('error', 'Not in a game room');
    return;
  }

  try {
    // Fire shot
    const result = await gameService.fireShot(roomCode, user.id, coordinate);

    if (!result.success) {
      socket.emit('error', result.error || 'Failed to fire shot');
      return;
    }

    if (!result.result) {
      socket.emit('error', 'No result from shot');
      return;
    }

    // Get updated room
    const room = await redisService.getGameRoom(roomCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Notify both players of shot result
    io.to(roomCode).emit('shotResult', result.result);

    // If ship was sunk, notify both players
    if (result.result.result === 'sunk' && result.result.shipName) {
      io.to(roomCode).emit('shipSunk', {
        shipName: result.result.shipName,
        playerId: result.result.defender,
      });
    }

    // Check if game is over
    if (room.status === 'finished' && room.winnerId) {
      await handleGameOver(io, room, roomCode);
    } else {
      // Notify turn change
      const player1Socket = await redisService.getUserSocket(room.player1Id);
      const player2Socket = await redisService.getUserSocket(room.player2Id!);

      if (player1Socket) {
        io.to(player1Socket).emit('turnChanged', {
          currentPlayer: room.currentTurn!,
          isYourTurn: room.currentTurn === room.player1Id,
        });
      }

      if (player2Socket) {
        io.to(player2Socket).emit('turnChanged', {
          currentPlayer: room.currentTurn!,
          isYourTurn: room.currentTurn === room.player2Id,
        });
      }
    }
  } catch (error) {
    console.error('Error firing shot:', error);
    socket.emit('error', 'Failed to fire shot');
  }
}

/**
 * Handle game over
 */
async function handleGameOver(io: any, room: any, roomCode: string): Promise<void> {
  if (!room.winnerId) return;

  // Complete match in database
  await matchService.completeMatchFromRoom(room);

  // Get winner and loser info
  const winner = await authService.getUserById(room.winnerId);
  const loserId = room.player1Id === room.winnerId ? room.player2Id : room.player1Id;
  const loser = await authService.getUserById(loserId);

  if (!winner || !loser) return;

  // Calculate stats
  const stats = gameService.calculateStats(room);

  const gameOverData: GameOverData = {
    winnerId: room.winnerId,
    winnerEmail: winner.email,
    loserId,
    reason: 'all_ships_sunk',
    stats,
  };

  // Notify both players
  io.to(roomCode).emit('gameOver', gameOverData);

  // Clean up room after a delay
  setTimeout(async () => {
    await redisService.deleteGameRoom(roomCode);
  }, 30000); // 30 seconds
}

/**
 * Handle game state request
 */
export async function handleRequestGameState(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
): Promise<void> {
  const user = socket.data.user;
  const roomCode = socket.data.roomCode;

  if (!user || !roomCode) {
    socket.emit('error', 'Not in a game room');
    return;
  }

  try {
    const room = await redisService.getGameRoom(roomCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Get opponent ID
    const opponentId = gameService.getOpponentId(room, user.id);

    // Get player information
    const player1 = await authService.getUserById(room.player1Id);
    const player2 = room.player2Id ? await authService.getUserById(room.player2Id) : null;

    if (!player1) {
      socket.emit('error', 'Player data not found');
      return;
    }

    // Build game state for this player
    const gameState: GameStateUpdate = {
      roomCode: room.roomCode,
      status: room.status,
      currentTurn: room.currentTurn,
      players: {
        player1: {
          id: room.player1Id,
          email: player1.email,
          ready: room.playersReady[room.player1Id] || false,
        },
        player2: player2
          ? {
              id: room.player2Id!,
              email: player2.email,
              ready: room.playersReady[room.player2Id!] || false,
            }
          : undefined,
      },
    };

    // Add board information if ships are placed
    const yourBoard = room.boards[user.id];
    if (yourBoard) {
      gameState.yourBoard = {
        ships: yourBoard.ships,
        opponentHits: yourBoard.hits,
        opponentMisses: yourBoard.misses,
      };
    }

    // Add opponent board information (only hits/misses, not ship positions)
    if (opponentId) {
      const opponentBoard = room.boards[opponentId];
      if (opponentBoard) {
        gameState.opponentBoard = {
          yourHits: opponentBoard.hits,
          yourMisses: opponentBoard.misses,
          sunkShips: opponentBoard.ships.filter((s) => s.isSunk),
        };
      }
    }

    socket.emit('gameState', gameState);
  } catch (error) {
    console.error('Error getting game state:', error);
    socket.emit('error', 'Failed to get game state');
  }
}

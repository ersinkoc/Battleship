// Game Handler Tests

import { Socket } from 'socket.io';
import {
  handlePlaceShips,
  handleFireShot,
  handleRequestGameState,
} from '../../../../src/socket/handlers/game.handler';
import { gameService } from '../../../../src/services/game.service';
import { matchService } from '../../../../src/services/match.service';
import { redisService } from '../../../../src/services/redis.service';
import { authService } from '../../../../src/services/auth.service';
import { GameRoom, ShipPlacement } from '../../../../src/types';

jest.mock('../../../../src/services/game.service');
jest.mock('../../../../src/services/match.service');
jest.mock('../../../../src/services/redis.service');
jest.mock('../../../../src/services/auth.service');

describe('Game Handler', () => {
  let mockSocket: any;
  let mockIo: any;

  const mockRoom: GameRoom = {
    roomCode: 'ROOM01',
    player1Id: 'player1',
    player2Id: 'player2',
    status: 'setup',
    boards: {},
    playersReady: {},
    gameStats: {},
    createdAt: Date.now(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalShots: 0,
    totalHits: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockSocket = {
      id: 'socket-123',
      data: {
        user: { id: 'player1', email: 'test@example.com' },
        roomCode: 'ROOM01',
      },
      emit: jest.fn(),
    };

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('handlePlaceShips', () => {
    const validPlacements: ShipPlacement[] = [
      { id: 'carrier', name: 'Carrier', size: 5, startCoordinate: { x: 0, y: 0 }, orientation: 'horizontal' },
    ];

    it('should place ships successfully', async () => {
      (gameService.placeShips as jest.Mock).mockResolvedValue({ success: true });
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(mockRoom);

      await handlePlaceShips(mockSocket, mockIo, validPlacements);

      expect(gameService.placeShips).toHaveBeenCalledWith('ROOM01', 'player1', validPlacements);
      expect(mockIo.to).toHaveBeenCalledWith('ROOM01');
      expect(mockIo.emit).toHaveBeenCalledWith('shipsPlaced', {
        playerId: 'player1',
        ready: true,
      });
    });

    it('should reject if user not in room', async () => {
      mockSocket.data.roomCode = null;

      await handlePlaceShips(mockSocket, mockIo, validPlacements);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Not in a game room');
      expect(gameService.placeShips).not.toHaveBeenCalled();
    });

    it('should reject if placement fails', async () => {
      (gameService.placeShips as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Invalid placement',
      });

      await handlePlaceShips(mockSocket, mockIo, validPlacements);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Invalid placement');
    });

    it('should start game when both players ready', async () => {
      const playingRoom = {
        ...mockRoom,
        status: 'playing' as const,
        currentTurn: 'player1',
      };

      (gameService.placeShips as jest.Mock).mockResolvedValue({ success: true });
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(playingRoom);
      (matchService.createMatchFromRoom as jest.Mock).mockResolvedValue('match-123');
      (redisService.getUserSocket as jest.Mock).mockResolvedValue('socket-id');

      await handlePlaceShips(mockSocket, mockIo, validPlacements);

      expect(matchService.createMatchFromRoom).toHaveBeenCalledWith(playingRoom);
      expect(mockIo.emit).toHaveBeenCalledWith('bothPlayersReady', expect.any(Object));
    });

    it('should handle errors gracefully', async () => {
      (gameService.placeShips as jest.Mock).mockRejectedValue(new Error('Service error'));

      await handlePlaceShips(mockSocket, mockIo, validPlacements);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to place ships');
    });
  });

  describe('handleFireShot', () => {
    const coordinate = { x: 5, y: 5 };

    it('should fire shot successfully', async () => {
      const shotResult = {
        success: true,
        result: {
          coordinate,
          result: 'hit' as const,
          attacker: 'player1',
          defender: 'player2',
        },
      };

      (gameService.fireShot as jest.Mock).mockResolvedValue(shotResult);
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({
        ...mockRoom,
        status: 'playing',
        currentTurn: 'player2',
      });
      (redisService.getUserSocket as jest.Mock).mockResolvedValue('socket-id');

      await handleFireShot(mockSocket, mockIo, coordinate);

      expect(gameService.fireShot).toHaveBeenCalledWith('ROOM01', 'player1', coordinate);
      expect(mockIo.emit).toHaveBeenCalledWith('shotResult', shotResult.result);
    });

    it('should reject if user not in room', async () => {
      mockSocket.data.roomCode = null;

      await handleFireShot(mockSocket, mockIo, coordinate);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Not in a game room');
      expect(gameService.fireShot).not.toHaveBeenCalled();
    });

    it('should reject if shot fails', async () => {
      (gameService.fireShot as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Not your turn',
      });

      await handleFireShot(mockSocket, mockIo, coordinate);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Not your turn');
    });

    it('should emit shipSunk when ship is sunk', async () => {
      const shotResult = {
        success: true,
        result: {
          coordinate,
          result: 'sunk' as const,
          shipName: 'Destroyer',
          shipId: 'destroyer',
          attacker: 'player1',
          defender: 'player2',
        },
      };

      (gameService.fireShot as jest.Mock).mockResolvedValue(shotResult);
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({
        ...mockRoom,
        status: 'playing',
      });
      (redisService.getUserSocket as jest.Mock).mockResolvedValue('socket-id');

      await handleFireShot(mockSocket, mockIo, coordinate);

      expect(mockIo.emit).toHaveBeenCalledWith('shipSunk', {
        shipName: 'Destroyer',
        playerId: 'player2',
      });
    });

    it('should handle game over', async () => {
      const shotResult = {
        success: true,
        result: {
          coordinate,
          result: 'sunk' as const,
          shipName: 'Destroyer',
          shipId: 'destroyer',
          attacker: 'player1',
          defender: 'player2',
        },
      };

      const finishedRoom = {
        ...mockRoom,
        status: 'finished' as const,
        winnerId: 'player1',
        matchId: 'match-123',
        gameStats: {
          player1: { shots: 50, hits: 17, misses: 33 },
          player2: { shots: 45, hits: 15, misses: 30 },
        },
      };

      (gameService.fireShot as jest.Mock).mockResolvedValue(shotResult);
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(finishedRoom);
      (matchService.completeMatchFromRoom as jest.Mock).mockResolvedValue(undefined);
      (authService.getUserById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, id: 'player2' });
      (gameService.calculateStats as jest.Mock).mockReturnValue({});

      await handleFireShot(mockSocket, mockIo, coordinate);

      expect(matchService.completeMatchFromRoom).toHaveBeenCalledWith(finishedRoom);
      expect(mockIo.emit).toHaveBeenCalledWith('gameOver', expect.any(Object));
    });

    it('should handle errors gracefully', async () => {
      (gameService.fireShot as jest.Mock).mockRejectedValue(new Error('Service error'));

      await handleFireShot(mockSocket, mockIo, coordinate);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to fire shot');
    });
  });

  describe('handleRequestGameState', () => {
    it('should return game state successfully', async () => {
      const roomWithBoards = {
        ...mockRoom,
        playersReady: { player1: true, player2: false },
        boards: {
          player1: {
            ships: [],
            hits: [],
            misses: [],
          },
          player2: {
            ships: [],
            hits: [],
            misses: [],
          },
        },
      };

      (redisService.getGameRoom as jest.Mock).mockResolvedValue(roomWithBoards);
      (gameService.getOpponentId as jest.Mock).mockReturnValue('player2');
      (authService.getUserById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, id: 'player2', email: 'player2@example.com' });

      await handleRequestGameState(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameState', expect.objectContaining({
        roomCode: 'ROOM01',
        status: 'setup',
        players: expect.any(Object),
      }));
    });

    it('should reject if user not in room', async () => {
      mockSocket.data.roomCode = null;

      await handleRequestGameState(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Not in a game room');
      expect(redisService.getGameRoom).not.toHaveBeenCalled();
    });

    it('should reject if room not found', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(null);

      await handleRequestGameState(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Room not found');
    });

    it('should include board information if ships placed', async () => {
      const roomWithBoards = {
        ...mockRoom,
        boards: {
          player1: {
            ships: [{ id: 'destroyer', name: 'Destroyer', size: 2, coordinates: [], hits: 0, isSunk: false }],
            hits: [{ x: 0, y: 0 }],
            misses: [{ x: 1, y: 1 }],
          },
        },
      };

      (redisService.getGameRoom as jest.Mock).mockResolvedValue(roomWithBoards);
      (gameService.getOpponentId as jest.Mock).mockReturnValue('player2');
      (authService.getUserById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      await handleRequestGameState(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameState', expect.objectContaining({
        yourBoard: expect.any(Object),
      }));
    });

    it('should include opponent board hits and misses', async () => {
      const roomWithBoards = {
        ...mockRoom,
        boards: {
          player1: {
            ships: [],
            hits: [],
            misses: [],
          },
          player2: {
            ships: [{ id: 'destroyer', name: 'Destroyer', size: 2, coordinates: [], hits: 2, isSunk: true }],
            hits: [{ x: 5, y: 5 }],
            misses: [{ x: 6, y: 6 }],
          },
        },
      };

      (redisService.getGameRoom as jest.Mock).mockResolvedValue(roomWithBoards);
      (gameService.getOpponentId as jest.Mock).mockReturnValue('player2');
      (authService.getUserById as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, id: 'player2' });

      await handleRequestGameState(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameState', expect.objectContaining({
        opponentBoard: expect.objectContaining({
          yourHits: [{ x: 5, y: 5 }],
          yourMisses: [{ x: 6, y: 6 }],
          sunkShips: expect.any(Array),
        }),
      }));
    });

    it('should handle errors gracefully', async () => {
      (redisService.getGameRoom as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await handleRequestGameState(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to get game state');
    });

    it('should handle player2 not joined yet', async () => {
      const roomWithoutPlayer2 = {
        ...mockRoom,
        player2Id: undefined,
        playersReady: { player1: false },
      };

      (redisService.getGameRoom as jest.Mock).mockResolvedValue(roomWithoutPlayer2);
      (gameService.getOpponentId as jest.Mock).mockReturnValue(null);
      (authService.getUserById as jest.Mock).mockResolvedValueOnce(mockUser);

      await handleRequestGameState(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('gameState', expect.objectContaining({
        players: expect.objectContaining({
          player1: expect.any(Object),
          player2: undefined,
        }),
      }));
    });
  });
});

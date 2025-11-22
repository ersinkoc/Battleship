// Game Service Tests

import { gameService } from '../../../src/services/game.service';
import { redisService } from '../../../src/services/redis.service';
import { GameRoom, ShipPlacement } from '../../../src/types';

// Mock the services
jest.mock('../../../src/services/redis.service');

describe('GameService', () => {
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

  const validPlacements: ShipPlacement[] = [
    { id: 'carrier', name: 'Carrier', size: 5, startCoordinate: { x: 0, y: 0 }, orientation: 'horizontal' },
    { id: 'battleship', name: 'Battleship', size: 4, startCoordinate: { x: 0, y: 1 }, orientation: 'horizontal' },
    { id: 'cruiser', name: 'Cruiser', size: 3, startCoordinate: { x: 0, y: 2 }, orientation: 'horizontal' },
    { id: 'submarine', name: 'Submarine', size: 3, startCoordinate: { x: 0, y: 3 }, orientation: 'horizontal' },
    { id: 'destroyer', name: 'Destroyer', size: 2, startCoordinate: { x: 0, y: 4 }, orientation: 'horizontal' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeGameRoom', () => {
    it('should create a new game room with correct structure', () => {
      const room = gameService.initializeGameRoom('ROOM01', 'player1');

      expect(room).toEqual({
        roomCode: 'ROOM01',
        player1Id: 'player1',
        status: 'waiting',
        boards: {},
        playersReady: {},
        gameStats: {},
        createdAt: expect.any(Number),
      });
    });

    it('should set status to waiting initially', () => {
      const room = gameService.initializeGameRoom('ROOM01', 'player1');

      expect(room.status).toBe('waiting');
    });

    it('should not have player2 initially', () => {
      const room = gameService.initializeGameRoom('ROOM01', 'player1');

      expect(room.player2Id).toBeUndefined();
    });
  });

  describe('addPlayer2', () => {
    it('should add second player to the room', async () => {
      const room = { ...mockRoom, player2Id: undefined };
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(room);
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      const updatedRoom = await gameService.addPlayer2('ROOM01', 'player2');

      expect(updatedRoom?.player2Id).toBe('player2');
      expect(updatedRoom?.status).toBe('setup');
      expect(redisService.updateGameRoom).toHaveBeenCalledWith('ROOM01', expect.objectContaining({
        player2Id: 'player2',
        status: 'setup',
      }));
    });

    it('should return null if room not found', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(null);

      const result = await gameService.addPlayer2('NONEXISTENT', 'player2');

      expect(result).toBeNull();
      expect(redisService.updateGameRoom).not.toHaveBeenCalled();
    });

    it('should change status to setup', async () => {
      const room = { ...mockRoom, player2Id: undefined, status: 'waiting' as const };
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(room);
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      const updatedRoom = await gameService.addPlayer2('ROOM01', 'player2');

      expect(updatedRoom?.status).toBe('setup');
    });
  });

  describe('placeShips', () => {
    it('should place ships successfully', async () => {
      const room = { ...mockRoom, playersReady: {} };
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(room);
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      const result = await gameService.placeShips('ROOM01', 'player1', validPlacements);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(redisService.updateGameRoom).toHaveBeenCalled();
    });

    it('should reject invalid ship placements', async () => {
      const invalidPlacements: ShipPlacement[] = [
        { id: 'carrier', name: 'Carrier', size: 3, startCoordinate: { x: 0, y: 0 }, orientation: 'horizontal' },
      ];

      const result = await gameService.placeShips('ROOM01', 'player1', invalidPlacements);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(redisService.getGameRoom).not.toHaveBeenCalled();
    });

    it('should return error if room not found', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(null);

      const result = await gameService.placeShips('NONEXISTENT', 'player1', validPlacements);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should reject if player not in room', async () => {
      const room = { ...mockRoom };
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(room);

      const result = await gameService.placeShips('ROOM01', 'stranger', validPlacements);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You are not in this room');
    });

    it('should reject if ships already placed', async () => {
      const room = { ...mockRoom, playersReady: { player1: true } };
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(room);

      const result = await gameService.placeShips('ROOM01', 'player1', validPlacements);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Ships already placed');
    });

    it('should start game when both players ready', async () => {
      const room = {
        ...mockRoom,
        playersReady: { player1: true },
        boards: {
          player1: { ships: [], hits: [], misses: [] },
        },
        gameStats: {
          player1: { shots: 0, hits: 0, misses: 0 },
        },
      };
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(room);
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      await gameService.placeShips('ROOM01', 'player2', validPlacements);

      expect(redisService.updateGameRoom).toHaveBeenCalledWith('ROOM01', expect.objectContaining({
        status: 'playing',
        startedAt: expect.any(Number),
        currentTurn: expect.any(String),
      }));
    });
  });

  describe('fireShot', () => {
    const playingRoom: GameRoom = {
      roomCode: 'ROOM01',
      player1Id: 'player1',
      player2Id: 'player2',
      status: 'playing',
      currentTurn: 'player1',
      boards: {
        player1: {
          ships: [
            {
              id: 'destroyer',
              name: 'Destroyer',
              size: 2,
              coordinates: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
              hits: 0,
              isSunk: false,
            },
          ],
          hits: [],
          misses: [],
        },
        player2: {
          ships: [
            {
              id: 'destroyer',
              name: 'Destroyer',
              size: 2,
              coordinates: [{ x: 5, y: 5 }, { x: 6, y: 5 }],
              hits: 0,
              isSunk: false,
            },
          ],
          hits: [],
          misses: [],
        },
      },
      playersReady: { player1: true, player2: true },
      gameStats: {
        player1: { shots: 0, hits: 0, misses: 0 },
        player2: { shots: 0, hits: 0, misses: 0 },
      },
      createdAt: Date.now(),
    };

    it('should process a miss correctly', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({ ...playingRoom });
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      const result = await gameService.fireShot('ROOM01', 'player1', { x: 0, y: 0 });

      expect(result.success).toBe(true);
      expect(result.result?.result).toBe('miss');
      expect(result.result?.coordinate).toEqual({ x: 0, y: 0 });
      expect(result.result?.attacker).toBe('player1');
      expect(result.result?.defender).toBe('player2');
    });

    it('should process a hit correctly', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({ ...playingRoom });
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      const result = await gameService.fireShot('ROOM01', 'player1', { x: 5, y: 5 });

      expect(result.success).toBe(true);
      expect(result.result?.result).toBe('hit');
      expect(result.result?.shipName).toBe('Destroyer');
    });

    it('should process a sunk ship correctly', async () => {
      const roomWithDamagedShip = {
        ...playingRoom,
        boards: {
          ...playingRoom.boards,
          player2: {
            ships: [
              {
                id: 'destroyer',
                name: 'Destroyer',
                size: 2,
                coordinates: [{ x: 5, y: 5 }, { x: 6, y: 5 }],
                hits: 1, // Already hit once
                isSunk: false,
              },
            ],
            hits: [{ x: 5, y: 5 }],
            misses: [],
          },
        },
      };
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(roomWithDamagedShip);
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      const result = await gameService.fireShot('ROOM01', 'player1', { x: 6, y: 5 });

      expect(result.success).toBe(true);
      expect(result.result?.result).toBe('sunk');
    });

    it('should return error if room not found', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(null);

      const result = await gameService.fireShot('NONEXISTENT', 'player1', { x: 0, y: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Room not found');
    });

    it('should return error if game not in playing state', async () => {
      const setupRoom = { ...playingRoom, status: 'setup' as const };
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(setupRoom);

      const result = await gameService.fireShot('ROOM01', 'player1', { x: 0, y: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Game is not in playing state');
    });

    it('should return error if not player\'s turn', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({ ...playingRoom });

      const result = await gameService.fireShot('ROOM01', 'player2', { x: 0, y: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('should return error if coordinate already attacked', async () => {
      const roomWithShots = {
        ...playingRoom,
        boards: {
          ...playingRoom.boards,
          player2: {
            ...playingRoom.boards.player2,
            misses: [{ x: 0, y: 0 }],
          },
        },
      };
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(roomWithShots);

      const result = await gameService.fireShot('ROOM01', 'player1', { x: 0, y: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Coordinate already attacked');
    });

    it('should switch turns after shot', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({ ...playingRoom });
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      await gameService.fireShot('ROOM01', 'player1', { x: 0, y: 0 });

      expect(redisService.updateGameRoom).toHaveBeenCalledWith('ROOM01', expect.objectContaining({
        currentTurn: 'player2',
      }));
    });

    it('should increment shot statistics', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({ ...playingRoom });
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      await gameService.fireShot('ROOM01', 'player1', { x: 0, y: 0 });

      expect(redisService.updateGameRoom).toHaveBeenCalledWith('ROOM01', expect.objectContaining({
        gameStats: expect.objectContaining({
          player1: expect.objectContaining({
            shots: 1,
          }),
        }),
      }));
    });
  });

  describe('getGameState', () => {
    it('should retrieve game room state', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(mockRoom);

      const room = await gameService.getGameState('ROOM01', 'player1');

      expect(room).toEqual(mockRoom);
      expect(redisService.getGameRoom).toHaveBeenCalledWith('ROOM01');
    });

    it('should return null if room not found', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(null);

      const room = await gameService.getGameState('NONEXISTENT', 'player1');

      expect(room).toBeNull();
    });
  });

  describe('endGame', () => {
    it('should end game with winner', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({ ...mockRoom });
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      await gameService.endGame('ROOM01', 'player1', 'opponent_left');

      expect(redisService.updateGameRoom).toHaveBeenCalledWith('ROOM01', expect.objectContaining({
        status: 'finished',
        winnerId: 'player1',
      }));
    });

    it('should handle timeout reason', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({ ...mockRoom });
      (redisService.updateGameRoom as jest.Mock).mockResolvedValue(undefined);

      await gameService.endGame('ROOM01', 'player2', 'timeout');

      expect(redisService.updateGameRoom).toHaveBeenCalledWith('ROOM01', expect.objectContaining({
        status: 'finished',
        winnerId: 'player2',
      }));
    });

    it('should do nothing if room not found', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(null);

      await gameService.endGame('NONEXISTENT', 'player1', 'opponent_left');

      expect(redisService.updateGameRoom).not.toHaveBeenCalled();
    });
  });

  describe('isPlayerInRoom', () => {
    it('should return true for player1', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(mockRoom);

      const isInRoom = await gameService.isPlayerInRoom('ROOM01', 'player1');

      expect(isInRoom).toBe(true);
    });

    it('should return true for player2', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(mockRoom);

      const isInRoom = await gameService.isPlayerInRoom('ROOM01', 'player2');

      expect(isInRoom).toBe(true);
    });

    it('should return false for non-member', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(mockRoom);

      const isInRoom = await gameService.isPlayerInRoom('ROOM01', 'stranger');

      expect(isInRoom).toBe(false);
    });

    it('should return false if room not found', async () => {
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(null);

      const isInRoom = await gameService.isPlayerInRoom('NONEXISTENT', 'player1');

      expect(isInRoom).toBe(false);
    });
  });

  describe('getOpponentId', () => {
    it('should return player2 for player1', () => {
      const opponentId = gameService.getOpponentId(mockRoom, 'player1');

      expect(opponentId).toBe('player2');
    });

    it('should return player1 for player2', () => {
      const opponentId = gameService.getOpponentId(mockRoom, 'player2');

      expect(opponentId).toBe('player1');
    });

    it('should return null if player not in room', () => {
      const opponentId = gameService.getOpponentId(mockRoom, 'stranger');

      expect(opponentId).toBeNull();
    });

    it('should return null if player2 not yet joined', () => {
      const roomWithoutPlayer2 = { ...mockRoom, player2Id: undefined };
      const opponentId = gameService.getOpponentId(roomWithoutPlayer2, 'player1');

      expect(opponentId).toBeNull();
    });
  });

  describe('calculateStats', () => {
    it('should calculate stats for both players', () => {
      const roomWithStats: GameRoom = {
        ...mockRoom,
        gameStats: {
          player1: { shots: 10, hits: 3, misses: 7 },
          player2: { shots: 8, hits: 2, misses: 6 },
        },
        boards: {
          player1: {
            ships: [
              { id: 'destroyer', name: 'Destroyer', size: 2, coordinates: [], hits: 0, isSunk: false },
              { id: 'cruiser', name: 'Cruiser', size: 3, coordinates: [], hits: 3, isSunk: true },
            ],
            hits: [],
            misses: [],
          },
          player2: {
            ships: [
              { id: 'destroyer', name: 'Destroyer', size: 2, coordinates: [], hits: 0, isSunk: false },
            ],
            hits: [],
            misses: [],
          },
        },
      };

      const stats = gameService.calculateStats(roomWithStats);

      expect(stats.player1).toEqual({
        shots: 10,
        hits: 3,
        misses: 7,
        shipsRemaining: 1,
      });

      expect(stats.player2).toEqual({
        shots: 8,
        hits: 2,
        misses: 6,
        shipsRemaining: 1,
      });
    });

    it('should handle empty boards', () => {
      const roomWithoutBoards: GameRoom = {
        ...mockRoom,
        gameStats: {
          player1: { shots: 0, hits: 0, misses: 0 },
        },
        boards: {},
      };

      const stats = gameService.calculateStats(roomWithoutBoards);

      expect(stats.player1.shipsRemaining).toBe(0);
    });
  });
});

// Room Handler Tests

import {
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
} from '../../../../src/socket/handlers/room.handler';
import { redisService } from '../../../../src/services/redis.service';
import { GameRoom } from '../../../../src/types';

jest.mock('../../../../src/services/redis.service');

// Mock Math.random for predictable room code generation
const mockMathRandom = jest.spyOn(Math, 'random');

describe('Room Handler', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      id: 'socket-123',
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    jest.clearAllMocks();
    mockMathRandom.mockReturnValue(0.5);
  });

  afterAll(() => {
    mockMathRandom.mockRestore();
  });

  describe('handleCreateRoom', () => {
    it('should create room successfully', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.roomExists as jest.Mock).mockResolvedValue(false);

      await handleCreateRoom(mockSocket);

      expect(redisService.createGameRoom).toHaveBeenCalled();
      expect(mockSocket.join).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('roomCreated', expect.any(String));
    });

    it('should reject if user not authenticated', async () => {
      mockSocket.data.user = null;

      await handleCreateRoom(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'User not authenticated');
      expect(redisService.createGameRoom).not.toHaveBeenCalled();
    });

    it('should reject if user already in room', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('EXISTING_ROOM');

      await handleCreateRoom(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'You are already in a room');
      expect(redisService.createGameRoom).not.toHaveBeenCalled();
    });

    it('should generate unique room code', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.roomExists as jest.Mock)
        .mockResolvedValueOnce(true) // First code exists
        .mockResolvedValueOnce(false); // Second code is unique

      await handleCreateRoom(mockSocket);

      expect(redisService.roomExists).toHaveBeenCalledTimes(2);
      expect(redisService.createGameRoom).toHaveBeenCalled();
    });

    it('should fail if cannot generate unique code after 10 attempts', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.roomExists as jest.Mock).mockResolvedValue(true); // Always exists

      await handleCreateRoom(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to generate unique room code');
      expect(redisService.createGameRoom).not.toHaveBeenCalled();
    });

    it('should store user-room mapping', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.roomExists as jest.Mock).mockResolvedValue(false);

      await handleCreateRoom(mockSocket);

      const roomCode = (mockSocket.emit as jest.Mock).mock.calls[0][1];
      expect(redisService.setUserRoom).toHaveBeenCalledWith('user-123', roomCode);
      expect(redisService.addUserToRoom).toHaveBeenCalledWith(roomCode, 'user-123');
    });

    it('should handle errors gracefully', async () => {
      (redisService.getUserRoom as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await handleCreateRoom(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to create room');
    });
  });

  describe('handleJoinRoom', () => {
    // Helper function to create a fresh room object for each test
    const createMockRoom = (): GameRoom => ({
      roomCode: 'ROOM01',
      player1Id: 'other-user',
      status: 'waiting',
      boards: {},
      playersReady: {},
      gameStats: {},
      createdAt: Date.now(),
    });

    it('should join room successfully', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(createMockRoom());

      await handleJoinRoom(mockSocket, 'ROOM01');

      expect(mockSocket.join).toHaveBeenCalledWith('ROOM01');
      expect(redisService.updateGameRoom).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('gameStarted', expect.any(Object));
    });

    it('should reject if user not authenticated', async () => {
      mockSocket.data.user = null;

      await handleJoinRoom(mockSocket, 'ROOM01');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'User not authenticated');
    });

    it('should reject invalid room code format', async () => {
      await handleJoinRoom(mockSocket, 'invalid');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Invalid room code format');
      expect(redisService.getGameRoom).not.toHaveBeenCalled();
    });

    it('should reject if user already in room', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('OTHER_ROOM');

      await handleJoinRoom(mockSocket, 'ROOM01');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'You are already in a room');
    });

    it('should reject if room not found', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(null);

      await handleJoinRoom(mockSocket, 'ROOM01');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Room not found');
    });

    it('should reject if room is full', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({
        ...createMockRoom(),
        player2Id: 'another-user',
      });

      await handleJoinRoom(mockSocket, 'ROOM01');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Room is full');
    });

    it('should reject if trying to join own room', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.getGameRoom as jest.Mock).mockResolvedValue({
        ...createMockRoom(),
        player1Id: 'user-123',
      });

      await handleJoinRoom(mockSocket, 'ROOM01');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Cannot join your own room');
    });

    it('should update room status to setup', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(createMockRoom());

      await handleJoinRoom(mockSocket, 'ROOM01');

      expect(redisService.updateGameRoom).toHaveBeenCalledWith(
        'ROOM01',
        expect.objectContaining({
          player2Id: 'user-123',
          status: 'setup',
        })
      );
    });

    it('should notify other player', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);
      (redisService.getGameRoom as jest.Mock).mockResolvedValue(createMockRoom());

      await handleJoinRoom(mockSocket, 'ROOM01');

      expect(mockSocket.to).toHaveBeenCalledWith('ROOM01');
      expect(mockSocket.emit).toHaveBeenCalledWith('playerJoined', {
        playerId: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should handle errors gracefully', async () => {
      (redisService.getUserRoom as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await handleJoinRoom(mockSocket, 'ROOM01');

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to join room');
    });
  });

  describe('handleLeaveRoom', () => {
    it('should leave room successfully', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('ROOM01');
      (redisService.getRoomUsers as jest.Mock).mockResolvedValue(['other-user']);

      await handleLeaveRoom(mockSocket);

      expect(mockSocket.leave).toHaveBeenCalledWith('ROOM01');
      expect(redisService.removeUserFromRoom).toHaveBeenCalledWith('ROOM01', 'user-123');
      expect(redisService.deleteUserRoom).toHaveBeenCalledWith('user-123');
    });

    it('should reject if user not authenticated', async () => {
      mockSocket.data.user = null;

      await handleLeaveRoom(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'User not authenticated');
    });

    it('should reject if user not in room', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);

      await handleLeaveRoom(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'You are not in a room');
    });

    it('should notify other player', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('ROOM01');
      (redisService.getRoomUsers as jest.Mock).mockResolvedValue(['other-user']);

      await handleLeaveRoom(mockSocket);

      expect(mockSocket.to).toHaveBeenCalledWith('ROOM01');
      expect(mockSocket.emit).toHaveBeenCalledWith('opponentLeft', {
        message: 'Your opponent has left the game',
      });
    });

    it('should delete room if empty after leaving', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('ROOM01');
      (redisService.getRoomUsers as jest.Mock).mockResolvedValue([]);

      await handleLeaveRoom(mockSocket);

      expect(redisService.deleteGameRoom).toHaveBeenCalledWith('ROOM01');
    });

    it('should not delete room if other users remain', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('ROOM01');
      (redisService.getRoomUsers as jest.Mock).mockResolvedValue(['other-user']);

      await handleLeaveRoom(mockSocket);

      expect(redisService.deleteGameRoom).not.toHaveBeenCalled();
    });

    it('should remove room code from socket data', async () => {
      mockSocket.data.roomCode = 'ROOM01';
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('ROOM01');
      (redisService.getRoomUsers as jest.Mock).mockResolvedValue([]);

      await handleLeaveRoom(mockSocket);

      expect(mockSocket.data.roomCode).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      (redisService.getUserRoom as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await handleLeaveRoom(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Failed to leave room');
    });
  });
});

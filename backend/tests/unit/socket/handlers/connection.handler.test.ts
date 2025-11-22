// Connection Handler Tests

import { handleConnection } from '../../../../src/socket/handlers/connection.handler';
import { redisService } from '../../../../src/services/redis.service';

jest.mock('../../../../src/services/redis.service');

describe('Connection Handler', () => {
  let mockSocket: any;
  let disconnectCallback: () => Promise<void>;

  beforeEach(() => {
    mockSocket = {
      id: 'socket-123',
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      },
      disconnect: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'disconnect') {
          disconnectCallback = callback;
        }
      }),
      leave: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should disconnect socket without user data', () => {
      mockSocket.data = {};

      handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should store socket mapping in Redis', () => {
      handleConnection(mockSocket);

      expect(redisService.setSocketUser).toHaveBeenCalledWith(
        'socket-123',
        'user-123',
        'test@example.com'
      );
      expect(redisService.setUserSocket).toHaveBeenCalledWith('user-123', 'socket-123');
    });

    it('should register disconnect handler', () => {
      handleConnection(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should send welcome message', () => {
      handleConnection(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        'Connected to Voxel Battleship server!'
      );
    });
  });

  describe('disconnect handler', () => {
    beforeEach(() => {
      handleConnection(mockSocket);
    });

    it('should clean up socket mappings on disconnect', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue(null);

      await disconnectCallback();

      expect(redisService.deleteSocketUser).toHaveBeenCalledWith('socket-123');
      expect(redisService.deleteUserSocket).toHaveBeenCalledWith('user-123');
    });

    it('should leave room on disconnect if user was in room', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('ROOM01');
      (redisService.getRoomUsers as jest.Mock).mockResolvedValue(['other-user']);

      await disconnectCallback();

      expect(mockSocket.leave).toHaveBeenCalledWith('ROOM01');
      expect(redisService.removeUserFromRoom).toHaveBeenCalledWith('ROOM01', 'user-123');
      expect(redisService.deleteUserRoom).toHaveBeenCalledWith('user-123');
    });

    it('should notify other player when leaving room', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('ROOM01');
      (redisService.getRoomUsers as jest.Mock).mockResolvedValue(['other-user']);

      await disconnectCallback();

      expect(mockSocket.to).toHaveBeenCalledWith('ROOM01');
      expect(mockSocket.emit).toHaveBeenCalledWith('opponentLeft', {
        message: 'Your opponent has left the game',
      });
    });

    it('should delete game room if empty after disconnect', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('ROOM01');
      (redisService.getRoomUsers as jest.Mock).mockResolvedValue([]);

      await disconnectCallback();

      expect(redisService.deleteGameRoom).toHaveBeenCalledWith('ROOM01');
    });

    it('should not delete game room if other users remain', async () => {
      (redisService.getUserRoom as jest.Mock).mockResolvedValue('ROOM01');
      (redisService.getRoomUsers as jest.Mock).mockResolvedValue(['other-user']);

      await disconnectCallback();

      expect(redisService.deleteGameRoom).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (redisService.getUserRoom as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(disconnectCallback()).resolves.not.toThrow();
    });

    it('should clean up mappings even if getting room fails', async () => {
      (redisService.getUserRoom as jest.Mock).mockRejectedValue(new Error('Redis error'));

      await disconnectCallback();

      expect(redisService.deleteSocketUser).toHaveBeenCalledWith('socket-123');
      expect(redisService.deleteUserSocket).toHaveBeenCalledWith('user-123');
    });
  });
});

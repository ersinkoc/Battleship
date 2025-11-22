// Redis Service Tests

import { redisService } from '../../../src/services/redis.service';
import { mockRedisClient } from '../../mocks/redis.mock';
import { GameRoom } from '../../../src/types';

describe('RedisService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', () => {
      const status = redisService.getConnectionStatus();
      expect(typeof status).toBe('boolean');
    });
  });

  describe('createGameRoom', () => {
    it('should create a new game room', async () => {
      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.createGameRoom('ROOM01', 'player1');

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'room:ROOM01',
        3600,
        expect.stringContaining('ROOM01')
      );
    });

    it('should set expiry to 1 hour', async () => {
      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.createGameRoom('ROOM01', 'player1');

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        3600,
        expect.any(String)
      );
    });

    it('should create room with correct structure', async () => {
      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.createGameRoom('ROOM01', 'player1');

      const callData = JSON.parse((mockRedisClient.setex as jest.Mock).mock.calls[0][2]);
      expect(callData).toEqual(
        expect.objectContaining({
          roomCode: 'ROOM01',
          player1Id: 'player1',
          status: 'waiting',
        })
      );
    });
  });

  describe('getGameRoom', () => {
    it('should retrieve existing game room', async () => {
      const mockRoom: GameRoom = {
        roomCode: 'ROOM01',
        player1Id: 'player1',
        status: 'waiting',
        boards: {},
        playersReady: {},
        gameStats: {},
        createdAt: Date.now(),
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockRoom));

      const room = await redisService.getGameRoom('ROOM01');

      expect(room).toEqual(mockRoom);
      expect(mockRedisClient.get).toHaveBeenCalledWith('room:ROOM01');
    });

    it('should return null if room not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const room = await redisService.getGameRoom('NONEXISTENT');

      expect(room).toBeNull();
    });
  });

  describe('updateGameRoom', () => {
    it('should update existing game room', async () => {
      const mockRoom: GameRoom = {
        roomCode: 'ROOM01',
        player1Id: 'player1',
        player2Id: 'player2',
        status: 'playing',
        boards: {},
        playersReady: {},
        gameStats: {},
        createdAt: Date.now(),
      };

      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.updateGameRoom('ROOM01', mockRoom);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'room:ROOM01',
        3600,
        JSON.stringify(mockRoom)
      );
    });
  });

  describe('deleteGameRoom', () => {
    it('should delete game room', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await redisService.deleteGameRoom('ROOM01');

      expect(mockRedisClient.del).toHaveBeenCalledWith('room:ROOM01');
    });
  });

  describe('roomExists', () => {
    it('should return true if room exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const exists = await redisService.roomExists('ROOM01');

      expect(exists).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('room:ROOM01');
    });

    it('should return false if room does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const exists = await redisService.roomExists('NONEXISTENT');

      expect(exists).toBe(false);
    });
  });

  describe('setSocketUser', () => {
    it('should set socket to user mapping', async () => {
      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.setSocketUser('socket-123', 'user-123', 'test@example.com');

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'socket:socket-123',
        86400,
        JSON.stringify({ userId: 'user-123', email: 'test@example.com' })
      );
    });

    it('should set 24 hour expiry', async () => {
      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.setSocketUser('socket-123', 'user-123', 'test@example.com');

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        86400,
        expect.any(String)
      );
    });
  });

  describe('getSocketUser', () => {
    it('should retrieve user data from socket ID', async () => {
      const userData = { userId: 'user-123', email: 'test@example.com' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(userData));

      const result = await redisService.getSocketUser('socket-123');

      expect(result).toEqual(userData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('socket:socket-123');
    });

    it('should return null if socket not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisService.getSocketUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteSocketUser', () => {
    it('should delete socket user mapping', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await redisService.deleteSocketUser('socket-123');

      expect(mockRedisClient.del).toHaveBeenCalledWith('socket:socket-123');
    });
  });

  describe('setUserSocket', () => {
    it('should set user to socket mapping', async () => {
      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.setUserSocket('user-123', 'socket-123');

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'user:user-123:socket',
        86400,
        'socket-123'
      );
    });
  });

  describe('getUserSocket', () => {
    it('should retrieve socket ID from user ID', async () => {
      mockRedisClient.get.mockResolvedValue('socket-123');

      const socketId = await redisService.getUserSocket('user-123');

      expect(socketId).toBe('socket-123');
      expect(mockRedisClient.get).toHaveBeenCalledWith('user:user-123:socket');
    });

    it('should return null if user has no socket', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const socketId = await redisService.getUserSocket('user-123');

      expect(socketId).toBeNull();
    });
  });

  describe('deleteUserSocket', () => {
    it('should delete user socket mapping', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await redisService.deleteUserSocket('user-123');

      expect(mockRedisClient.del).toHaveBeenCalledWith('user:user-123:socket');
    });
  });

  describe('addUserToRoom', () => {
    it('should add user to room set', async () => {
      mockRedisClient.sadd.mockResolvedValue(1);

      await redisService.addUserToRoom('ROOM01', 'user-123');

      expect(mockRedisClient.sadd).toHaveBeenCalledWith('room:ROOM01:users', 'user-123');
    });
  });

  describe('removeUserFromRoom', () => {
    it('should remove user from room set', async () => {
      mockRedisClient.srem.mockResolvedValue(1);

      await redisService.removeUserFromRoom('ROOM01', 'user-123');

      expect(mockRedisClient.srem).toHaveBeenCalledWith('room:ROOM01:users', 'user-123');
    });
  });

  describe('getRoomUsers', () => {
    it('should retrieve all users in room', async () => {
      const users = ['user-123', 'user-456'];
      mockRedisClient.smembers.mockResolvedValue(users);

      const result = await redisService.getRoomUsers('ROOM01');

      expect(result).toEqual(users);
      expect(mockRedisClient.smembers).toHaveBeenCalledWith('room:ROOM01:users');
    });

    it('should return empty array if no users', async () => {
      mockRedisClient.smembers.mockResolvedValue([]);

      const result = await redisService.getRoomUsers('ROOM01');

      expect(result).toEqual([]);
    });
  });

  describe('getUserRoom', () => {
    it('should retrieve user current room', async () => {
      mockRedisClient.get.mockResolvedValue('ROOM01');

      const roomCode = await redisService.getUserRoom('user-123');

      expect(roomCode).toBe('ROOM01');
      expect(mockRedisClient.get).toHaveBeenCalledWith('user:user-123:room');
    });

    it('should return null if user not in room', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const roomCode = await redisService.getUserRoom('user-123');

      expect(roomCode).toBeNull();
    });
  });

  describe('setUserRoom', () => {
    it('should set user current room', async () => {
      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.setUserRoom('user-123', 'ROOM01');

      expect(mockRedisClient.setex).toHaveBeenCalledWith('user:user-123:room', 3600, 'ROOM01');
    });

    it('should set 1 hour expiry', async () => {
      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.setUserRoom('user-123', 'ROOM01');

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.any(String),
        3600,
        expect.any(String)
      );
    });
  });

  describe('deleteUserRoom', () => {
    it('should delete user room mapping', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await redisService.deleteUserRoom('user-123');

      expect(mockRedisClient.del).toHaveBeenCalledWith('user:user-123:room');
    });
  });

  describe('set', () => {
    it('should set key-value with expiry', async () => {
      mockRedisClient.setex.mockResolvedValue('OK' as any);

      await redisService.set('custom-key', 'custom-value', 300);

      expect(mockRedisClient.setex).toHaveBeenCalledWith('custom-key', 300, 'custom-value');
    });

    it('should set key-value without expiry', async () => {
      mockRedisClient.set.mockResolvedValue('OK' as any);

      await redisService.set('custom-key', 'custom-value');

      expect(mockRedisClient.set).toHaveBeenCalledWith('custom-key', 'custom-value');
    });
  });

  describe('get', () => {
    it('should retrieve value by key', async () => {
      mockRedisClient.get.mockResolvedValue('custom-value');

      const value = await redisService.get('custom-key');

      expect(value).toBe('custom-value');
      expect(mockRedisClient.get).toHaveBeenCalledWith('custom-key');
    });

    it('should return null if key not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const value = await redisService.get('nonexistent-key');

      expect(value).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await redisService.delete('custom-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('custom-key');
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const exists = await redisService.exists('custom-key');

      expect(exists).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('custom-key');
    });

    it('should return false if key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const exists = await redisService.exists('nonexistent-key');

      expect(exists).toBe(false);
    });
  });

  describe('getClient', () => {
    it('should return redis client instance', () => {
      const client = redisService.getClient();

      expect(client).toBeDefined();
      expect(typeof client.get).toBe('function');
    });
  });
});

// Redis Service for managing game state and sessions

import Redis from 'ioredis';
import { GameRoom } from '../types';

class RedisService {
  private client: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('⚠️  Redis connection closed');
      this.isConnected = false;
    });
  }

  // Connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Game Room Management
  async createGameRoom(roomCode: string, player1Id: string): Promise<void> {
    const gameRoom: GameRoom = {
      roomCode,
      player1Id,
      status: 'waiting',
      boards: {},
      playersReady: {},
      gameStats: {},
      createdAt: Date.now(),
    };

    await this.client.setex(
      `room:${roomCode}`,
      3600, // 1 hour expiry
      JSON.stringify(gameRoom)
    );
  }

  async getGameRoom(roomCode: string): Promise<GameRoom | null> {
    const data = await this.client.get(`room:${roomCode}`);
    return data ? JSON.parse(data) : null;
  }

  async updateGameRoom(roomCode: string, gameRoom: GameRoom): Promise<void> {
    await this.client.setex(
      `room:${roomCode}`,
      3600, // 1 hour expiry
      JSON.stringify(gameRoom)
    );
  }

  async deleteGameRoom(roomCode: string): Promise<void> {
    await this.client.del(`room:${roomCode}`);
  }

  async roomExists(roomCode: string): Promise<boolean> {
    const exists = await this.client.exists(`room:${roomCode}`);
    return exists === 1;
  }

  // Socket Session Management
  async setSocketUser(socketId: string, userId: string, email: string): Promise<void> {
    await this.client.setex(
      `socket:${socketId}`,
      86400, // 24 hours
      JSON.stringify({ userId, email })
    );
  }

  async getSocketUser(socketId: string): Promise<{ userId: string; email: string } | null> {
    const data = await this.client.get(`socket:${socketId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSocketUser(socketId: string): Promise<void> {
    await this.client.del(`socket:${socketId}`);
  }

  // User to Socket ID mapping (for finding users)
  async setUserSocket(userId: string, socketId: string): Promise<void> {
    await this.client.setex(`user:${userId}:socket`, 86400, socketId);
  }

  async getUserSocket(userId: string): Promise<string | null> {
    return await this.client.get(`user:${userId}:socket`);
  }

  async deleteUserSocket(userId: string): Promise<void> {
    await this.client.del(`user:${userId}:socket`);
  }

  // Room to Socket mappings
  async addUserToRoom(roomCode: string, userId: string): Promise<void> {
    await this.client.sadd(`room:${roomCode}:users`, userId);
  }

  async removeUserFromRoom(roomCode: string, userId: string): Promise<void> {
    await this.client.srem(`room:${roomCode}:users`, userId);
  }

  async getRoomUsers(roomCode: string): Promise<string[]> {
    return await this.client.smembers(`room:${roomCode}:users`);
  }

  async getUserRoom(userId: string): Promise<string | null> {
    return await this.client.get(`user:${userId}:room`);
  }

  async setUserRoom(userId: string, roomCode: string): Promise<void> {
    await this.client.setex(`user:${userId}:room`, 3600, roomCode);
  }

  async deleteUserRoom(userId: string): Promise<void> {
    await this.client.del(`user:${userId}:room`);
  }

  // General key-value operations
  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (expirySeconds) {
      await this.client.setex(key, expirySeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Cleanup and shutdown
  async disconnect(): Promise<void> {
    await this.client.quit();
  }

  // Get raw client for advanced operations
  getClient(): Redis {
    return this.client;
  }
}

// Export singleton instance
export const redisService = new RedisService();

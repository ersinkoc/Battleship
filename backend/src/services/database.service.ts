// Prisma database service - singleton instance

import { PrismaClient } from '@prisma/client';
import config from '../../prisma/prisma.config';

class DatabaseService {
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  constructor() {
    this.prisma = new PrismaClient({
      ...config,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Handle connection
    this.prisma.$connect()
      .then(() => {
        console.log('✅ Database connected successfully');
        this.isConnected = true;
      })
      .catch((error: Error) => {
        console.error('❌ Database connection failed:', error);
        this.isConnected = false;
      });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await this.disconnect();
    });
  }

  /**
   * Get the Prisma client instance
   */
  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Check if database is connected
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from database
   */
  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    this.isConnected = false;
    console.log('🔌 Database disconnected');
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export const prisma = databaseService.getClient();

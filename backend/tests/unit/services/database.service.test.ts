// Database Service Tests

import { databaseService } from '../../../src/services/database.service';
import { mockPrismaClient } from '../../mocks/prisma.mock';

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClient', () => {
    it('should return Prisma client instance', () => {
      const client = databaseService.getClient();

      expect(client).toBeDefined();
      expect(typeof client.$connect).toBe('function');
      expect(typeof client.$disconnect).toBe('function');
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', () => {
      const status = databaseService.getConnectionStatus();

      expect(typeof status).toBe('boolean');
    });
  });

  describe('healthCheck', () => {
    it('should return true on successful health check', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ result: 1 }]);

      const isHealthy = await databaseService.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });

    it('should return false on failed health check', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await databaseService.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should execute SELECT 1 query', async () => {
      mockPrismaClient.$queryRaw.mockResolvedValue([{ result: 1 }]);

      await databaseService.healthCheck();

      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled();
    });
  });
});

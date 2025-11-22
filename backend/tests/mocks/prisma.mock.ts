// Mock Prisma Client for testing
// Note: @prisma/client is mocked globally in tests/setup.ts
// This file provides access to the mock instance for test assertions

import { PrismaClient } from '@prisma/client';

// Get the mocked Prisma instance
// Since PrismaClient is mocked in setup.ts, this will return the mock
export const mockPrismaClient = new PrismaClient() as any;

export const resetPrismaMocks = () => {
  if (mockPrismaClient.user) {
    Object.values(mockPrismaClient.user).forEach((fn: any) => {
      if (typeof fn?.mockReset === 'function') fn.mockReset();
    });
  }
  if (mockPrismaClient.match) {
    Object.values(mockPrismaClient.match).forEach((fn: any) => {
      if (typeof fn?.mockReset === 'function') fn.mockReset();
    });
  }
  if (typeof mockPrismaClient.$queryRaw?.mockReset === 'function') {
    mockPrismaClient.$queryRaw.mockReset();
  }
};

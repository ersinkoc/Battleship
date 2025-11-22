// Test setup file
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Mock Prisma Client constructor validation for Prisma 7
// This prevents the "adapter or accelerateUrl required" error
jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');

  // Create a mock PrismaClient that doesn't validate constructor options
  class MockPrismaClient {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);
    $queryRaw = jest.fn();
    user = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    match = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    constructor() {
      // Allow construction without validation
    }
  }

  return {
    ...actual,
    PrismaClient: MockPrismaClient,
  };
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

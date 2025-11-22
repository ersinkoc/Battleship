// Mock Prisma Client for testing

export const mockPrismaClient = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  match: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $queryRaw: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient),
  MatchStatus: {
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    ABANDONED: 'ABANDONED',
  },
}));

export const resetPrismaMocks = () => {
  Object.values(mockPrismaClient.user).forEach((fn: any) => fn.mockReset());
  Object.values(mockPrismaClient.match).forEach((fn: any) => fn.mockReset());
  mockPrismaClient.$queryRaw.mockReset();
};

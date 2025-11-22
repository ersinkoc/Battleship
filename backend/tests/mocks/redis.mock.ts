// Mock Redis Client for testing

export const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK'),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn(() => mockRedisClient);
});

export const resetRedisMocks = () => {
  Object.values(mockRedisClient).forEach((fn: any) => {
    if (typeof fn === 'function' && fn.mockReset) {
      fn.mockReset();
    }
  });
};

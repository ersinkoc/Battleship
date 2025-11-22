// Auth Service Tests

import { authService } from '../../../src/services/auth.service';
import { mockPrismaClient, resetPrismaMocks } from '../../mocks/prisma.mock';
import * as passwordUtil from '../../../src/utils/password.util';
import * as jwtUtil from '../../../src/utils/jwt.util';

// Mock the utilities
jest.mock('../../../src/utils/password.util');
jest.mock('../../../src/utils/jwt.util');

describe('AuthService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalShots: 0,
    totalHits: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    resetPrismaMocks();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'Password123',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue(mockUser);
      (passwordUtil.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (jwtUtil.generateToken as jest.Mock).mockReturnValue('jwt-token-123');

      const result = await authService.register(registerData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User registered successfully');
      expect(result.token).toBe('jwt-token-123');
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-123');
      expect(result.user?.email).toBe('test@example.com');
      // Password hash should not be in the sanitized user
      expect((result.user as any)?.passwordHash).toBeUndefined();
    });

    it('should check if user already exists', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'Password123',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.register(registerData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User with this email already exists');
      expect(result.token).toBeUndefined();
      expect(result.user).toBeUndefined();
      expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'PlainPassword123',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue(mockUser);
      (passwordUtil.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (jwtUtil.generateToken as jest.Mock).mockReturnValue('jwt-token-123');

      await authService.register(registerData);

      expect(passwordUtil.hashPassword).toHaveBeenCalledWith('PlainPassword123');
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          passwordHash: 'hashed-password',
        },
      });
    });

    it('should generate JWT token for new user', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue(mockUser);
      (passwordUtil.hashPassword as jest.Mock).mockResolvedValue('hashed-password');
      (jwtUtil.generateToken as jest.Mock).mockReturnValue('jwt-token-123');

      await authService.register(registerData);

      expect(jwtUtil.generateToken).toHaveBeenCalledWith('user-123', 'test@example.com');
    });

    it('should handle registration errors gracefully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await authService.register(registerData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Registration failed');
      expect(result.token).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should login user with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtil.generateToken as jest.Mock).mockReturnValue('jwt-token-123');

      const result = await authService.login(loginData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login successful');
      expect(result.token).toBe('jwt-token-123');
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-123');
      expect((result.user as any)?.passwordHash).toBeUndefined();
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await authService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email or password');
      expect(result.token).toBeUndefined();
      expect(passwordUtil.comparePassword).not.toHaveBeenCalled();
    });

    it('should reject login with incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(false);

      const result = await authService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid email or password');
      expect(result.token).toBeUndefined();
    });

    it('should compare password hash correctly', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'PlainPassword123',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtil.generateToken as jest.Mock).mockReturnValue('jwt-token-123');

      await authService.login(loginData);

      expect(passwordUtil.comparePassword).toHaveBeenCalledWith(
        'PlainPassword123',
        'hashed-password'
      );
    });

    it('should generate JWT token on successful login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);
      (passwordUtil.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtil.generateToken as jest.Mock).mockReturnValue('jwt-token-123');

      await authService.login(loginData);

      expect(jwtUtil.generateToken).toHaveBeenCalledWith('user-123', 'test@example.com');
    });

    it('should handle login errors gracefully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await authService.login(loginData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Login failed');
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const user = await authService.getUserById('user-123');

      expect(user).toBeDefined();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('test@example.com');
      expect((user as any)?.passwordHash).toBeUndefined();
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const user = await authService.getUserById('nonexistent-id');

      expect(user).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

      const user = await authService.getUserById('user-123');

      expect(user).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should retrieve user by email', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const user = await authService.getUserByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('test@example.com');
      expect((user as any)?.passwordHash).toBeUndefined();
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const user = await authService.getUserByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

      const user = await authService.getUserByEmail('test@example.com');

      expect(user).toBeNull();
    });
  });

  describe('updateUserStats', () => {
    it('should update stats for winning user', async () => {
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      await authService.updateUserStats('user-123', true, 50, 17);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          gamesPlayed: { increment: 1 },
          gamesWon: { increment: 1 },
          gamesLost: undefined,
          totalShots: { increment: 50 },
          totalHits: { increment: 17 },
        },
      });
    });

    it('should update stats for losing user', async () => {
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      await authService.updateUserStats('user-123', false, 50, 17);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          gamesPlayed: { increment: 1 },
          gamesWon: undefined,
          gamesLost: { increment: 1 },
          totalShots: { increment: 50 },
          totalHits: { increment: 17 },
        },
      });
    });

    it('should handle update errors gracefully', async () => {
      mockPrismaClient.user.update.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(authService.updateUserStats('user-123', true, 50, 17)).resolves.not.toThrow();
    });

    it('should increment shots and hits correctly', async () => {
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      await authService.updateUserStats('user-123', true, 100, 25);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalShots: { increment: 100 },
            totalHits: { increment: 25 },
          }),
        })
      );
    });
  });
});

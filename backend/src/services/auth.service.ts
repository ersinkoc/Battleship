// Authentication service for user registration and login

import { User } from '@prisma/client';
import { prisma } from './database.service';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { RegisterDTO, LoginDTO, AuthResponse, SafeUser } from '../types';

class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterDTO): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User with this email already exists',
        };
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
        },
      });

      // Generate JWT token
      const token = generateToken(user.id, user.email);

      return {
        success: true,
        message: 'User registered successfully',
        token,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed',
      };
    }
  }

  /**
   * Login a user
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Verify password
      const isPasswordValid = await comparePassword(data.password, user.passwordHash);

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Generate JWT token
      const token = generateToken(user.id, user.email);

      return {
        success: true,
        message: 'Login successful',
        token,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed',
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<SafeUser | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<SafeUser | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      return user ? this.sanitizeUser(user) : null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Update user statistics after a match
   */
  async updateUserStats(
    userId: string,
    won: boolean,
    shots: number,
    hits: number
  ): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          gamesPlayed: { increment: 1 },
          gamesWon: won ? { increment: 1 } : undefined,
          gamesLost: !won ? { increment: 1 } : undefined,
          totalShots: { increment: shots },
          totalHits: { increment: hits },
        },
      });
    } catch (error) {
      console.error('Update user stats error:', error);
    }
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: User): SafeUser {
    const { passwordHash, ...rest } = user;
    return {
      ...rest,
      stats: {
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        gamesLost: user.gamesLost,
        totalShots: user.totalShots,
        totalHits: user.totalHits,
      },
    };
  }
}

// Export singleton instance
export const authService = new AuthService();

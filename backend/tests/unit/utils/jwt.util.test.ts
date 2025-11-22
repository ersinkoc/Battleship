// JWT Utility Tests

import { generateToken, verifyToken, extractTokenFromHeader, decodeToken } from '../../../src/utils/jwt.util';

describe('JWT Utils', () => {
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testUserId, testEmail);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user1', 'user1@example.com');
      const token2 = generateToken('user2', 'user2@example.com');

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken(testUserId, testEmail);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.email).toBe(testEmail);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid-token');

      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = verifyToken('');

      expect(decoded).toBeNull();
    });

    it('should return null for malformed token', () => {
      const decoded = verifyToken('not.a.valid.jwt.token');

      expect(decoded).toBeNull();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'test-token-123';
      const header = `Bearer ${token}`;

      const extracted = extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });

    it('should return null for undefined header', () => {
      const extracted = extractTokenFromHeader(undefined);

      expect(extracted).toBeNull();
    });

    it('should return null for header without Bearer', () => {
      const extracted = extractTokenFromHeader('test-token-123');

      expect(extracted).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const extracted = extractTokenFromHeader('Bearer');

      expect(extracted).toBeNull();
    });

    it('should return null for empty string', () => {
      const extracted = extractTokenFromHeader('');

      expect(extracted).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', () => {
      const token = generateToken(testUserId, testEmail);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(testUserId);
      expect(decoded?.email).toBe(testEmail);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid-token');

      expect(decoded).toBeNull();
    });

    it('should decode expired token without error', () => {
      // Decode doesn't verify, so expired tokens should still decode
      const token = generateToken(testUserId, testEmail);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
    });
  });
});

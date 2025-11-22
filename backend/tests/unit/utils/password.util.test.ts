// Password Utility Tests

import { hashPassword, comparePassword, validatePasswordStrength } from '../../../src/utils/password.util';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty password', async () => {
      const hash = await hashPassword('');

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const isMatch = await comparePassword(password, hash);

      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword456';
      const hash = await hashPassword(password);

      const isMatch = await comparePassword(wrongPassword, hash);

      expect(isMatch).toBe(false);
    });

    it('should return false for empty password against hash', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const isMatch = await comparePassword('', hash);

      expect(isMatch).toBe(false);
    });

    it('should handle case-sensitive passwords', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);

      const isMatch = await comparePassword('testpassword123', hash);

      expect(isMatch).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const result = validatePasswordStrength('StrongPass123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('lowercase123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('UPPERCASE123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumbers');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return multiple errors for weak password', () => {
      const result = validatePasswordStrength('weak');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept password with exactly 8 characters', () => {
      const result = validatePasswordStrength('Valid123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept password with special characters', () => {
      const result = validatePasswordStrength('P@ssw0rd!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

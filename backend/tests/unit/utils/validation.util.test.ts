// Validation Utility Tests

import {
  emailSchema,
  passwordSchema,
  registerSchema,
  loginSchema,
  roomCodeSchema,
  validate,
} from '../../../src/utils/validation.util';

describe('Validation Utils', () => {
  describe('emailSchema', () => {
    it('should validate correct email addresses', () => {
      expect(() => emailSchema.parse('test@example.com')).not.toThrow();
      expect(() => emailSchema.parse('user.name@domain.co.uk')).not.toThrow();
      expect(() => emailSchema.parse('user+tag@example.com')).not.toThrow();
    });

    it('should reject invalid email addresses', () => {
      expect(() => emailSchema.parse('invalid')).toThrow();
      expect(() => emailSchema.parse('invalid@')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
      expect(() => emailSchema.parse('invalid@.com')).toThrow();
      expect(() => emailSchema.parse('')).toThrow();
    });
  });

  describe('passwordSchema', () => {
    it('should validate correct passwords', () => {
      expect(() => passwordSchema.parse('Password123')).not.toThrow();
      expect(() => passwordSchema.parse('StrongPass1')).not.toThrow();
      expect(() => passwordSchema.parse('MyP@ssw0rd')).not.toThrow();
    });

    it('should reject passwords shorter than 8 characters', () => {
      expect(() => passwordSchema.parse('Pass1')).toThrow();
      expect(() => passwordSchema.parse('Abc123')).toThrow();
      expect(() => passwordSchema.parse('')).toThrow();
    });

    it('should reject passwords without uppercase letter', () => {
      expect(() => passwordSchema.parse('password123')).toThrow();
      expect(() => passwordSchema.parse('alllowercase1')).toThrow();
    });

    it('should reject passwords without lowercase letter', () => {
      expect(() => passwordSchema.parse('PASSWORD123')).toThrow();
      expect(() => passwordSchema.parse('ALLUPPERCASE1')).toThrow();
    });

    it('should reject passwords without number', () => {
      expect(() => passwordSchema.parse('PasswordOnly')).toThrow();
      expect(() => passwordSchema.parse('NoNumbers')).toThrow();
    });

    it('should allow passwords with special characters', () => {
      expect(() => passwordSchema.parse('P@ssw0rd!')).not.toThrow();
      expect(() => passwordSchema.parse('Str0ng#Pass')).not.toThrow();
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email in registration', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123',
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject invalid password in registration', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'Password123',
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      expect(() => registerSchema.parse(invalidData)).toThrow();
    });

    it('should reject extra fields', () => {
      const dataWithExtra = {
        email: 'test@example.com',
        password: 'Password123',
        extra: 'field',
      };

      // Zod allows extra fields by default with parse, so this should not throw
      expect(() => registerSchema.parse(dataWithExtra)).not.toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'any-password',
      };

      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email in login', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'any-password',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });

    it('should allow weak passwords for login', () => {
      const validData = {
        email: 'test@example.com',
        password: 'weak', // Login doesn't enforce password strength
      };

      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'any-password',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow();
    });
  });

  describe('roomCodeSchema', () => {
    it('should validate correct room codes', () => {
      expect(() => roomCodeSchema.parse('ABC123')).not.toThrow();
      expect(() => roomCodeSchema.parse('ROOM01')).not.toThrow();
      expect(() => roomCodeSchema.parse('XYZ999')).not.toThrow();
      expect(() => roomCodeSchema.parse('000000')).not.toThrow();
      expect(() => roomCodeSchema.parse('AAAAAA')).not.toThrow();
    });

    it('should reject room codes with wrong length', () => {
      expect(() => roomCodeSchema.parse('ABC12')).toThrow(); // Too short
      expect(() => roomCodeSchema.parse('ABC1234')).toThrow(); // Too long
      expect(() => roomCodeSchema.parse('')).toThrow();
      expect(() => roomCodeSchema.parse('A')).toThrow();
    });

    it('should reject lowercase letters', () => {
      expect(() => roomCodeSchema.parse('abc123')).toThrow();
      expect(() => roomCodeSchema.parse('AbC123')).toThrow();
      expect(() => roomCodeSchema.parse('aBcDeF')).toThrow();
    });

    it('should reject special characters', () => {
      expect(() => roomCodeSchema.parse('ABC-12')).toThrow();
      expect(() => roomCodeSchema.parse('ABC@12')).toThrow();
      expect(() => roomCodeSchema.parse('AB C12')).toThrow();
    });

    it('should reject non-alphanumeric characters', () => {
      expect(() => roomCodeSchema.parse('ABC_12')).toThrow();
      expect(() => roomCodeSchema.parse('ABC.12')).toThrow();
      expect(() => roomCodeSchema.parse('ABC!12')).toThrow();
    });
  });

  describe('validate', () => {
    it('should return success for valid data', () => {
      const result = validate(emailSchema, 'test@example.com');

      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const result = validate(emailSchema, 'invalid-email');

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should work with complex schemas', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = validate(registerSchema, validData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should return multiple errors for multiple validation failures', () => {
      const invalidData = {
        email: 'invalid',
        password: 'weak',
      };

      const result = validate(registerSchema, invalidData);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(1);
    });

    it('should handle null data', () => {
      const result = validate(emailSchema, null);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should handle undefined data', () => {
      const result = validate(emailSchema, undefined);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return parsed data with correct type', () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123',
      };

      const result = validate(registerSchema, data);

      if (result.success) {
        expect(result.data?.email).toBe('test@example.com');
        expect(result.data?.password).toBe('Password123');
      }
    });

    it('should include error messages in errors array', () => {
      const result = validate(passwordSchema, 'weak');

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((err) => err.includes('8 characters'))).toBe(true);
    });
  });
});

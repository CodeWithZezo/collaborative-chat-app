import crypto from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 10000;

export class EncryptionUtil {
  /**
   * Derive encryption key from secret
   */
  private static deriveKey(secret: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  }

  /**
   * Encrypt data
   */
  static encrypt(plaintext: string, secret?: string): string {
    try {
      const encryptionKey = secret || config.jwt.secret;
      const salt = crypto.randomBytes(SALT_LENGTH);
      const iv = crypto.randomBytes(IV_LENGTH);
      const key = this.deriveKey(encryptionKey, salt);

      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine salt, iv, tag, and encrypted data
      const result = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);

      return result.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt data
   */
  static decrypt(encryptedData: string, secret?: string): string {
    try {
      const encryptionKey = secret || config.jwt.secret;
      const buffer = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = buffer.subarray(0, SALT_LENGTH);
      const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

      const key = this.deriveKey(encryptionKey, salt);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hash data (one-way)
   */
  static hash(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Generate random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random string
   */
  static generateRandomString(length: number = 16): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      result += characters[randomBytes[i] % characters.length];
    }

    return result;
  }

  /**
   * Hash file content
   */
  static hashFile(buffer: Buffer, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(buffer).digest('hex');
  }

  /**
   * Generate HMAC signature
   */
  static generateHMAC(data: string, secret?: string, algorithm: string = 'sha256'): string {
    const hmacSecret = secret || config.jwt.secret;
    return crypto.createHmac(algorithm, hmacSecret).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(data: string, signature: string, secret?: string, algorithm: string = 'sha256'): boolean {
    const expectedSignature = this.generateHMAC(data, secret, algorithm);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Encrypt JSON object
   */
  static encryptJSON<T>(data: T, secret?: string): string {
    const jsonString = JSON.stringify(data);
    return this.encrypt(jsonString, secret);
  }

  /**
   * Decrypt JSON object
   */
  static decryptJSON<T>(encryptedData: string, secret?: string): T {
    const jsonString = this.decrypt(encryptedData, secret);
    return JSON.parse(jsonString) as T;
  }

  /**
   * Generate UUID v4
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Compare two strings in constant time (prevent timing attacks)
   */
  static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return crypto.timingSafeEqual(bufferA, bufferB);
  }
}

export const {
  encrypt,
  decrypt,
  hash,
  generateToken,
  generateRandomString,
  hashFile,
  generateHMAC,
  verifyHMAC,
  encryptJSON,
  decryptJSON,
  generateUUID,
  constantTimeCompare,
} = EncryptionUtil;

export default EncryptionUtil;
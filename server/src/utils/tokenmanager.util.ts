import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../config/jwt.config';
import { redisManager } from '../config/redis.config';
import { JWTPayload } from '../config/jwt.config';
import logger from '../config/logger.config';

const REFRESH_TOKEN_PREFIX = 'refresh_token:';
const BLACKLIST_PREFIX = 'blacklist:';
const TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

export class TokenManager {
  /**
   * Generate access and refresh tokens for a user
   */
  static async generateTokens(payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      // Store refresh token in Redis with user ID as key
      await redisManager.set(
        `${REFRESH_TOKEN_PREFIX}${payload.userId}`,
        refreshToken,
        30 * 24 * 60 * 60 // 30 days
      );

      logger.info('Tokens generated successfully', { userId: payload.userId });

      return { accessToken, refreshToken };
    } catch (error) {
      logger.error('Failed to generate tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: payload.userId,
      });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify access token
   */
  static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const payload = verifyAccessToken(token);
      return payload;
    } catch (error) {
      logger.warn('Token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // Verify refresh token
      const payload = verifyRefreshToken(refreshToken);

      // Check if stored refresh token matches
      const storedToken = await redisManager.get(`${REFRESH_TOKEN_PREFIX}${payload.userId}`);

      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens({
        userId: payload.userId,
        email: payload.email,
        username: payload.username,
        role: payload.role,
      });

      logger.info('Access token refreshed', { userId: payload.userId });

      return tokens;
    } catch (error) {
      logger.error('Failed to refresh access token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Revoke user's refresh token (logout)
   */
  static async revokeRefreshToken(userId: string): Promise<void> {
    try {
      await redisManager.delete(`${REFRESH_TOKEN_PREFIX}${userId}`);
      logger.info('Refresh token revoked', { userId });
    } catch (error) {
      logger.error('Failed to revoke refresh token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Token revocation failed');
    }
  }

  /**
   * Blacklist an access token (for immediate logout)
   */
  static async blacklistToken(token: string, expirySeconds: number = TOKEN_EXPIRY): Promise<void> {
    try {
      await redisManager.set(`${BLACKLIST_PREFIX}${token}`, 'true', expirySeconds);
      logger.info('Token blacklisted');
    } catch (error) {
      logger.error('Failed to blacklist token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if token is blacklisted
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await redisManager.exists(`${BLACKLIST_PREFIX}${token}`);
      return result;
    } catch (error) {
      logger.error('Failed to check token blacklist', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Revoke all tokens for a user (security measure)
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      await this.revokeRefreshToken(userId);
      logger.info('All user tokens revoked', { userId });
    } catch (error) {
      logger.error('Failed to revoke all user tokens', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw new Error('Token revocation failed');
    }
  }

  /**
   * Store temporary token (e.g., email verification, password reset)
   */
  static async storeTemporaryToken(
    type: 'email_verification' | 'password_reset',
    userId: string,
    token: string,
    expiryMinutes: number = 60
  ): Promise<void> {
    try {
      await redisManager.set(`${type}:${userId}`, token, expiryMinutes * 60);
      logger.info('Temporary token stored', { type, userId });
    } catch (error) {
      logger.error('Failed to store temporary token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        userId,
      });
      throw new Error('Failed to store token');
    }
  }

  /**
   * Verify temporary token
   */
  static async verifyTemporaryToken(
    type: 'email_verification' | 'password_reset',
    userId: string,
    token: string
  ): Promise<boolean> {
    try {
      const storedToken = await redisManager.get(`${type}:${userId}`);
      return storedToken === token;
    } catch (error) {
      logger.error('Failed to verify temporary token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        userId,
      });
      return false;
    }
  }

  /**
   * Delete temporary token
   */
  static async deleteTemporaryToken(
    type: 'email_verification' | 'password_reset',
    userId: string
  ): Promise<void> {
    try {
      await redisManager.delete(`${type}:${userId}`);
      logger.info('Temporary token deleted', { type, userId });
    } catch (error) {
      logger.error('Failed to delete temporary token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        userId,
      });
    }
  }
}

export const {
  generateTokens,
  verifyToken,
  refreshAccessToken,
  revokeRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
  revokeAllUserTokens,
  storeTemporaryToken,
  verifyTemporaryToken,
  deleteTemporaryToken,
} = TokenManager;

export default TokenManager;
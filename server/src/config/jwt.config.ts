import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from './logger.config';

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// JWT configuration
export const jwtConfig = {
  accessToken: {
    secret: config.jwt.secret,
    expiresIn: config.jwt.expiresIn,
  },
  refreshToken: {
    secret: config.jwt.refreshSecret,
    expiresIn: config.jwt.refreshExpiresIn,
  },
};

// Token generation utilities
export const generateAccessToken = (payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string => {
  try {
    const token = jwt.sign(
      { ...payload, type: 'access' },
      jwtConfig.accessToken.secret,
      {
        expiresIn: jwtConfig.accessToken.expiresIn,
        issuer: config.app.name,
        audience: config.app.name,
      }
    );

    logger.debug('Access token generated', { userId: payload.userId });
    return token;
  } catch (error) {
    logger.error('Failed to generate access token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: payload.userId,
    });
    throw new Error('Token generation failed');
  }
};

export const generateRefreshToken = (payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string => {
  try {
    const token = jwt.sign(
      { ...payload, type: 'refresh' },
      jwtConfig.refreshToken.secret,
      {
        expiresIn: jwtConfig.refreshToken.expiresIn,
        issuer: config.app.name,
        audience: config.app.name,
      }
    );

    logger.debug('Refresh token generated', { userId: payload.userId });
    return token;
  } catch (error) {
    logger.error('Failed to generate refresh token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: payload.userId,
    });
    throw new Error('Token generation failed');
  }
};

// Token verification utilities
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, jwtConfig.accessToken.secret, {
      issuer: config.app.name,
      audience: config.app.name,
    }) as JWTPayload;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Access token expired', { token: token.substring(0, 20) + '...' });
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token', { error: error.message });
      throw new Error('Invalid token');
    }
    throw error;
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, jwtConfig.refreshToken.secret, {
      issuer: config.app.name,
      audience: config.app.name,
    }) as JWTPayload;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Refresh token expired', { token: token.substring(0, 20) + '...' });
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid refresh token', { error: error.message });
      throw new Error('Invalid token');
    }
    throw error;
  }
};

// Decode token without verification (for debugging)
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    logger.error('Failed to decode token', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

// Get token expiry time
export const getTokenExpiryTime = (token: string): Date | null => {
  const decoded = decodeToken(token);
  if (decoded?.exp) {
    return new Date(decoded.exp * 1000);
  }
  return null;
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  const expiryTime = getTokenExpiryTime(token);
  if (!expiryTime) {
    return true;
  }
  return expiryTime < new Date();
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiryTime,
  isTokenExpired,
};
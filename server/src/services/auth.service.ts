import userRepository from '../repositories/user.repository';
import { User, UserStatus } from '../models/user.model';
import { TokenManager } from '../utils/tokenManager.util';
import { EncryptionUtil } from '../utils/encryption.util';
import logger from '../config/logger.config';
import { AuthenticationError, ConflictError, ValidationError } from '../middlewares/error.middleware';
import { addAuditLogJob } from '../config/queue.config';
import { AuditAction, AuditSeverity } from '../models/audit.model';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginData {
  identifier: string; // email or username
  password: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{
    user: Partial<User>;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    try {
      // Check if email already exists
      const emailExists = await userRepository.emailExists(data.email);
      if (emailExists) {
        throw new ConflictError('Email already registered');
      }

      // Check if username already exists
      const usernameExists = await userRepository.usernameExists(data.username);
      if (usernameExists) {
        throw new ConflictError('Username already taken');
      }

      // Generate email verification token
      const emailVerificationToken = EncryptionUtil.generateToken();

      // Create user
      const user = await userRepository.create({
        username: data.username,
        email: data.email,
        password: data.password, // Will be hashed by entity hook
        firstName: data.firstName,
        lastName: data.lastName,
        emailVerificationToken,
        status: UserStatus.PENDING,
      });

      // Generate tokens
      const tokens = await TokenManager.generateTokens({
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      // Store email verification token in Redis
      await TokenManager.storeTemporaryToken('email_verification', user.id, emailVerificationToken, 24 * 60);

      // Log audit
      await addAuditLogJob({
        userId: user.id,
        action: AuditAction.USER_CREATED,
        resourceType: 'user',
        resourceId: user.id,
        details: { email: user.email, username: user.username },
      });

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      // Remove sensitive data
      const { password, refreshToken, ...userWithoutSensitive } = user;

      return { user: userWithoutSensitive, tokens };
    } catch (error) {
      logger.error('Registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginData, ip?: string): Promise<{
    user: Partial<User>;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    try {
      // Find user by email or username
      const user = await userRepository.findByEmailOrUsername(data.identifier);

      if (!user) {
        // Log failed login attempt
        await addAuditLogJob({
          action: AuditAction.LOGIN_FAILED,
          resourceType: 'user',
          resourceId: 'unknown',
          details: { identifier: data.identifier, reason: 'User not found' },
        });

        throw new AuthenticationError('Invalid credentials');
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        await addAuditLogJob({
          userId: user.id,
          action: AuditAction.ACCESS_DENIED,
          resourceType: 'user',
          resourceId: user.id,
          details: { reason: 'Account locked' },
        });

        throw new AuthenticationError('Account is locked. Please try again later.');
      }

      // Check if account is active
      if (user.status === UserStatus.SUSPENDED) {
        throw new AuthenticationError('Account has been suspended');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(data.password);

      if (!isPasswordValid) {
        // Increment failed login attempts
        await userRepository.incrementFailedLoginAttempts(user.id);

        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 4) {
          await userRepository.lockAccount(user.id, 30 * 60 * 1000); // Lock for 30 minutes
          
          await addAuditLogJob({
            userId: user.id,
            action: AuditAction.ACCOUNT_LOCKED,
            resourceType: 'user',
            resourceId: user.id,
            details: { reason: 'Too many failed login attempts' },
          });
        }

        await addAuditLogJob({
          userId: user.id,
          action: AuditAction.LOGIN_FAILED,
          resourceType: 'user',
          resourceId: user.id,
          details: { reason: 'Invalid password' },
        });

        throw new AuthenticationError('Invalid credentials');
      }

      // Reset failed login attempts on successful login
      await userRepository.resetFailedLoginAttempts(user.id);

      // Update last login
      await userRepository.updateLastLogin(user.id, ip);

      // Update online status
      await userRepository.updateOnlineStatus(user.id, true);

      // Generate tokens
      const tokens = await TokenManager.generateTokens({
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      // Log successful login
      await addAuditLogJob({
        userId: user.id,
        action: AuditAction.LOGIN_SUCCESS,
        resourceType: 'user',
        resourceId: user.id,
        details: { ip },
      });

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      // Remove sensitive data
      const { password, refreshToken, ...userWithoutSensitive } = user;

      return { user: userWithoutSensitive, tokens };
    } catch (error) {
      logger.error('Login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, token: string): Promise<void> {
    try {
      // Revoke refresh token
      await TokenManager.revokeRefreshToken(userId);

      // Blacklist access token
      await TokenManager.blacklistToken(token);

      // Update online status
      await userRepository.updateOnlineStatus(userId, false);

      // Log logout
      await addAuditLogJob({
        userId,
        action: AuditAction.LOGOUT,
        resourceType: 'user',
        resourceId: userId,
      });

      logger.info('User logged out successfully', { userId });
    } catch (error) {
      logger.error('Logout failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const tokens = await TokenManager.refreshAccessToken(refreshToken);
      logger.info('Access token refreshed');
      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(userId: string, token: string): Promise<void> {
    try {
      // Verify token
      const isValid = await TokenManager.verifyTemporaryToken('email_verification', userId, token);

      if (!isValid) {
        throw new ValidationError('Invalid or expired verification token');
      }

      // Update user
      await userRepository.verifyEmail(userId);
      await userRepository.update(userId, { status: UserStatus.ACTIVE });

      // Delete verification token
      await TokenManager.deleteTemporaryToken('email_verification', userId);

      logger.info('Email verified successfully', { userId });
    } catch (error) {
      logger.error('Email verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await userRepository.findByEmail(email);

      if (!user) {
        // Don't reveal if email exists
        logger.warn('Password reset requested for non-existent email', { email });
        return;
      }

      // Generate reset token
      const resetToken = EncryptionUtil.generateToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store in database
      await userRepository.update(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      // Store in Redis
      await TokenManager.storeTemporaryToken('password_reset', user.id, resetToken, 60);

      // Log audit
      await addAuditLogJob({
        userId: user.id,
        action: AuditAction.PASSWORD_RESET_REQUESTED,
        resourceType: 'user',
        resourceId: user.id,
      });

      logger.info('Password reset requested', { userId: user.id });

      // TODO: Send email with reset link (via email queue)
    } catch (error) {
      logger.error('Password reset request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(userId: string, token: string, newPassword: string): Promise<void> {
    try {
      // Verify token
      const isValid = await TokenManager.verifyTemporaryToken('password_reset', userId, token);

      if (!isValid) {
        throw new ValidationError('Invalid or expired reset token');
      }

      // Update password
      await userRepository.updatePassword(userId, newPassword);

      // Delete reset token
      await TokenManager.deleteTemporaryToken('password_reset', userId);

      // Revoke all existing tokens for security
      await TokenManager.revokeAllUserTokens(userId);

      // Log audit
      await addAuditLogJob({
        userId,
        action: AuditAction.PASSWORD_RESET_COMPLETED,
        resourceType: 'user',
        resourceId: userId,
      });

      logger.info('Password reset successfully', { userId });
    } catch (error) {
      logger.error('Password reset failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isValid = await user.comparePassword(currentPassword);

      if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Update password
      await userRepository.updatePassword(userId, newPassword);

      // Revoke all existing tokens
      await TokenManager.revokeAllUserTokens(userId);

      // Log audit
      await addAuditLogJob({
        userId,
        action: AuditAction.PASSWORD_CHANGED,
        resourceType: 'user',
        resourceId: userId,
      });

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Password change failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
      });
      throw error;
    }
  }

  /**
   * Verify token validity
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      await TokenManager.verifyToken(token);
      return true;
    } catch {
      return false;
    }
  }
}

export default new AuthService();
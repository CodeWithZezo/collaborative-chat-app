import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { Request } from 'express';
import { config } from '../config';
import { EncryptionUtil } from './encryption.util';
import logger from '../config/logger.config';

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

export class FileUploadUtil {
  /**
   * Configure multer storage
   */
  private static getStorage(): multer.StorageEngine {
    return multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(config.upload.uploadPath, this.getUploadFolder(file.mimetype));

        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          logger.error('Failed to create upload directory', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          cb(new Error('Failed to create upload directory'), '');
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${EncryptionUtil.generateRandomString(8)}`;
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
      },
    });
  }

  /**
   * Get upload folder based on mime type
   */
  private static getUploadFolder(mimeType: string): string {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return 'images';
    } else if (ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      return 'videos';
    } else if (ALLOWED_AUDIO_TYPES.includes(mimeType)) {
      return 'audio';
    } else if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) {
      return 'documents';
    } else {
      return 'others';
    }
  }

  /**
   * File filter
   */
  private static fileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
    const allowedTypes = [
      ...ALLOWED_IMAGE_TYPES,
      ...ALLOWED_VIDEO_TYPES,
      ...ALLOWED_AUDIO_TYPES,
      ...ALLOWED_DOCUMENT_TYPES,
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  }

  /**
   * Create multer instance
   */
  static createUploadMiddleware(fieldName: string = 'file', maxCount: number = 1): multer.Multer {
    return multer({
      storage: this.getStorage(),
      fileFilter: this.fileFilter,
      limits: {
        fileSize: config.upload.maxFileSize,
        files: maxCount,
      },
    });
  }

  /**
   * Upload single file
   */
  static uploadSingle(fieldName: string = 'file'): multer.Multer {
    return this.createUploadMiddleware(fieldName, 1);
  }

  /**
   * Upload multiple files
   */
  static uploadMultiple(fieldName: string = 'files', maxCount: number = 10): multer.Multer {
    return this.createUploadMiddleware(fieldName, maxCount);
  }

  /**
   * Delete file
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info('File deleted successfully', { filePath });
    } catch (error) {
      logger.error('Failed to delete file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
      });
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get file size in bytes
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      logger.error('Failed to get file size', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
      });
      throw new Error('Failed to get file size');
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Get file extension
   */
  static getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Validate file type
   */
  static isValidFileType(mimeType: string, allowedTypes?: string[]): boolean {
    const defaultAllowed = [
      ...ALLOWED_IMAGE_TYPES,
      ...ALLOWED_VIDEO_TYPES,
      ...ALLOWED_AUDIO_TYPES,
      ...ALLOWED_DOCUMENT_TYPES,
    ];

    const types = allowedTypes || defaultAllowed;
    return types.includes(mimeType);
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueSuffix = `${Date.now()}-${EncryptionUtil.generateRandomString(8)}`;
    return `${sanitizedName}-${uniqueSuffix}${ext}`;
  }

  /**
   * Create directory if not exists
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create directory', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dirPath,
      });
      throw new Error('Failed to create directory');
    }
  }

  /**
   * Get file MIME type from extension
   */
  static getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      // Images
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      // Videos
      '.mp4': 'video/mp4',
      '.mpeg': 'video/mpeg',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      // Audio
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      // Documents
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Read file buffer
   */
  static async readFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      logger.error('Failed to read file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
      });
      throw new Error('Failed to read file');
    }
  }

  /**
   * Copy file
   */
  static async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await fs.copyFile(sourcePath, destinationPath);
      logger.info('File copied successfully', { sourcePath, destinationPath });
    } catch (error) {
      logger.error('Failed to copy file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourcePath,
        destinationPath,
      });
      throw new Error('Failed to copy file');
    }
  }

  /**
   * Move file
   */
  static async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await fs.rename(sourcePath, destinationPath);
      logger.info('File moved successfully', { sourcePath, destinationPath });
    } catch (error) {
      logger.error('Failed to move file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sourcePath,
        destinationPath,
      });
      throw new Error('Failed to move file');
    }
  }
}

export const {
  createUploadMiddleware,
  uploadSingle,
  uploadMultiple,
  deleteFile,
  getFileSize,
  fileExists,
  formatFileSize,
  getFileExtension,
  isValidFileType,
  generateUniqueFilename,
  ensureDirectory,
  getMimeTypeFromExtension,
  readFile,
  copyFile,
  moveFile,
} = FileUploadUtil;

export default FileUploadUtil;
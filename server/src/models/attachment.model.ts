import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Message } from './message.model';
import { User } from './user.model';

export enum AttachmentType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

@Entity('attachments')
@Index(['message'])
@Index(['uploadedBy'])
@Index(['type'])
export class Attachment extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'original_name' })
  originalName: string;

  @Column({ type: 'varchar', length: 255, name: 'stored_name' })
  storedName: string;

  @Column({ type: 'varchar', length: 500, name: 'file_path' })
  filePath: string;

  @Column({ type: 'varchar', length: 500, name: 'file_url' })
  fileUrl: string;

  @Column({
    type: 'enum',
    enum: AttachmentType,
  })
  type: AttachmentType;

  @Column({ type: 'varchar', length: 100, name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'bigint', name: 'file_size' })
  fileSize: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'thumbnail_url' })
  thumbnailUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    codec?: string;
    bitrate?: number;
    pages?: number;
  };

  @Column({ type: 'boolean', default: false, name: 'is_scanned' })
  isScanned: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_safe' })
  isSafe: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'scanned_at' })
  scannedAt?: Date;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'file_hash' })
  fileHash?: string;

  @Column({ type: 'int', default: 0, name: 'download_count' })
  downloadCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_downloaded_at' })
  lastDownloadedAt?: Date;

  // Relationships
  @ManyToOne(() => Message, (message) => message.attachments, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  @Column({ name: 'message_id' })
  messageId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by_id' })
  uploadedById: string;

  // Methods
  incrementDownloadCount(): void {
    this.downloadCount += 1;
    this.lastDownloadedAt = new Date();
  }

  getFileSizeFormatted(): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = this.fileSize;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  isImage(): boolean {
    return this.type === AttachmentType.IMAGE;
  }

  isVideo(): boolean {
    return this.type === AttachmentType.VIDEO;
  }

  isAudio(): boolean {
    return this.type === AttachmentType.AUDIO;
  }

  isDocument(): boolean {
    return this.type === AttachmentType.DOCUMENT;
  }

  getFileExtension(): string {
    return this.originalName.split('.').pop()?.toLowerCase() || '';
  }

  needsVirusScanning(): boolean {
    return !this.isScanned;
  }

  static determineAttachmentType(mimeType: string): AttachmentType {
    if (mimeType.startsWith('image/')) {
      return AttachmentType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return AttachmentType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      return AttachmentType.AUDIO;
    } else if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('text')
    ) {
      return AttachmentType.DOCUMENT;
    } else if (
      mimeType.includes('zip') ||
      mimeType.includes('rar') ||
      mimeType.includes('tar') ||
      mimeType.includes('gz')
    ) {
      return AttachmentType.ARCHIVE;
    } else {
      return AttachmentType.OTHER;
    }
  }
}
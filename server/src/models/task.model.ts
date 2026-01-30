import { Entity, Column, Index, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.model';
import { Channel } from './channel.model';
import { Message } from './message.model';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
@Index(['status'])
@Index(['priority'])
@Index(['assignedTo'])
@Index(['createdBy'])
@Index(['dueDate'])
@Index(['channel'])
export class Task extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({ type: 'timestamp', nullable: true, name: 'due_date' })
  dueDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'start_date' })
  startDate?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt?: Date;

  @Column({ type: 'int', default: 0, name: 'estimated_hours' })
  estimatedHours: number;

  @Column({ type: 'int', default: 0, name: 'actual_hours' })
  actualHours: number;

  @Column({ type: 'int', default: 0, name: 'progress_percentage' })
  progressPercentage: number;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  checklist?: {
    id: string;
    text: string;
    completed: boolean;
    completedAt?: Date;
  }[];

  @Column({ type: 'jsonb', nullable: true })
  customFields?: Record<string, unknown>;

  @Column({ type: 'boolean', default: false, name: 'is_archived' })
  isArchived: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_recurring' })
  isRecurring: boolean;

  @Column({ type: 'jsonb', nullable: true, name: 'recurrence_pattern' })
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
  };

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'parent_task_id' })
  parentTaskId?: string;

  @Column({ type: 'int', default: 0, name: 'subtask_count' })
  subtaskCount: number;

  // Relationships
  @ManyToOne(() => User, (user) => user.createdTasks, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @ManyToOne(() => User, (user) => user.assignedTasks, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @Column({ name: 'assigned_to_id', nullable: true })
  assignedToId?: string;

  @ManyToOne(() => Channel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'channel_id' })
  channel?: Channel;

  @Column({ name: 'channel_id', nullable: true })
  channelId?: string;

  @ManyToOne(() => Message, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'related_message_id' })
  relatedMessage?: Message;

  @Column({ name: 'related_message_id', nullable: true })
  relatedMessageId?: string;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'task_watchers',
    joinColumn: { name: 'task_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  watchers: User[];

  // Methods
  updateStatus(newStatus: TaskStatus): void {
    this.status = newStatus;

    if (newStatus === TaskStatus.DONE) {
      this.completedAt = new Date();
      this.progressPercentage = 100;
    }

    if (newStatus === TaskStatus.IN_PROGRESS && !this.startDate) {
      this.startDate = new Date();
    }
  }

  updateProgress(percentage: number): void {
    this.progressPercentage = Math.min(100, Math.max(0, percentage));

    if (this.progressPercentage === 100 && this.status !== TaskStatus.DONE) {
      this.updateStatus(TaskStatus.DONE);
    }
  }

  isOverdue(): boolean {
    if (!this.dueDate || this.status === TaskStatus.DONE || this.status === TaskStatus.CANCELLED) {
      return false;
    }
    return new Date() > this.dueDate;
  }

  addChecklistItem(text: string): void {
    if (!this.checklist) {
      this.checklist = [];
    }

    this.checklist.push({
      id: `checklist-${Date.now()}`,
      text,
      completed: false,
    });
  }

  toggleChecklistItem(itemId: string): void {
    if (!this.checklist) {
      return;
    }

    const item = this.checklist.find((i) => i.id === itemId);
    if (item) {
      item.completed = !item.completed;
      item.completedAt = item.completed ? new Date() : undefined;

      this.updateProgressFromChecklist();
    }
  }

  private updateProgressFromChecklist(): void {
    if (!this.checklist || this.checklist.length === 0) {
      return;
    }

    const completedItems = this.checklist.filter((item) => item.completed).length;
    this.progressPercentage = Math.round((completedItems / this.checklist.length) * 100);
  }

  getDaysUntilDue(): number | null {
    if (!this.dueDate) {
      return null;
    }

    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getPriorityScore(): number {
    const priorityScores = {
      [TaskPriority.LOW]: 1,
      [TaskPriority.MEDIUM]: 2,
      [TaskPriority.HIGH]: 3,
      [TaskPriority.URGENT]: 4,
    };

    let score = priorityScores[this.priority];

    // Increase score if overdue
    if (this.isOverdue()) {
      score += 2;
    }

    // Increase score based on days until due
    const daysUntilDue = this.getDaysUntilDue();
    if (daysUntilDue !== null && daysUntilDue <= 3) {
      score += 1;
    }

    return score;
  }
}
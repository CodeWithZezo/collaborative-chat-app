import { format, parse, addDays, addHours, addMinutes, subDays, isAfter, isBefore, differenceInDays, differenceInHours, differenceInMinutes, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export class DateHelper {
  /**
   * Format date to string
   */
  static formatDate(date: Date | string, formatString: string = 'yyyy-MM-dd HH:mm:ss'): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatString);
  }

  /**
   * Parse date string to Date object
   */
  static parseDate(dateString: string, formatString: string = 'yyyy-MM-dd'): Date {
    return parse(dateString, formatString, new Date());
  }

  /**
   * Get current timestamp
   */
  static now(): Date {
    return new Date();
  }

  /**
   * Get current timestamp in ISO format
   */
  static nowISO(): string {
    return new Date().toISOString();
  }

  /**
   * Get current Unix timestamp (seconds)
   */
  static nowUnix(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Add days to date
   */
  static addDays(date: Date | string, days: number): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return addDays(dateObj, days);
  }

  /**
   * Add hours to date
   */
  static addHours(date: Date | string, hours: number): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return addHours(dateObj, hours);
  }

  /**
   * Add minutes to date
   */
  static addMinutes(date: Date | string, minutes: number): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return addMinutes(dateObj, minutes);
  }

  /**
   * Subtract days from date
   */
  static subtractDays(date: Date | string, days: number): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return subDays(dateObj, days);
  }

  /**
   * Check if date is after another date
   */
  static isAfter(date: Date | string, dateToCompare: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const compareObj = typeof dateToCompare === 'string' ? new Date(dateToCompare) : dateToCompare;
    return isAfter(dateObj, compareObj);
  }

  /**
   * Check if date is before another date
   */
  static isBefore(date: Date | string, dateToCompare: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const compareObj = typeof dateToCompare === 'string' ? new Date(dateToCompare) : dateToCompare;
    return isBefore(dateObj, compareObj);
  }

  /**
   * Get difference in days between two dates
   */
  static getDaysDifference(date1: Date | string, date2: Date | string): number {
    const dateObj1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const dateObj2 = typeof date2 === 'string' ? new Date(date2) : date2;
    return differenceInDays(dateObj1, dateObj2);
  }

  /**
   * Get difference in hours between two dates
   */
  static getHoursDifference(date1: Date | string, date2: Date | string): number {
    const dateObj1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const dateObj2 = typeof date2 === 'string' ? new Date(date2) : date2;
    return differenceInHours(dateObj1, dateObj2);
  }

  /**
   * Get difference in minutes between two dates
   */
  static getMinutesDifference(date1: Date | string, date2: Date | string): number {
    const dateObj1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const dateObj2 = typeof date2 === 'string' ? new Date(date2) : date2;
    return differenceInMinutes(dateObj1, dateObj2);
  }

  /**
   * Get start of day
   */
  static getStartOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return startOfDay(dateObj);
  }

  /**
   * Get end of day
   */
  static getEndOfDay(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return endOfDay(dateObj);
  }

  /**
   * Get start of week
   */
  static getStartOfWeek(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return startOfWeek(dateObj);
  }

  /**
   * Get end of week
   */
  static getEndOfWeek(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return endOfWeek(dateObj);
  }

  /**
   * Get start of month
   */
  static getStartOfMonth(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return startOfMonth(dateObj);
  }

  /**
   * Get end of month
   */
  static getEndOfMonth(date: Date | string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return endOfMonth(dateObj);
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date: Date | string): boolean {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj > new Date();
  }

  /**
   * Get time ago string (e.g., "2 hours ago")
   */
  static getTimeAgo(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }

    const years = Math.floor(days / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }

  /**
   * Get human-readable time until date
   */
  static getTimeUntil(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const seconds = Math.floor((dateObj.getTime() - now.getTime()) / 1000);

    if (seconds < 0) {
      return 'overdue';
    }

    if (seconds < 60) {
      return 'less than a minute';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }

    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''}`;
  }

  /**
   * Convert date to ISO string
   */
  static toISO(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toISOString();
  }

  /**
   * Convert Unix timestamp to Date
   */
  static fromUnix(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  /**
   * Convert Date to Unix timestamp
   */
  static toUnix(date: Date | string): number {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return Math.floor(dateObj.getTime() / 1000);
  }
}

export const {
  formatDate,
  parseDate,
  now,
  nowISO,
  nowUnix,
  addDays: addDaysHelper,
  addHours: addHoursHelper,
  addMinutes: addMinutesHelper,
  subtractDays,
  isAfter: isAfterHelper,
  isBefore: isBeforeHelper,
  getDaysDifference,
  getHoursDifference,
  getMinutesDifference,
  getStartOfDay,
  getEndOfDay,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  isToday,
  isPast,
  isFuture,
  getTimeAgo,
  getTimeUntil,
  toISO,
  fromUnix,
  toUnix,
} = DateHelper;

export default DateHelper;
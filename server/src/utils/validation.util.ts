export class ValidationUtil {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
   */
  static isStrongPassword(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Validate username format (alphanumeric, underscore, hyphen, 3-30 characters)
   */
  static isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  }

  /**
   * Validate phone number (basic international format)
   */
  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate hex color code
   */
  static isValidHexColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  }

  /**
   * Validate IP address (IPv4)
   */
  static isValidIPv4(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * Validate date string (YYYY-MM-DD)
   */
  static isValidDate(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Validate time string (HH:MM or HH:MM:SS)
   */
  static isValidTime(timeString: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    return timeRegex.test(timeString);
  }

  /**
   * Validate alphanumeric string
   */
  static isAlphanumeric(str: string): boolean {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(str);
  }

  /**
   * Validate string length
   */
  static isValidLength(str: string, min: number, max: number): boolean {
    return str.length >= min && str.length <= max;
  }

  /**
   * Validate number range
   */
  static isInRange(num: number, min: number, max: number): boolean {
    return num >= min && num <= max;
  }

  /**
   * Validate array length
   */
  static isValidArrayLength<T>(arr: T[], min: number, max: number): boolean {
    return arr.length >= min && arr.length <= max;
  }

  /**
   * Sanitize string (remove special characters)
   */
  static sanitizeString(str: string): string {
    return str.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  /**
   * Trim and normalize whitespace
   */
  static normalizeWhitespace(str: string): string {
    return str.trim().replace(/\s+/g, ' ');
  }

  /**
   * Check if string is empty or only whitespace
   */
  static isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
  }

  /**
   * Validate file extension
   */
  static hasValidExtension(filename: string, allowedExtensions: string[]): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? allowedExtensions.includes(ext) : false;
  }

  /**
   * Validate file size
   */
  static isValidFileSize(sizeInBytes: number, maxSizeInMB: number): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return sizeInBytes <= maxSizeInBytes;
  }

  /**
   * Validate JSON string
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate credit card number (Luhn algorithm)
   */
  static isValidCreditCard(cardNumber: string): boolean {
    const sanitized = cardNumber.replace(/\s/g, '');

    if (!/^\d{13,19}$/.test(sanitized)) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate postal/zip code (US format)
   */
  static isValidUSZipCode(zipCode: string): boolean {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    return zipRegex.test(zipCode);
  }

  /**
   * Check if value is null or undefined
   */
  static isNullOrUndefined(value: unknown): value is null | undefined {
    return value === null || value === undefined;
  }

  /**
   * Check if object has required properties
   */
  static hasRequiredProperties<T extends object>(obj: T, requiredProps: (keyof T)[]): boolean {
    return requiredProps.every((prop) => prop in obj && !this.isNullOrUndefined(obj[prop]));
  }

  /**
   * Validate mention format (@username)
   */
  static isValidMention(mention: string): boolean {
    const mentionRegex = /^@[a-zA-Z0-9_-]{3,30}$/;
    return mentionRegex.test(mention);
  }

  /**
   * Extract mentions from text
   */
  static extractMentions(text: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9_-]{3,30})/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map((m) => m.substring(1)) : [];
  }

  /**
   * Validate channel name format
   */
  static isValidChannelName(name: string): boolean {
    const channelRegex = /^[a-zA-Z0-9_-]{2,50}$/;
    return channelRegex.test(name);
  }

  /**
   * Check if value is a positive integer
   */
  static isPositiveInteger(value: number): boolean {
    return Number.isInteger(value) && value > 0;
  }

  /**
   * Check if value is a non-negative integer
   */
  static isNonNegativeInteger(value: number): boolean {
    return Number.isInteger(value) && value >= 0;
  }

  /**
   * Validate enum value
   */
  static isValidEnumValue<T extends Record<string, string>>(value: string, enumObj: T): boolean {
    return Object.values(enumObj).includes(value);
  }

  /**
   * Check if string contains only digits
   */
  static isNumericString(str: string): boolean {
    return /^\d+$/.test(str);
  }

  /**
   * Validate password confirmation
   */
  static passwordsMatch(password: string, confirmPassword: string): boolean {
    return password === confirmPassword;
  }

  /**
   * Check if array contains duplicates
   */
  static hasDuplicates<T>(arr: T[]): boolean {
    return new Set(arr).size !== arr.length;
  }

  /**
   * Remove duplicates from array
   */
  static removeDuplicates<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }
}

export const {
  isValidEmail,
  isStrongPassword,
  isValidUsername,
  isValidPhoneNumber,
  isValidUrl,
  isValidUUID,
  isValidHexColor,
  isValidIPv4,
  isValidDate,
  isValidTime,
  isAlphanumeric,
  isValidLength,
  isInRange,
  isValidArrayLength,
  sanitizeString,
  normalizeWhitespace,
  isEmpty,
  hasValidExtension,
  isValidFileSize,
  isValidJSON,
  isValidCreditCard,
  isValidUSZipCode,
  isNullOrUndefined,
  hasRequiredProperties,
  isValidMention,
  extractMentions,
  isValidChannelName,
  isPositiveInteger,
  isNonNegativeInteger,
  isValidEnumValue,
  isNumericString,
  passwordsMatch,
  hasDuplicates,
  removeDuplicates,
} = ValidationUtil;

export default ValidationUtil;
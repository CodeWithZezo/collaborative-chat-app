export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class PaginationUtil {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 100;

  /**
   * Parse and validate pagination options
   */
  static parsePaginationOptions(options: PaginationOptions): {
    page: number;
    limit: number;
    skip: number;
    sortBy?: string;
    sortOrder: 'ASC' | 'DESC';
  } {
    const page = Math.max(1, options.page || this.DEFAULT_PAGE);
    const limit = Math.min(this.MAX_LIMIT, Math.max(1, options.limit || this.DEFAULT_LIMIT));
    const skip = (page - 1) * limit;
    const sortOrder = options.sortOrder || 'DESC';

    return {
      page,
      limit,
      skip,
      sortBy: options.sortBy,
      sortOrder,
    };
  }

  /**
   * Create paginated result
   */
  static createPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Calculate total pages
   */
  static calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  /**
   * Calculate skip value for database query
   */
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Validate page number
   */
  static isValidPage(page: number, totalPages: number): boolean {
    return page >= 1 && page <= totalPages;
  }

  /**
   * Get next page number
   */
  static getNextPage(currentPage: number, totalPages: number): number | null {
    return currentPage < totalPages ? currentPage + 1 : null;
  }

  /**
   * Get previous page number
   */
  static getPrevPage(currentPage: number): number | null {
    return currentPage > 1 ? currentPage - 1 : null;
  }

  /**
   * Extract pagination from query parameters
   */
  static fromQueryParams(query: {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: string;
  }): PaginationOptions {
    return {
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder === 'ASC' ? 'ASC' : 'DESC',
    };
  }

  /**
   * Create pagination metadata for response headers
   */
  static createPaginationHeaders(pagination: PaginationResult<unknown>['pagination']): Record<string, string> {
    return {
      'X-Total-Count': pagination.total.toString(),
      'X-Total-Pages': pagination.totalPages.toString(),
      'X-Current-Page': pagination.page.toString(),
      'X-Per-Page': pagination.limit.toString(),
      'X-Has-Next': pagination.hasNext.toString(),
      'X-Has-Prev': pagination.hasPrev.toString(),
    };
  }

  /**
   * Get page range for pagination UI
   */
  static getPageRange(currentPage: number, totalPages: number, maxVisible: number = 5): number[] {
    const range: number[] = [];
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  }
}

export const {
  parsePaginationOptions,
  createPaginatedResult,
  calculateTotalPages,
  calculateSkip,
  isValidPage,
  getNextPage,
  getPrevPage,
  fromQueryParams,
  createPaginationHeaders,
  getPageRange,
} = PaginationUtil;

export default PaginationUtil;
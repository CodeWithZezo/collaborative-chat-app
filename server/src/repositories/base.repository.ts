import { Repository, FindOptionsWhere, FindManyOptions, DeepPartial, FindOneOptions } from 'typeorm';
import { BaseEntity } from '../models/base.entity';
import { databaseManager } from '../config/database.config';
import logger from '../config/logger.config';

export abstract class BaseRepository<T extends BaseEntity> {
  protected repository: Repository<T>;
  protected entityName: string;

  constructor(entity: new () => T) {
    this.repository = databaseManager.getDataSource().getRepository(entity);
    this.entityName = entity.name;
  }

  /**
   * Create a new entity
   */
  async create(data: DeepPartial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data);
      const savedEntity = await this.repository.save(entity);

      logger.debug(`${this.entityName} created`, { id: savedEntity.id });
      return savedEntity;
    } catch (error) {
      logger.error(`Failed to create ${this.entityName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find entity by ID
   */
  async findById(id: string, options?: FindOneOptions<T>): Promise<T | null> {
    try {
      const entity = await this.repository.findOne({
        where: { id } as FindOptionsWhere<T>,
        ...options,
      });

      return entity;
    } catch (error) {
      logger.error(`Failed to find ${this.entityName} by ID`, {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find one entity by conditions
   */
  async findOne(where: FindOptionsWhere<T>, options?: FindOneOptions<T>): Promise<T | null> {
    try {
      return await this.repository.findOne({
        where,
        ...options,
      });
    } catch (error) {
      logger.error(`Failed to find ${this.entityName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find all entities matching conditions
   */
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    try {
      return await this.repository.find(options);
    } catch (error) {
      logger.error(`Failed to find all ${this.entityName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Find entities with pagination
   */
  async findWithPagination(
    options: FindManyOptions<T>,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: T[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [data, total] = await this.repository.findAndCount({
        ...options,
        skip,
        take: limit,
      });

      return { data, total };
    } catch (error) {
      logger.error(`Failed to find ${this.entityName} with pagination`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: string, data: DeepPartial<T>): Promise<T | null> {
    try {
      await this.repository.update(id, data as any);
      const updated = await this.findById(id);

      if (updated) {
        logger.debug(`${this.entityName} updated`, { id });
      }

      return updated;
    } catch (error) {
      logger.error(`Failed to update ${this.entityName}`, {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete entity by ID (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.softDelete(id);
      const success = result.affected ? result.affected > 0 : false;

      if (success) {
        logger.debug(`${this.entityName} deleted (soft)`, { id });
      }

      return success;
    } catch (error) {
      logger.error(`Failed to delete ${this.entityName}`, {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Hard delete entity by ID
   */
  async hardDelete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      const success = result.affected ? result.affected > 0 : false;

      if (success) {
        logger.debug(`${this.entityName} deleted (hard)`, { id });
      }

      return success;
    } catch (error) {
      logger.error(`Failed to hard delete ${this.entityName}`, {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Restore soft-deleted entity
   */
  async restore(id: string): Promise<boolean> {
    try {
      const result = await this.repository.restore(id);
      const success = result.affected ? result.affected > 0 : false;

      if (success) {
        logger.debug(`${this.entityName} restored`, { id });
      }

      return success;
    } catch (error) {
      logger.error(`Failed to restore ${this.entityName}`, {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    try {
      const count = await this.repository.count({ where });
      return count > 0;
    } catch (error) {
      logger.error(`Failed to check ${this.entityName} existence`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Count entities
   */
  async count(where?: FindOptionsWhere<T>): Promise<number> {
    try {
      return await this.repository.count({ where });
    } catch (error) {
      logger.error(`Failed to count ${this.entityName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Save entity (create or update)
   */
  async save(entity: T): Promise<T> {
    try {
      return await this.repository.save(entity);
    } catch (error) {
      logger.error(`Failed to save ${this.entityName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Bulk create entities
   */
  async bulkCreate(data: DeepPartial<T>[]): Promise<T[]> {
    try {
      const entities = this.repository.create(data);
      const saved = await this.repository.save(entities);

      logger.debug(`${this.entityName} bulk created`, { count: saved.length });
      return saved;
    } catch (error) {
      logger.error(`Failed to bulk create ${this.entityName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Execute raw query
   */
  async query(sql: string, parameters?: any[]): Promise<any> {
    try {
      return await this.repository.query(sql, parameters);
    } catch (error) {
      logger.error(`Failed to execute query for ${this.entityName}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get repository instance for advanced queries
   */
  getRepository(): Repository<T> {
    return this.repository;
  }
}
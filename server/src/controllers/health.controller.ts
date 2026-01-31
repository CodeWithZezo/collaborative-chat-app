import { Request, Response } from 'express';
import { ResponseFormatter } from '../utils/response.util';
import { asyncHandler } from '../middlewares/error.middleware';
import { databaseManager } from '../config/database.config';
import { redisManager } from '../config/redis.config';
import { ApiMetrics } from '../middlewares/logger.middleware';
import { config } from '../config';

export class HealthController {
  /**
   * Basic health check
   * GET /health
   */
  healthCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    ResponseFormatter.success(res, { status: 'healthy', timestamp: new Date().toISOString() }, 'Service is healthy');
  });

  /**
   * Detailed health check
   * GET /api/health/detailed
   */
  detailedHealthCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dbHealthy = await databaseManager.healthCheck();
    const redisHealthy = await redisManager.healthCheck();

    const health = {
      status: dbHealthy && redisHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.app.env,
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy',
      },
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024,
        unit: 'MB',
      },
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  /**
   * Get API metrics
   * GET /api/health/metrics
   */
  getMetrics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const metrics = ApiMetrics.getMetrics();

    ResponseFormatter.success(res, metrics, 'Metrics retrieved successfully');
  });

  /**
   * Reset metrics
   * POST /api/health/metrics/reset
   */
  resetMetrics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    ApiMetrics.reset();

    ResponseFormatter.success(res, null, 'Metrics reset successfully');
  });
}

export default new HealthController();
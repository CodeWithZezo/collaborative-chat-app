import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define validation schema for environment variables
const envSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('TeamCollabChat'),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),

  // JWT
  JWT_SECRET: Joi.string().required().min(32),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().required().min(32),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // CORS
  CORS_ORIGIN: Joi.string().required(),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  // File Upload
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  UPLOAD_PATH: Joi.string().default('./uploads'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
  LOG_FILE_PATH: Joi.string().default('./logs'),

  // Email (optional)
  EMAIL_HOST: Joi.string().optional(),
  EMAIL_PORT: Joi.number().optional(),
  EMAIL_USER: Joi.string().optional(),
  EMAIL_PASSWORD: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().optional(),

  // WebSocket
  SOCKET_PING_TIMEOUT: Joi.number().default(60000),
  SOCKET_PING_INTERVAL: Joi.number().default(25000),

  // Background Jobs
  BULL_REDIS_HOST: Joi.string().default('localhost'),
  BULL_REDIS_PORT: Joi.number().default(6379),

  // Search (optional)
  ELASTICSEARCH_NODE: Joi.string().optional(),

  // Monitoring
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().default(9090),
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export typed configuration
export const config = {
  app: {
    env: envVars.NODE_ENV as string,
    port: envVars.PORT as number,
    name: envVars.APP_NAME as string,
    isDevelopment: envVars.NODE_ENV === 'development',
    isProduction: envVars.NODE_ENV === 'production',
    isTest: envVars.NODE_ENV === 'test',
  },
  database: {
    host: envVars.DB_HOST as string,
    port: envVars.DB_PORT as number,
    username: envVars.DB_USERNAME as string,
    password: envVars.DB_PASSWORD as string,
    database: envVars.DB_DATABASE as string,
    synchronize: envVars.DB_SYNCHRONIZE as boolean,
    logging: envVars.DB_LOGGING as boolean,
  },
  redis: {
    host: envVars.REDIS_HOST as string,
    port: envVars.REDIS_PORT as number,
    password: envVars.REDIS_PASSWORD as string,
    db: envVars.REDIS_DB as number,
  },
  jwt: {
    secret: envVars.JWT_SECRET as string,
    expiresIn: envVars.JWT_EXPIRES_IN as string,
    refreshSecret: envVars.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN as string,
  },
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS as number,
    rateLimitWindowMs: envVars.RATE_LIMIT_WINDOW_MS as number,
    rateLimitMaxRequests: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  },
  cors: {
    origin: (envVars.CORS_ORIGIN as string).split(',').map((origin) => origin.trim()),
    credentials: envVars.CORS_CREDENTIALS as boolean,
  },
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE as number,
    uploadPath: envVars.UPLOAD_PATH as string,
  },
  logging: {
    level: envVars.LOG_LEVEL as string,
    filePath: envVars.LOG_FILE_PATH as string,
  },
  email: {
    host: envVars.EMAIL_HOST as string | undefined,
    port: envVars.EMAIL_PORT as number | undefined,
    user: envVars.EMAIL_USER as string | undefined,
    password: envVars.EMAIL_PASSWORD as string | undefined,
    from: envVars.EMAIL_FROM as string | undefined,
  },
  socket: {
    pingTimeout: envVars.SOCKET_PING_TIMEOUT as number,
    pingInterval: envVars.SOCKET_PING_INTERVAL as number,
  },
  bull: {
    redisHost: envVars.BULL_REDIS_HOST as string,
    redisPort: envVars.BULL_REDIS_PORT as number,
  },
  elasticsearch: {
    node: envVars.ELASTICSEARCH_NODE as string | undefined,
  },
  monitoring: {
    enableMetrics: envVars.ENABLE_METRICS as boolean,
    metricsPort: envVars.METRICS_PORT as number,
  },
} as const;

export default config;
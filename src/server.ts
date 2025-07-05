import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createClient, RedisClientType } from "redis";

// Import routes
import safeRoutes from "./routes/safe.js";
import networkRoutes from "./routes/network.js";
import healthRoutes from "./routes/health.js";

// Import middleware
import errorHandler from "./middleware/errorHandler.js";
import logger from "./config/logger.js";

// Load environment variables
dotenv.config();

// Extend Request interface to include redis
declare global {
  namespace Express {
    interface Request {
      redis: RedisClientType;
    }
  }
}

interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  redisUrl: string;
  mongoUri: string;
  enableRateLimit: boolean;
  apiRateLimit: number;
  apiRateWindow: number;
}

const app: express.Application = express();

const config: ServerConfig = {
  port: parseInt(process.env.PORT || "3001"),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  mongoUri:
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/safe-deployment-service",
  enableRateLimit: process.env.ENABLE_RATE_LIMITING === "true",
  apiRateLimit: parseInt(process.env.API_RATE_LIMIT || "100"),
  apiRateWindow: parseInt(process.env.API_RATE_WINDOW || "15"),
};

// Initialize Redis client
const redis: RedisClientType = createClient({
  url: config.redisUrl,
});

redis.on("error", (err: Error) => {
  logger.error("Redis Client Error:", err);
  if (config.nodeEnv !== "production") {
    logger.warn("Redis unavailable in development - caching disabled");
  }
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

// Connect to MongoDB (with better error handling for development)
mongoose
  .connect(config.mongoUri)
  .then(() => {
    logger.info("Connected to MongoDB");
  })
  .catch((error: Error) => {
    logger.error("MongoDB connection error:", error);
    if (config.nodeEnv === "production") {
      process.exit(1);
    } else {
      logger.warn(
        "MongoDB unavailable in development - some features may not work"
      );
    }
  });

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting
if (config.enableRateLimit) {
  const limiter = rateLimit({
    windowMs: config.apiRateWindow * 60 * 1000, // Convert to milliseconds
    max: config.apiRateLimit,
    message: {
      error: "Too many requests from this IP, please try again later.",
      retryAfter: Math.ceil(config.apiRateWindow * 60),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

// General middleware
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
app.use(
  morgan("combined", {
    stream: {
      write: (message: string): void => {
        logger.info(message.trim());
      },
    },
  })
);

// Add Redis to request object for caching
app.use((req: Request, res: Response, next: NextFunction): void => {
  req.redis = redis;
  next();
});

// API Routes
app.use("/api/health", healthRoutes);
app.use("/api/safe", safeRoutes);
app.use("/api/network", networkRoutes);

// Root endpoint
app.get("/", (req: Request, res: Response): void => {
  res.json({
    service: "Safe Deployment & Management Service",
    version: "1.0.0",
    status: "online",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/api/health",
      safe: "/api/safe",
      network: "/api/network",
    },
    documentation: "/api/docs",
  });
});

// 404 handler
app.use("*", (req: Request, res: Response): void => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: ["/api/health", "/api/safe", "/api/network"],
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown function
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, shutting down gracefully`);

  try {
    await mongoose.connection.close();
    await redis.quit();
    logger.info("Database connections closed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
};

// Graceful shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to Redis (with graceful fallback for development)
    try {
      await redis.connect();
    } catch (redisError) {
      if (config.nodeEnv === "production") {
        throw redisError;
      } else {
        logger.warn(
          "Redis connection failed in development - continuing without cache"
        );
      }
    }

    app.listen(config.port, () => {
      logger.info(`🚀 Safe Deployment Service running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(
        `🔗 Health check: http://localhost:${config.port}/api/health`
      );

      if (config.nodeEnv === "development") {
        logger.info(`🏠 API Root: http://localhost:${config.port}`);
        logger.info(`📋 Available endpoints:`);
        logger.info(`   - GET  /api/health`);
        logger.info(`   - POST /api/safe/deploy`);
        logger.info(`   - GET  /api/safe/:address`);
        logger.info(`   - POST /api/safe/:address/expand`);
        logger.info(`   - GET  /api/network/supported`);
      }
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;

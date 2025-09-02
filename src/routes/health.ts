import express, { Request, Response } from "express";
import DatabaseConnection from "../config/database.js";
import { ethers } from "ethers";
import { RedisClientType } from "redis";

const router = express.Router();

// Extend Request interface for Redis
interface RequestWithRedis extends Request {
  redis: RedisClientType | null;
}

interface HealthData {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  environment: string;
}

interface DetailedHealthData extends HealthData {
  checks: {
    database: string;
    redis: string;
    blockchain: string;
  };
  memory: NodeJS.MemoryUsage;
}

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const healthData: HealthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "Safe Deployment & Management Service",
      version: "1.0.0",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    };

    res.json({
      success: true,
      data: healthData,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: "Service unhealthy",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with dependencies
 * @access  Public
 */
router.get(
  "/detailed",
  async (req: RequestWithRedis, res: Response): Promise<void> => {
    const checks = {
      database: "unknown",
      redis: "unknown",
      blockchain: "unknown",
    };

    // Check MongoDB connection
    try {
      const dbConnection = DatabaseConnection.getInstance();
      if (dbConnection.isConnected() && (await dbConnection.ping())) {
        checks.database = "connected";
      } else {
        checks.database = "disconnected";
      }
    } catch (error) {
      checks.database = "error";
    }

    // Check Redis connection (if available)
    try {
      if (req.redis && req.redis.isReady) {
        checks.redis = "connected";
      } else if (req.redis === null) {
        checks.redis = "disabled";
      } else {
        checks.redis = "disconnected";
      }
    } catch (error) {
      checks.redis = "error";
    }

    // Check blockchain connectivity (sample RPC call)
    try {
      const provider = new ethers.JsonRpcProvider(
        "https://ethereum-rpc.publicnode.com"
      );
      await provider.getBlockNumber();
      checks.blockchain = "connected";
    } catch (error) {
      checks.blockchain = "error";
    }

    const allHealthy = Object.values(checks).every(
      (status) => status === "connected"
    );

    const detailedHealthData: DetailedHealthData = {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      service: "Safe Deployment & Management Service",
      version: "1.0.0",
      checks,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || "development",
    };

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: detailedHealthData,
    });
  }
);

export default router;

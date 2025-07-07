import { Request, Response } from "express";
import { validationResult, ValidationError } from "express-validator";
import SafeService, {
  DeploymentConfig,
  GetSafesOptions,
  SearchFilters,
} from "../services/SafeService.js";
import { IUserInfo } from "../models/Safe.js";
import { NetworkKey } from "../config/networks.js";
import logger from "../config/logger.js";

// Request interfaces
interface DeploySafesRequest extends Request {
  body: {
    userInfo: IUserInfo;
    config?: DeploymentConfig;
  };
}

interface GetSafeByIdRequest extends Request {
  params: {
    safeId: string;
  };
}

interface GetSafeByAddressRequest extends Request {
  params: {
    address: string;
  };
}

interface GetSafesByUserIdRequest extends Request {
  params: {
    userId: string;
  };
  query: {
    status?: string;
    networks?: string;
    limit?: string;
    offset?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
}

interface ExpandSafeRequest extends Request {
  params: {
    safeId: string;
  };
  body: {
    networks: string[];
  };
}

interface UpdateSafeMetadataRequest extends Request {
  params: {
    safeId: string;
  };
  body: {
    metadata: any;
  };
}

interface SearchSafesRequest extends Request {
  query: {
    userId?: string;
    status?: string;
    networks?: string;
    tags?: string;
    description?: string;
    address?: string;
    limit?: string;
    offset?: string;
  };
}

interface GetUserStatsRequest extends Request {
  params: {
    userId: string;
  };
}

/**
 * SafeController - Handles HTTP requests for Safe wallet operations
 */
class SafeController {
  private safeService: SafeService;

  constructor() {
    this.safeService = new SafeService();
  }

  /**
   * Deploy Safe wallets for a user
   * POST /api/safe/deploy
   */
  async deploySafes(req: DeploySafesRequest, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
        return;
      }

      const { userInfo, config = {} } = req.body;

      logger.info(`Safe deployment requested for user: ${userInfo.userId}`);

      // Deploy Safes
      const result = await this.safeService.deploySafesForUser(
        userInfo,
        config
      );

      // Check if any deployments succeeded
      const successfulDeployments = Object.values(result.deployments).filter(
        (d) => d.deploymentStatus === "deployed"
      );

      if (successfulDeployments.length === 0) {
        res.status(500).json({
          success: false,
          error: "All Safe deployments failed",
          details: result.deployments,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: `Safe deployed on ${successfulDeployments.length} network(s)`,
        data: {
          safeId: result.safeId,
          commonAddress: result.commonAddress,
          config: {
            owners: result.config.owners,
            threshold: result.config.threshold,
            saltNonce: result.config.saltNonce,
          },
          deployments: result.deployments,
          metadata: result.metadata,
          successfulNetworks: successfulDeployments.map((d) => d.networkKey),
          totalNetworks: Object.keys(result.deployments).length,
        },
      });
    } catch (error) {
      logger.error("Safe deployment error:", error);
      res.status(500).json({
        success: false,
        error: "Safe deployment failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get Safe information by ID
   * GET /api/safe/:safeId
   */
  async getSafeById(req: GetSafeByIdRequest, res: Response): Promise<void> {
    try {
      const { safeId } = req.params;

      const safe = await this.safeService.getSafeById(safeId);

      res.json({
        success: true,
        data: safe,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("not found")) {
        res.status(404).json({
          success: false,
          error: "Safe not found",
          message: errorMessage,
        });
        return;
      }

      logger.error("Get Safe error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve Safe",
        message: errorMessage,
      });
    }
  }

  /**
   * Get Safe by address
   * GET /api/safe/address/:address
   */
  async getSafeByAddress(
    req: GetSafeByAddressRequest,
    res: Response
  ): Promise<void> {
    try {
      const { address } = req.params;

      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        res.status(400).json({
          success: false,
          error: "Invalid address format",
        });
        return;
      }

      const safe = await this.safeService.getSafeByAddress(address);
      res.json({
        success: true,
        data: safe,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("not found")) {
        res.status(404).json({
          success: false,
          error: "Safe not found",
          message: errorMessage,
        });
        return;
      }

      logger.error("Get Safe by address error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve Safe",
        message: errorMessage,
      });
    }
  }

  /**
   * Get all Safes for a user
   * GET /api/safe/user/:userId
   */
  async getSafesByUserId(
    req: GetSafesByUserIdRequest,
    res: Response
  ): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        status,
        networks,
        limit = "50",
        offset = "0",
        sortBy = "metadata.createdAt",
        sortOrder = "desc",
      } = req.query;

      // Parse networks if provided
      const networksArray = networks ? networks.split(",") : undefined;

      const options: GetSafesOptions = {
        status: status as any,
        networks: networksArray,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder,
      };

      const safes = await this.safeService.getSafesByUserId(userId, options);

      res.json({
        success: true,
        data: {
          safes,
          count: safes.length,
          pagination: {
            limit: options.limit,
            offset: options.offset,
            hasMore: safes.length === options.limit,
          },
        },
      });
    } catch (error) {
      logger.error("Get Safes by user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve user Safes",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Expand Safe to additional networks
   * POST /api/safe/:safeId/expand
   */
  async expandSafe(req: ExpandSafeRequest, res: Response): Promise<void> {
    try {
      const { safeId } = req.params;
      const { networks } = req.body;

      if (!networks || !Array.isArray(networks) || networks.length === 0) {
        res.status(400).json({
          success: false,
          error: "Networks array is required",
        });
        return;
      }

      logger.info(
        `Expanding Safe ${safeId} to networks: ${networks.join(", ")}`
      );

      const result = await this.safeService.expandSafeToNetworks(
        safeId,
        networks as NetworkKey[]
      );

      const successfulExpansions = Object.values(result.deployments).filter(
        (d) => d.deploymentStatus === "deployed"
      );

      res.json({
        success: true,
        message: `Safe expanded to ${successfulExpansions.length} new network(s)`,
        data: {
          safeId: result.safeId,
          newDeployments: result.deployments,
          successfulNetworks: successfulExpansions.map((d) => d.networkKey),
          totalNewNetworks: Object.keys(result.deployments).length,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("not found")) {
        res.status(404).json({
          success: false,
          error: "Safe not found",
          message: errorMessage,
        });
        return;
      }

      logger.error("Safe expansion error:", error);
      res.status(500).json({
        success: false,
        error: "Safe expansion failed",
        message: errorMessage,
      });
    }
  }

  /**
   * Update Safe metadata
   * PUT /api/safe/:safeId/metadata
   */
  async updateSafeMetadata(
    req: UpdateSafeMetadataRequest,
    res: Response
  ): Promise<void> {
    try {
      const { safeId } = req.params;
      const { metadata } = req.body;

      const updatedSafe = await this.safeService.updateSafeMetadata(
        safeId,
        metadata
      );

      res.json({
        success: true,
        message: "Safe metadata updated successfully",
        data: updatedSafe,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("not found")) {
        res.status(404).json({
          success: false,
          error: "Safe not found",
          message: errorMessage,
        });
        return;
      }

      logger.error("Update Safe metadata error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update Safe metadata",
        message: errorMessage,
      });
    }
  }

  /**
   * Search Safes with filters
   * GET /api/safe/search
   */
  async searchSafes(req: SearchSafesRequest, res: Response): Promise<void> {
    try {
      const {
        userId,
        status,
        networks,
        tags,
        description,
        address,
        limit = "50",
        offset = "0",
      } = req.query;

      const filters: SearchFilters = {
        userId,
        status,
        networks: networks ? networks.split(",") : undefined,
        tags: tags ? tags.split(",") : undefined,
        description,
        address,
      };

      const safes = await this.safeService.searchSafes(filters);

      // Apply pagination
      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      const paginatedSafes = safes.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: {
          safes: paginatedSafes,
          total: safes.length,
          count: paginatedSafes.length,
          pagination: {
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + paginatedSafes.length < safes.length,
          },
        },
      });
    } catch (error) {
      logger.error("Search Safes error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to search Safes",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get user statistics
   * GET /api/safe/user/:userId/stats
   */
  async getUserStats(req: GetUserStatsRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const stats = await this.safeService.getUserStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get user stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve user statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get network statistics
   * GET /api/safe/network/stats
   */
  async getNetworkStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.safeService.getNetworkStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error("Get network stats error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve network statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Health check for Safe service
   * GET /api/safe/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: {
          status: "healthy",
          service: "SafeController",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: "Service unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default SafeController;

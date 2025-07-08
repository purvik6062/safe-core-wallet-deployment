import Safe from "@safe-global/protocol-kit";
import { ethers } from "ethers";
import { v4 as uuidv4 } from "uuid";
import SafeModel, {
  ISafe,
  ISafeDeployment,
  ISafeConfig,
  IUserInfo,
} from "../models/Safe.js";
import {
  getNetwork,
  isNetworkSupported,
  NetworkKey,
  NetworkConfig,
} from "../config/networks.js";
import logger from "../config/logger.js";

// Interface definitions
export interface DeploymentConfig {
  networks?: NetworkKey[];
  autoExpand?: boolean;
  description?: string;
  tags?: string[];
}

export interface DeploymentResult {
  networkKey: NetworkKey;
  chainId: number;
  address: string;
  deploymentTxHash?: string;
  deploymentBlockNumber?: number;
  deploymentTimestamp: Date;
  gasUsed?: string;
  gasPrice?: string;
  deploymentStatus: "pending" | "deployed" | "failed";
  explorerUrl?: string;
  isExisting?: boolean;
  error?: string;
}

export interface SafeDeploymentResponse {
  safeId: string;
  config: ISafeConfig;
  deployments: Record<string, DeploymentResult>;
  commonAddress?: string;
  metadata: any;
}

export interface GetSafesOptions {
  status?: "initializing" | "active" | "suspended" | "archived";
  networks?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SearchFilters {
  userId?: string;
  status?: string;
  networks?: string[];
  tags?: string[];
  description?: string;
  address?: string;
}

export interface NetworkStats {
  totalSafes: number;
  deployments: Record<string, number>;
  mostPopularNetwork: string;
}

export interface UserStats {
  totalSafes: number;
  activeDeployments: number;
  totalTransactions: number;
  totalValueTransferred: string;
  mostUsedNetwork?: string;
}

/**
 * SafeService - Core business logic for Safe wallet deployment and management
 * Handles multi-chain Safe deployments with deterministic addresses
 */
class SafeService {
  private agentPrivateKey: string;
  private cache: Map<string, any>;
  private deploymentQueue: Map<string, boolean>;

  constructor() {
    this.agentPrivateKey = process.env.AGENT_PRIVATE_KEY || "";
    if (!this.agentPrivateKey) {
      throw new Error("AGENT_PRIVATE_KEY environment variable is required");
    }

    this.cache = new Map(); // In-memory cache for frequently accessed data
    this.deploymentQueue = new Map(); // Track ongoing deployments
  }

  /**
   * Deploy Safe wallets across multiple networks for a user
   */
  async deploySafesForUser(
    userInfo: IUserInfo,
    config: DeploymentConfig = {}
  ): Promise<SafeDeploymentResponse> {
    const {
      networks = ["sepolia", "arbitrum_sepolia", "base_sepolia"],
      autoExpand = false,
      description = "",
      tags = [],
    } = config;

    logger.info(
      `Deploying Safes for user ${userInfo.userId} on networks: ${networks.join(", ")}`
    );

    // Validate networks
    for (const networkKey of networks) {
      if (!isNetworkSupported(networkKey)) {
        throw new Error(`Unsupported network: ${networkKey}`);
      }
    }

    // Generate unique Salt Nonce for deterministic addresses
    const saltNonce = this.generateSaltNonce(userInfo.userId);

    // Agent wallet that will co-own the Safes
    const agentWallet = new ethers.Wallet(this.agentPrivateKey);

    // Safe configuration: User + Agent as owners
    const owners = [userInfo.walletAddress, agentWallet.address];
    const threshold = 1; // Either user or agent can execute transactions

    const safeConfig: ISafeConfig = {
      owners,
      threshold,
      saltNonce,
      safeVersion: "1.4.1",
    };

    // Create Safe record in database
    const safeId = uuidv4();
    const safeRecord = new SafeModel({
      safeId,
      userInfo: {
        ...userInfo,
        preferences: {
          defaultNetworks: networks,
          autoExpand,
          notifications: { email: true, webhook: false },
        },
      },
      config: safeConfig,
      metadata: {
        description,
        tags,
      },
    });

    await safeRecord.save();
    logger.info(`Created Safe record with ID: ${safeId}`);

    // Deploy on each network in parallel
    const deploymentPromises = networks.map((networkKey) =>
      this.deploySafeOnNetwork(safeId, networkKey, safeConfig)
    );

    const results = await Promise.allSettled(deploymentPromises);

    // Process deployment results
    const deploymentResults: Record<string, DeploymentResult> = {};
    for (let i = 0; i < results.length; i++) {
      const networkKey = networks[i];
      const result = results[i];

      if (result.status === "fulfilled") {
        deploymentResults[networkKey] = result.value;
        logger.info(
          `✅ Safe deployed on ${networkKey}: ${result.value.address}`
        );
      } else {
        deploymentResults[networkKey] = {
          networkKey,
          chainId: getNetwork(networkKey).chainId,
          address: "",
          deploymentTimestamp: new Date(),
          deploymentStatus: "failed",
          error: result.reason.message,
        };
        logger.error(
          `❌ Safe deployment failed on ${networkKey}: ${result.reason.message}`
        );
      }
    }

    // Update Safe record with deployment results
    await this.updateSafeDeployments(safeId, deploymentResults);

    // Check if all deployed addresses are the same (deterministic)
    const deployedAddresses = Object.values(deploymentResults)
      .filter((r) => r.deploymentStatus === "deployed")
      .map((r) => r.address);

    const uniqueAddresses = [...new Set(deployedAddresses)];

    if (uniqueAddresses.length === 1 && deployedAddresses.length > 1) {
      logger.info(
        `✅ Deterministic deployment successful! Same address across all networks: ${uniqueAddresses[0]}`
      );
    } else if (uniqueAddresses.length > 1) {
      logger.warn(`⚠️  Different addresses across networks:`, uniqueAddresses);
    }

    // Get updated Safe record
    const updatedSafe = await SafeModel.findOne({ safeId });

    return {
      safeId,
      config: safeConfig,
      deployments: deploymentResults,
      commonAddress: this.getCommonAddress(deploymentResults),
      metadata: updatedSafe?.metadata,
    };
  }

  /**
   * Deploy Safe on a specific network
   */
  async deploySafeOnNetwork(
    safeId: string,
    networkKey: NetworkKey,
    safeConfig: ISafeConfig
  ): Promise<DeploymentResult> {
    const cacheKey = `deployment:${safeId}:${networkKey}`;

    // Check if deployment is already in progress
    if (this.deploymentQueue.has(cacheKey)) {
      throw new Error(`Deployment already in progress for ${networkKey}`);
    }

    this.deploymentQueue.set(cacheKey, true);

    try {
      const network = getNetwork(networkKey);
      logger.info(`Deploying Safe on ${network.name} (${networkKey})`);

      // Create provider and deployer wallet
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const deployerWallet = new ethers.Wallet(this.agentPrivateKey, provider);

      // Check deployer balance
      const balance = await deployerWallet.provider!.getBalance(
        deployerWallet.address
      );
      logger.info(
        `Deployer balance on ${network.name}: ${ethers.formatEther(balance)} ${network.currency.symbol}`
      );

      if (balance === 0n) {
        throw new Error(
          `No ${network.currency.symbol} balance on ${network.name} for deployment`
        );
      }

      // Initialize Safe Protocol Kit with explicit contract addresses for deterministic addresses across all networks
      const safeAccountConfig = {
        owners: safeConfig.owners,
        threshold: safeConfig.threshold,
      };

      const safeDeploymentConfig = {
        saltNonce: safeConfig.saltNonce,
      };

      let protocolKit: Safe;

      try {
        logger.info(
          `🔍 Initializing Safe SDK for ${network.name} with Safe v1.4.1 canonical addresses`
        );

        protocolKit = await Safe.init({
          provider: network.rpc,
          signer: this.agentPrivateKey,
          predictedSafe: {
            safeAccountConfig,
            safeDeploymentConfig,
          },
          isL1SafeSingleton: false,
          // canonical addresses for consistent deployment across all networks
          contractNetworks: {
            [network.chainId]: {
              // safeSingletonAddress:
              //   "0x41675C099F32341bf84BFc5382aF534df5C7461a",
              safeSingletonAddress:
                "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762",
              safeProxyFactoryAddress:
                "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
              multiSendAddress: "0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526",
              multiSendCallOnlyAddress:
                "0x9641d764fc13c8B624c04430C7356C1C7C8102e2",
              fallbackHandlerAddress:
                "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99",
              signMessageLibAddress:
                "0xd53cd0aB83D845Ac265BE939c57F53AD838012c9",
              createCallAddress: "0x9b35Af71d77eaf8d7e40252370304687390A1A52",
            },
          },
        });

        logger.info(
          `✅ Safe SDK initialized successfully for ${network.name} using Safe v1.4.1`
        );
      } catch (error) {
        logger.error(
          `❌ Failed to initialize Safe SDK for ${network.name}:`,
          error
        );
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Safe initialization failed for ${network.name}: ${errorMessage}`
        );
      }

      // Get predicted address
      const predictedAddress = await protocolKit.getAddress();
      logger.info(`Predicted Safe address: ${predictedAddress}`);

      // Check if already deployed
      const isAlreadyDeployed = await protocolKit.isSafeDeployed();

      if (isAlreadyDeployed) {
        logger.info(`Safe already exists at ${predictedAddress}`);

        return {
          networkKey,
          chainId: network.chainId,
          address: predictedAddress,
          deploymentStatus: "deployed",
          deploymentTimestamp: new Date(),
          explorerUrl: `${network.explorer}/address/${predictedAddress}`,
          isExisting: true,
        };
      }

      // Create deployment transaction
      logger.info("Creating Safe deployment transaction...");
      const deploymentTx = await protocolKit.createSafeDeploymentTransaction();

      // Estimate gas
      const gasEstimate = await deployerWallet.estimateGas({
        to: deploymentTx.to,
        data: deploymentTx.data,
        value: deploymentTx.value,
      });

      logger.info(`Estimated gas: ${gasEstimate.toString()}`);

      // Send transaction
      const txResponse = await deployerWallet.sendTransaction({
        to: deploymentTx.to,
        data: deploymentTx.data,
        value: deploymentTx.value,
        gasLimit: gasEstimate,
      });

      logger.info(`Transaction sent: ${txResponse.hash}`);

      // Wait for confirmation
      const receipt = await txResponse.wait();
      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      logger.info(`Transaction confirmed in block ${receipt.blockNumber}`);

      // Verify deployment
      const isDeployed = await protocolKit.isSafeDeployed();
      if (!isDeployed) {
        throw new Error("Safe deployment verification failed");
      }

      return {
        networkKey,
        chainId: network.chainId,
        address: predictedAddress,
        deploymentTxHash: receipt.hash,
        deploymentBlockNumber: receipt.blockNumber,
        deploymentTimestamp: new Date(),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: receipt.gasPrice?.toString(),
        deploymentStatus: "deployed",
        explorerUrl: `${network.explorer}/address/${predictedAddress}`,
      };
    } catch (error) {
      logger.error(`Safe deployment failed on ${networkKey}:`, error);
      throw error;
    } finally {
      this.deploymentQueue.delete(cacheKey);
    }
  }

  /**
   * Expand Safe to additional networks
   */
  async expandSafeToNetworks(
    safeId: string,
    newNetworks: NetworkKey[]
  ): Promise<SafeDeploymentResponse> {
    const safe = await SafeModel.findOne({ safeId });
    if (!safe) {
      throw new Error(`Safe not found: ${safeId}`);
    }

    // Filter out networks where Safe is already deployed
    const networksToExpand = newNetworks.filter(
      (network) => !safe.isDeployedOnNetwork(network)
    );

    if (networksToExpand.length === 0) {
      throw new Error("Safe already deployed on all specified networks");
    }

    // Deploy on new networks
    const deploymentPromises = networksToExpand.map((networkKey) =>
      this.deploySafeOnNetwork(safeId, networkKey, safe.config)
    );

    const results = await Promise.allSettled(deploymentPromises);

    // Process results
    const newDeployments: Record<string, DeploymentResult> = {};
    let hasSuccessfulDeployment = false;

    for (let i = 0; i < results.length; i++) {
      const networkKey = networksToExpand[i];
      const result = results[i];

      if (result.status === "fulfilled") {
        newDeployments[networkKey] = result.value;
        if (result.value.deploymentStatus === "deployed") {
          await safe.addDeployment(networkKey, result.value);
          hasSuccessfulDeployment = true;
          logger.info(
            `✅ Added expansion deployment for ${networkKey}: ${result.value.address}`
          );
        }
      } else {
        newDeployments[networkKey] = {
          networkKey,
          chainId: getNetwork(networkKey).chainId,
          address: "",
          deploymentTimestamp: new Date(),
          deploymentStatus: "failed",
          error: result.reason.message,
        };
      }
    }

    // Update Safe status to "active" if at least one deployment is successful
    if (hasSuccessfulDeployment && safe.status === "initializing") {
      safe.status = "active";
      await safe.save();
      logger.info(
        `🎉 Safe status updated to "active" during expansion - Safe ID: ${safeId}`
      );
    }

    return {
      safeId,
      config: safe.config,
      deployments: newDeployments,
      commonAddress: this.getCommonAddress(newDeployments),
      metadata: safe.metadata,
    };
  }

  /**
   * Get Safe by ID
   */
  async getSafeById(safeId: string): Promise<ISafe> {
    const safe = await SafeModel.findOne({ safeId });
    if (!safe) {
      throw new Error(`Safe not found: ${safeId}`);
    }
    return safe;
  }

  /**
   * Get Safes by user ID
   */
  async getSafesByUserId(
    userId: string,
    options: GetSafesOptions = {}
  ): Promise<ISafe[]> {
    const {
      status,
      networks,
      limit = 50,
      offset = 0,
      sortBy = "metadata.createdAt",
      sortOrder = "desc",
    } = options;

    const query: any = { "userInfo.userId": userId };

    if (status) {
      query.status = status;
    }

    if (networks && networks.length > 0) {
      query["metadata.activeNetworks"] = { $in: networks };
    }

    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

    return await SafeModel.find(query)
      .sort(sortObj)
      .skip(offset)
      .limit(limit)
      .exec();
  }

  /**
   * Get Safe by address
   */
  async getSafeByAddress(address: string): Promise<ISafe> {
    const safe = await SafeModel.findOne({
      $or: [
        { "userInfo.walletAddress": address },
        { [`deployments.${Object.keys(getNetwork)}.address`]: address },
      ],
    });

    if (!safe) {
      throw new Error(`Safe not found for address: ${address}`);
    }

    return safe;
  }

  /**
   * Update Safe metadata
   */
  async updateSafeMetadata(
    safeId: string,
    metadata: Partial<any>
  ): Promise<ISafe> {
    const safe = await SafeModel.findOne({ safeId });
    if (!safe) {
      throw new Error(`Safe not found: ${safeId}`);
    }

    Object.assign(safe.metadata, metadata);
    return await safe.save();
  }

  /**
   * Update Safe status manually
   */
  async updateSafeStatus(
    safeId: string,
    newStatus: "initializing" | "active" | "suspended" | "archived"
  ): Promise<ISafe> {
    const safe = await SafeModel.findOne({ safeId });
    if (!safe) {
      throw new Error(`Safe not found: ${safeId}`);
    }

    const oldStatus = safe.status;
    await safe.updateStatus(newStatus);

    logger.info(
      `🔄 Safe status manually updated: ${safeId} - ${oldStatus} → ${newStatus}`
    );

    return safe;
  }

  /**
   * Update Safe deployments
   */
  private async updateSafeDeployments(
    safeId: string,
    deploymentResults: Record<string, DeploymentResult>
  ): Promise<void> {
    const safe = await SafeModel.findOne({ safeId });
    if (!safe) {
      throw new Error(`Safe not found: ${safeId}`);
    }

    let hasSuccessfulDeployment = false;

    for (const [networkKey, result] of Object.entries(deploymentResults)) {
      if (result.deploymentStatus === "deployed") {
        await safe.addDeployment(networkKey, result);
        hasSuccessfulDeployment = true;
        logger.info(`✅ Added deployment for ${networkKey}: ${result.address}`);
      }
    }

    // Update Safe status to "active" if at least one deployment is successful
    if (hasSuccessfulDeployment && safe.status === "initializing") {
      safe.status = "active";
      logger.info(`🎉 Safe status updated to "active" - Safe ID: ${safeId}`);
    }

    // Save the updated Safe with new status
    await safe.save();
  }

  /**
   * Generate salt nonce for deterministic addresses
   */
  private generateSaltNonce(userId: string): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return ethers.keccak256(
      ethers.toUtf8Bytes(`${userId}-${timestamp}-${random}`)
    );
  }

  /**
   * Get common address from deployments
   * With deterministic deployment, all successful deployments should have the same address
   */
  private getCommonAddress(
    deployments: Record<string, DeploymentResult>
  ): string | undefined {
    const successfulDeployments = Object.values(deployments).filter(
      (d) => d.deploymentStatus === "deployed"
    );

    if (successfulDeployments.length === 0) {
      return undefined;
    }

    const addresses = successfulDeployments.map((d) => d.address);
    const uniqueAddresses = [...new Set(addresses)];

    // All addresses should be the same with deterministic deployment
    if (uniqueAddresses.length > 1) {
      logger.warn(
        `⚠️  Multiple Safe addresses detected - deterministic deployment may have failed:`,
        uniqueAddresses
      );
    }

    return addresses[0];
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<NetworkStats> {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalSafes: { $sum: 1 },
          allNetworks: { $addToSet: "$metadata.activeNetworks" },
        },
      },
    ];

    const result = await SafeModel.aggregate(pipeline).exec();
    const stats = result[0] || { totalSafes: 0, allNetworks: [] };

    // Count deployments per network
    const deployments: Record<string, number> = {};
    const flatNetworks = stats.allNetworks.flat();
    for (const network of flatNetworks) {
      deployments[network] = (deployments[network] || 0) + 1;
    }

    const mostPopularNetwork =
      Object.entries(deployments).sort(([, a], [, b]) => b - a)[0]?.[0] || "";

    return {
      totalSafes: stats.totalSafes,
      deployments,
      mostPopularNetwork,
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const safes = await SafeModel.find({ "userInfo.userId": userId });

    const totalSafes = safes.length;
    const activeDeployments = safes.reduce(
      (sum, safe) => sum + safe.getActiveDeployments().length,
      0
    );

    const totalTransactions = safes.reduce(
      (sum, safe) => sum + safe.analytics.totalTransactions,
      0
    );

    const totalValueTransferred = safes
      .reduce(
        (sum, safe) =>
          sum + parseFloat(safe.analytics.totalValueTransferred || "0"),
        0
      )
      .toString();

    const mostUsedNetwork = safes
      .map((safe) => safe.analytics.mostUsedNetwork)
      .filter(Boolean)[0];

    return {
      totalSafes,
      activeDeployments,
      totalTransactions,
      totalValueTransferred,
      mostUsedNetwork,
    };
  }

  /**
   * Search Safes with filters
   */
  async searchSafes(filters: SearchFilters = {}): Promise<ISafe[]> {
    const query: any = {};

    if (filters.userId) {
      query["userInfo.userId"] = filters.userId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.networks && filters.networks.length > 0) {
      query["metadata.activeNetworks"] = { $in: filters.networks };
    }

    if (filters.tags && filters.tags.length > 0) {
      query["metadata.tags"] = { $in: filters.tags };
    }

    if (filters.description) {
      query["metadata.description"] = {
        $regex: filters.description,
        $options: "i",
      };
    }

    if (filters.address) {
      query.$or = [
        { "userInfo.walletAddress": filters.address },
        { "deployments.address": filters.address },
      ];
    }

    return await SafeModel.find(query).exec();
  }
}

export default SafeService;

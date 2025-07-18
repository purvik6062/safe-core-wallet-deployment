import { Collection, ObjectId, WithId } from "mongodb";
import DatabaseConnection from "../config/database.js";

// TypeScript interfaces for the models (MongoDB)     
export interface ISafeDeployment {
  networkKey:
    | "ethereum"
    | "sepolia"
    | "arbitrum"
    | "arbitrum_sepolia"
    | "polygon"
    | "base"
    | "base_sepolia"
    | "optimism";
  chainId: number;
  address: string;
  deploymentTxHash?: string;
  deploymentBlockNumber?: number;
  deploymentTimestamp: Date;
  gasUsed?: string;
  gasPrice?: string;
  deploymentStatus: "pending" | "deployed" | "failed";
  explorerUrl?: string;
  isActive: boolean;
}

export interface ISafeConfig {
  owners: string[];
  threshold: number;
  saltNonce: string;
  safeVersion: string;
}

export interface IUserInfo {
  userId: string;
  walletAddress: string;
  email?: string;
  preferences: {
    defaultNetworks: string[];
    autoExpand: boolean;
    notifications: {
      email: boolean;
      webhook: boolean;
    };
  };
}

export interface ISafeAnalytics {
  totalTransactions: number;
  totalValueTransferred: string;
  mostUsedNetwork?: string;
  lastTransactionAt?: Date;
  averageGasUsed?: string;
}

export interface ISafeMetadata {
  createdAt: Date;
  updatedAt: Date;
  totalDeployments: number;
  activeNetworks: string[];
  tags: string[];
  description?: string;
  lastActivityAt: Date;
}

export interface ISafeDocument {
  _id?: ObjectId;
  safeId: string;
  userInfo: IUserInfo;
  config: ISafeConfig;
  deployments: { [key: string]: ISafeDeployment };
  metadata: ISafeMetadata;
  status: "initializing" | "active" | "suspended" | "archived";
  analytics: ISafeAnalytics;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Safe {
  private static collection: Collection<ISafeDocument> | null = null;

  public _id?: ObjectId;
  public safeId: string;
  public userInfo: IUserInfo;
  public config: ISafeConfig;
  public deployments: { [key: string]: ISafeDeployment };
  public metadata: ISafeMetadata;
  public status: "initializing" | "active" | "suspended" | "archived";
  public analytics: ISafeAnalytics;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor(data: Partial<ISafeDocument>) {
    this._id = data._id;
    this.safeId = data.safeId || "";
    this.userInfo = data.userInfo || ({} as IUserInfo);
    this.config = data.config || ({} as ISafeConfig);
    this.deployments = data.deployments || {};
    this.metadata = data.metadata || this.getDefaultMetadata();
    this.status = data.status || "initializing";
    this.analytics = data.analytics || this.getDefaultAnalytics();
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  private static getCollection(): Collection<ISafeDocument> {
    if (!this.collection) {
      const db = DatabaseConnection.getInstance().getDatabase();
      this.collection = db.collection<ISafeDocument>("safes");
    }
    return this.collection;
  }

  private getDefaultMetadata(): ISafeMetadata {
    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      totalDeployments: 0,
      activeNetworks: [],
      tags: [],
      lastActivityAt: new Date(),
    };
  }

  private getDefaultAnalytics(): ISafeAnalytics {
    return {
      totalTransactions: 0,
      totalValueTransferred: "0",
    };
  }

  private validate(): void {
    if (!this.safeId) {
      throw new Error("SafeId is required");
    }
    if (!this.userInfo.userId) {
      throw new Error("UserId is required");
    }
    if (!this.userInfo.walletAddress) {
      throw new Error("Wallet address is required");
    }
    if (!this.userInfo.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error("Invalid wallet address format");
    }
    if (!this.config.owners || this.config.owners.length === 0) {
      throw new Error("At least one owner is required");
    }
    if (this.config.threshold < 1) {
      throw new Error("Threshold must be at least 1");
    }
    if (this.config.threshold > this.config.owners.length) {
      throw new Error("Threshold cannot exceed number of owners");
    }
    for (const owner of this.config.owners) {
      if (!owner.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error(`Invalid owner address format: ${owner}`);
      }
    }
  }

  // Instance methods
  public async addDeployment(
    networkKey: string,
    deployment: Partial<ISafeDeployment>
  ): Promise<Safe> {
    this.deployments[networkKey] = {
      networkKey: networkKey as ISafeDeployment["networkKey"],
      chainId: deployment.chainId!,
      address: deployment.address!,
      deploymentTxHash: deployment.deploymentTxHash,
      deploymentBlockNumber: deployment.deploymentBlockNumber,
      deploymentTimestamp: deployment.deploymentTimestamp || new Date(),
      gasUsed: deployment.gasUsed,
      gasPrice: deployment.gasPrice,
      deploymentStatus: deployment.deploymentStatus || "pending",
      explorerUrl: deployment.explorerUrl,
      isActive: deployment.isActive !== undefined ? deployment.isActive : true,
    } as ISafeDeployment;

    this.metadata.totalDeployments = Object.keys(this.deployments).length;
    this.metadata.activeNetworks = Object.keys(this.deployments);
    this.metadata.updatedAt = new Date();

    return await this.save();
  }

  public getDeployment(networkKey: string): ISafeDeployment | undefined {
    return this.deployments[networkKey];
  }

  public async updateAnalytics(data: Partial<ISafeAnalytics>): Promise<Safe> {
    Object.assign(this.analytics, data);
    this.metadata.updatedAt = new Date();
    return await this.save();
  }

  public async updateStatus(
    newStatus: "initializing" | "active" | "suspended" | "archived"
  ): Promise<Safe> {
    this.status = newStatus;
    this.metadata.updatedAt = new Date();
    return await this.save();
  }

  public isDeployedOnNetwork(networkKey: string): boolean {
    const deployment = this.deployments[networkKey];
    return (
      deployment?.deploymentStatus === "deployed" &&
      deployment?.isActive === true
    );
  }

  public getActiveDeployments(): ISafeDeployment[] {
    const deployments: ISafeDeployment[] = [];
    for (const [key, deployment] of Object.entries(this.deployments)) {
      if (deployment.isActive && deployment.deploymentStatus === "deployed") {
        deployments.push(deployment);
      }
    }
    return deployments;
  }

  public async updateLastActivity(): Promise<Safe> {
    this.metadata.lastActivityAt = new Date();
    this.metadata.updatedAt = new Date();
    return await this.save();
  }

  public async save(): Promise<Safe> {
    this.validate();
    this.updatedAt = new Date();

    if (!this.createdAt) {
      this.createdAt = new Date();
    }

    const collection = Safe.getCollection();
    const document: ISafeDocument = {
      _id: this._id,
      safeId: this.safeId,
      userInfo: this.userInfo,
      config: this.config,
      deployments: this.deployments,
      metadata: this.metadata,
      status: this.status,
      analytics: this.analytics,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    if (this._id) {
      // Update existing document
      await collection.replaceOne({ _id: this._id }, document);
    } else {
      // Insert new document
      const result = await collection.insertOne(document);
      this._id = result.insertedId;
    }

    return this;
  }

  // Static methods
  public static async findByUserId(userId: string): Promise<Safe[]> {
    const collection = this.getCollection();
    const documents = await collection
      .find({ "userInfo.userId": userId })
      .toArray();
    return documents.map((doc) => new Safe(doc));
  }

  public static async findBySafeId(safeId: string): Promise<Safe | null> {
    const collection = this.getCollection();
    const document = await collection.findOne({ safeId });
    return document ? new Safe(document) : null;
  }

  public static async findByAddress(address: string): Promise<Safe[]> {
    const collection = this.getCollection();
    const documents = await collection
      .find({
        $or: [
          { "deployments.address": address },
          { "userInfo.walletAddress": address },
        ],
      })
      .toArray();
    return documents.map((doc) => new Safe(doc));
  }

  public static async createSafe(
    safeData: Partial<ISafeDocument>
  ): Promise<Safe> {
    const safe = new Safe(safeData);
    return await safe.save();
  }

  public static async getDeploymentStats(): Promise<any> {
    const collection = this.getCollection();
    const pipeline = [
      {
        $group: {
          _id: null,
          totalSafes: { $sum: 1 },
          totalDeployments: { $sum: "$metadata.totalDeployments" },
          activeUsers: { $addToSet: "$userInfo.userId" },
        },
      },
      {
        $project: {
          _id: 0,
          totalSafes: 1,
          totalDeployments: 1,
          activeUsers: { $size: "$activeUsers" },
        },
      },
    ];

    const result = await collection.aggregate(pipeline).toArray();
    return result[0] || { totalSafes: 0, totalDeployments: 0, activeUsers: 0 };
  }

  public static async findOne(filter: any): Promise<Safe | null> {
    const collection = this.getCollection();
    const document = await collection.findOne(filter);
    return document ? new Safe(document) : null;
  }

  public static async find(filter: any = {}): Promise<Safe[]> {
    const collection = this.getCollection();
    const documents = await collection.find(filter).toArray();
    return documents.map((doc) => new Safe(doc));
  }

  public static async aggregate(pipeline: any[]): Promise<any[]> {
    const collection = this.getCollection();
    return await collection.aggregate(pipeline).toArray();
  }

  public toJSON(): ISafeDocument {
    return {
      _id: this._id,
      safeId: this.safeId,
      userInfo: this.userInfo,
      config: this.config,
      deployments: this.deployments,
      metadata: this.metadata,
      status: this.status,
      analytics: this.analytics,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default Safe;

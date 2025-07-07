import mongoose, { Schema, Document, Model } from "mongoose";

// TypeScript interfaces for the models
export interface ISafeDeployment {
  networkKey:
    | "ethereum"
    | "sepolia"
    | "arbitrum"
    | "arbitrum_sepolia"
    | "polygon"
    | "base"
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

export interface ISafe extends Document {
  safeId: string;
  userInfo: IUserInfo;
  config: ISafeConfig;
  deployments: Map<string, ISafeDeployment>;
  metadata: ISafeMetadata;
  status: "initializing" | "active" | "suspended" | "archived";
  analytics: ISafeAnalytics;

  // Instance methods
  addDeployment(
    networkKey: string,
    deployment: Partial<ISafeDeployment>
  ): Promise<ISafe>;
  getDeployment(networkKey: string): ISafeDeployment | undefined;
  updateAnalytics(data: Partial<ISafeAnalytics>): Promise<ISafe>;
  isDeployedOnNetwork(networkKey: string): boolean;
  getActiveDeployments(): ISafeDeployment[];
  updateLastActivity(): Promise<ISafe>;
}

export interface ISafeModel extends Model<ISafe> {
  // Static methods
  findByUserId(userId: string): Promise<ISafe[]>;
  findBySafeId(safeId: string): Promise<ISafe | null>;
  findByAddress(address: string): Promise<ISafe[]>;
  createSafe(safeData: Partial<ISafe>): Promise<ISafe>;
  getDeploymentStats(): Promise<any>;
}

// Safe deployment schema
const SafeDeploymentSchema = new Schema<ISafeDeployment>(
  {
    networkKey: {
      type: String,
      required: true,
      enum: [
        "ethereum",
        "sepolia",
        "arbitrum",
        "arbitrum_sepolia",
        "polygon",
        "base",
        "optimism",
      ],
    },
    chainId: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
      match: /^0x[a-fA-F0-9]{40}$/,
    },
    deploymentTxHash: {
      type: String,
      match: /^0x[a-fA-F0-9]{64}$/,
    },
    deploymentBlockNumber: {
      type: Number,
    },
    deploymentTimestamp: {
      type: Date,
      default: Date.now,
    },
    gasUsed: {
      type: String,
    },
    gasPrice: {
      type: String,
    },
    deploymentStatus: {
      type: String,
      enum: ["pending", "deployed", "failed"],
      default: "pending",
    },
    explorerUrl: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

// Safe configuration schema
const SafeConfigSchema = new Schema<ISafeConfig>(
  {
    owners: [
      {
        type: String,
        required: true,
        match: /^0x[a-fA-F0-9]{40}$/,
      },
    ],
    threshold: {
      type: Number,
      required: true,
      min: 1,
    },
    saltNonce: {
      type: String,
      required: true,
    },
    safeVersion: {
      type: String,
      default: "1.3.0",
    },
  },
  {
    _id: false,
  }
);

// User information schema
const UserInfoSchema = new Schema<IUserInfo>(
  {
    userId: {
      type: String,
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
      match: /^0x[a-fA-F0-9]{40}$/,
    },
    email: {
      type: String,
      match: /^\S+@\S+\.\S+$/,
    },
    preferences: {
      defaultNetworks: [
        {
          type: String,
        },
      ],
      autoExpand: {
        type: Boolean,
        default: false,
      },
      notifications: {
        email: { type: Boolean, default: true },
        webhook: { type: Boolean, default: false },
      },
    },
  },
  {
    _id: false,
  }
);

// Analytics schema
const SafeAnalyticsSchema = new Schema<ISafeAnalytics>(
  {
    totalTransactions: {
      type: Number,
      default: 0,
    },
    totalValueTransferred: {
      type: String,
      default: "0",
    },
    mostUsedNetwork: {
      type: String,
    },
    lastTransactionAt: {
      type: Date,
    },
    averageGasUsed: {
      type: String,
    },
  },
  {
    _id: false,
  }
);

// Metadata schema
const SafeMetadataSchema = new Schema<ISafeMetadata>(
  {
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    totalDeployments: {
      type: Number,
      default: 0,
    },
    activeNetworks: [
      {
        type: String,
      },
    ],
    tags: [
      {
        type: String,
      },
    ],
    description: {
      type: String,
      maxlength: 500,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

// Main Safe schema
const SafeSchema = new Schema<ISafe>(
  {
    safeId: {
      type: String,
      required: true,
      unique: true,
    },
    userInfo: {
      type: UserInfoSchema,
      required: true,
    },
    config: {
      type: SafeConfigSchema,
      required: true,
    },
    deployments: {
      type: Map,
      of: SafeDeploymentSchema,
      default: new Map(),
    },
    metadata: {
      type: SafeMetadataSchema,
      required: true,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["initializing", "active", "suspended", "archived"],
      default: "initializing",
    },
    analytics: {
      type: SafeAnalyticsSchema,
      required: true,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: "safes",
  }
);

// Indexes for better query performance
// SafeSchema.index({ "userInfo.userId": 1 });
SafeSchema.index({ "userInfo.walletAddress": 1 });
SafeSchema.index({ "deployments.address": 1 });
SafeSchema.index({ status: 1 });
SafeSchema.index({ "metadata.createdAt": -1 });

// Instance methods
SafeSchema.methods.addDeployment = async function (
  networkKey: string,
  deployment: Partial<ISafeDeployment>
): Promise<ISafe> {
  this.deployments.set(networkKey, {
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
  } as ISafeDeployment);

  this.metadata.totalDeployments = this.deployments.size;
  this.metadata.activeNetworks = Array.from(this.deployments.keys());
  this.metadata.updatedAt = new Date();

  return await this.save();
};

SafeSchema.methods.getDeployment = function (
  networkKey: string
): ISafeDeployment | undefined {
  return this.deployments.get(networkKey);
};

SafeSchema.methods.updateAnalytics = async function (
  data: Partial<ISafeAnalytics>
): Promise<ISafe> {
  Object.assign(this.analytics, data);
  this.metadata.updatedAt = new Date();
  return await this.save();
};

SafeSchema.methods.isDeployedOnNetwork = function (
  networkKey: string
): boolean {
  const deployment = this.deployments.get(networkKey);
  return (
    deployment?.deploymentStatus === "deployed" && deployment?.isActive === true
  );
};

SafeSchema.methods.getActiveDeployments = function (): ISafeDeployment[] {
  const deployments: ISafeDeployment[] = [];
  for (const [key, deployment] of this.deployments) {
    if (deployment.isActive && deployment.deploymentStatus === "deployed") {
      deployments.push(deployment);
    }
  }
  return deployments;
};

SafeSchema.methods.updateLastActivity = async function (): Promise<ISafe> {
  this.metadata.lastActivityAt = new Date();
  this.metadata.updatedAt = new Date();
  return await this.save();
};

// Static methods
SafeSchema.statics.findByUserId = function (userId: string): Promise<ISafe[]> {
  return this.find({ "userInfo.userId": userId }).exec();
};

SafeSchema.statics.findBySafeId = function (
  safeId: string
): Promise<ISafe | null> {
  return this.findOne({ safeId }).exec();
};

SafeSchema.statics.findByAddress = function (
  address: string
): Promise<ISafe[]> {
  return this.find({
    $or: [
      { "deployments.address": address },
      { "userInfo.walletAddress": address },
    ],
  }).exec();
};

SafeSchema.statics.createSafe = async function (
  safeData: Partial<ISafe>
): Promise<ISafe> {
  const safe = new this(safeData);
  return await safe.save();
};

SafeSchema.statics.getDeploymentStats = async function (): Promise<any> {
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

  const result = await this.aggregate(pipeline).exec();
  return result[0] || { totalSafes: 0, totalDeployments: 0, activeUsers: 0 };
};

// Pre-save middleware
SafeSchema.pre("save", function (next) {
  this.metadata.updatedAt = new Date();
  next();
});

// Create and export the model
const Safe: ISafeModel = mongoose.model<ISafe, ISafeModel>("Safe", SafeSchema);

export default Safe;

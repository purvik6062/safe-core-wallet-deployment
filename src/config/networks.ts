/**
 * Multi-chain network configuration for Safe Deployment & Management Service
 * Supports mainnet and testnet networks across multiple chains
 */

export interface NetworkCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

export interface GasPrice {
  min: number;
  max: number;
  unit: "gwei" | "wei";
}

export interface NetworkConfig {
  name: string;
  rpc: string;
  chainId: number;
  explorer: string;
  currency: NetworkCurrency;
  isTestnet: boolean;
  safeVersion: string;
  features: string[];
  faucets: string[];
  gasPrice: GasPrice;
}

export type NetworkKey =
  | "ethereum"
  | "sepolia"
  | "arbitrum"
  | "arbitrum_sepolia"
  | "polygon"
  | "base"
  | "base_sepolia"
  | "optimism";

export type NetworkGroupKey =
  | "mainnet"
  | "testnet"
  | "lowFee"
  | "highLiquidity"
  | "emerging"
  | "layer2";

export interface FeatureInfo {
  name: string;
  description: string;
}

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  // Ethereum
  ethereum: {
    name: "Ethereum Mainnet",
    rpc: process.env.ETHEREUM_RPC || "https://ethereum-rpc.publicnode.com",
    chainId: 1,
    explorer: "https://etherscan.io",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
    safeVersion: "1.4.1",
    features: ["defi_hub", "highest_liquidity", "most_dapps"],
    faucets: [],
    gasPrice: { min: 20, max: 200, unit: "gwei" },
  },
  sepolia: {
    name: "Ethereum Sepolia",
    rpc:
      process.env.ETHEREUM_SEPOLIA_RPC ||
      "https://ethereum-sepolia-rpc.publicnode.com",
    chainId: 11155111,
    explorer: "https://sepolia.etherscan.io",
    currency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
    isTestnet: true,
    safeVersion: "1.4.1",
    features: ["testing", "development"],
    faucets: [
      "https://www.alchemy.com/faucets/ethereum-sepolia",
      "https://faucet.quicknode.com/ethereum/sepolia",
      "https://sepoliafaucet.com/",
    ],
    gasPrice: { min: 1, max: 20, unit: "gwei" },
  },

  // Arbitrum
  arbitrum: {
    name: "Arbitrum One",
    rpc: process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
    explorer: "https://arbiscan.io",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
    safeVersion: "1.4.1",
    features: ["low_fees", "fast_execution", "derivatives", "gaming"],
    faucets: [],
    gasPrice: { min: 0.1, max: 2, unit: "gwei" },
  },
  arbitrum_sepolia: {
    name: "Arbitrum Sepolia",
    rpc:
      process.env.ARBITRUM_SEPOLIA_RPC ||
      "https://sepolia-rollup.arbitrum.io/rpc",
    chainId: 421614,
    explorer: "https://sepolia.arbiscan.io",
    currency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
    isTestnet: true,
    safeVersion: "1.4.1",
    features: ["testing", "low_fees", "fast_execution"],
    faucets: ["https://www.alchemy.com/faucets/arbitrum-sepolia"],
    gasPrice: { min: 0.01, max: 0.5, unit: "gwei" },
  },

  // Polygon
  polygon: {
    name: "Polygon Mainnet",
    rpc: process.env.POLYGON_RPC || "https://polygon.llamarpc.com",
    chainId: 137,
    explorer: "https://polygonscan.com",
    currency: { name: "Polygon", symbol: "MATIC", decimals: 18 },
    isTestnet: false,
    safeVersion: "1.4.1",
    features: [
      "ultra_low_fees",
      "gaming_tokens",
      "stable_pairs",
      "pos_consensus",
    ],
    faucets: [],
    gasPrice: { min: 30, max: 300, unit: "gwei" },
  },

  // Base
  base: {
    name: "Base Mainnet",
    rpc: process.env.BASE_RPC || "https://mainnet.base.org",
    chainId: 8453,
    explorer: "https://basescan.org",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
    safeVersion: "1.4.1",
    features: [
      "coinbase_integration",
      "social_tokens",
      "emerging_market",
      "low_fees",
    ],
    faucets: [],
    gasPrice: { min: 0.1, max: 2, unit: "gwei" },
  },
  base_sepolia: {
    name: "Base Sepolia",
    rpc: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
    chainId: 84532,
    explorer: "https://sepolia.basescan.org",
    currency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
    isTestnet: true,
    safeVersion: "1.4.1",
    features: ["testing", "low_fees", "coinbase_integration"],
    faucets: [
      "https://www.alchemy.com/faucets/base-sepolia",
      "https://faucet.quicknode.com/base/sepolia",
    ],
    gasPrice: { min: 0.01, max: 0.5, unit: "gwei" },
  },

  // Optimism
  optimism: {
    name: "Optimism Mainnet",
    rpc: process.env.OPTIMISM_RPC || "https://mainnet.optimism.io",
    chainId: 10,
    explorer: "https://optimistic.etherscan.io",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    isTestnet: false,
    safeVersion: "1.4.1",
    features: [
      "low_fees",
      "fast_execution",
      "defi_focus",
      "retroactive_funding",
    ],
    faucets: [],
    gasPrice: { min: 0.001, max: 0.1, unit: "gwei" },
  },
};

// Network groups for easy filtering
export const NETWORK_GROUPS: Record<NetworkGroupKey, NetworkKey[]> = {
  mainnet: ["ethereum", "arbitrum", "polygon", "base", "optimism"],
  testnet: ["sepolia", "arbitrum_sepolia", "base_sepolia"],
  lowFee: ["arbitrum", "polygon", "base", "optimism"],
  highLiquidity: ["ethereum", "arbitrum", "polygon"],
  emerging: ["base"],
  layer2: ["arbitrum", "polygon", "base", "optimism"],
};

// Supported features across networks
export const FEATURES: Record<string, FeatureInfo> = {
  defi_hub: {
    name: "DeFi Hub",
    description: "Primary hub for decentralized finance protocols",
  },
  highest_liquidity: {
    name: "Highest Liquidity",
    description: "Maximum liquidity for token trading",
  },
  most_dapps: {
    name: "Most DApps",
    description: "Largest ecosystem of decentralized applications",
  },
  low_fees: {
    name: "Low Fees",
    description: "Reduced transaction costs",
  },
  ultra_low_fees: {
    name: "Ultra Low Fees",
    description: "Extremely low transaction costs",
  },
  fast_execution: {
    name: "Fast Execution",
    description: "Quick transaction confirmation",
  },
  derivatives: {
    name: "Derivatives",
    description: "Advanced trading instruments and derivatives",
  },
  gaming: {
    name: "Gaming",
    description: "Gaming and NFT focused ecosystem",
  },
  gaming_tokens: {
    name: "Gaming Tokens",
    description: "Specialized gaming token ecosystem",
  },
  stable_pairs: {
    name: "Stable Pairs",
    description: "Strong stablecoin trading pairs",
  },
  coinbase_integration: {
    name: "Coinbase Integration",
    description: "Native Coinbase exchange integration",
  },
  social_tokens: {
    name: "Social Tokens",
    description: "Social and creator token ecosystem",
  },
  emerging_market: {
    name: "Emerging Market",
    description: "New and growing ecosystem",
  },
  pos_consensus: {
    name: "PoS Consensus",
    description: "Proof of Stake consensus mechanism",
  },
  defi_focus: {
    name: "DeFi Focus",
    description: "Focused on decentralized finance",
  },
  retroactive_funding: {
    name: "Retroactive Funding",
    description: "Retroactive public goods funding",
  },
  testing: {
    name: "Testing",
    description: "For development and testing purposes",
  },
  development: {
    name: "Development",
    description: "Development environment",
  },
};

/**
 * Get network configuration by key
 */
export function getNetwork(networkKey: NetworkKey): NetworkConfig {
  const network = NETWORKS[networkKey];
  if (!network) {
    throw new Error(`Unsupported network: ${networkKey}`);
  }
  return network;
}

/**
 * Get networks by group
 */
export function getNetworksByGroup(
  groupName: NetworkGroupKey
): NetworkConfig[] {
  const networkKeys = NETWORK_GROUPS[groupName];
  if (!networkKeys) {
    throw new Error(`Unknown network group: ${groupName}`);
  }
  return networkKeys.map((key) => NETWORKS[key]);
}

/**
 * Get networks by feature
 */
export function getNetworksByFeature(featureName: string): NetworkConfig[] {
  if (!FEATURES[featureName]) {
    throw new Error(`Unknown feature: ${featureName}`);
  }

  return Object.values(NETWORKS).filter((network) =>
    network.features.includes(featureName)
  );
}

/**
 * Check if network is supported
 */
export function isNetworkSupported(
  networkKey: string
): networkKey is NetworkKey {
  return networkKey in NETWORKS;
}

/**
 * Get recommended networks for a use case
 */
export function getRecommendedNetworks(useCase: string): NetworkConfig[] {
  const recommendations: Record<string, NetworkKey[]> = {
    trading: ["arbitrum", "polygon", "base"],
    gaming: ["polygon", "arbitrum"],
    defi: ["ethereum", "arbitrum", "optimism"],
    development: ["sepolia", "arbitrum_sepolia", "base_sepolia"],
    low_cost: ["polygon", "arbitrum", "base"],
    emerging: ["base"],
  };

  const networkKeys = recommendations[useCase] || ["ethereum"];
  return networkKeys.map((key) => NETWORKS[key]);
}

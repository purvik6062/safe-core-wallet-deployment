import express, { Request, Response } from "express";
import {
  NETWORKS,
  NETWORK_GROUPS,
  FEATURES,
  getNetworksByGroup,
  getNetworksByFeature,
  getRecommendedNetworks,
  NetworkGroupKey,
} from "../config/networks.js";

const router = express.Router();

interface GetSupportedNetworksRequest extends Request {
  query: {
    type?: "mainnet" | "testnet" | "all";
  };
}

interface GetNetworksByGroupRequest extends Request {
  params: {
    groupName: NetworkGroupKey;
  };
}

interface GetNetworksByFeatureRequest extends Request {
  params: {
    featureName: string;
  };
}

interface GetRecommendationsRequest extends Request {
  params: {
    useCase: string;
  };
}

/**
 * @route   GET /api/network/supported
 * @desc    Get all supported networks
 * @access  Public
 */
router.get(
  "/supported",
  (req: GetSupportedNetworksRequest, res: Response): void => {
    const { type } = req.query;

    let networks = Object.entries(NETWORKS).map(([key, config]) => ({
      key,
      ...config,
    }));

    if (type === "mainnet") {
      networks = networks.filter((n) => !n.isTestnet);
    } else if (type === "testnet") {
      networks = networks.filter((n) => n.isTestnet);
    }

    res.json({
      success: true,
      data: {
        networks,
        total: networks.length,
        groups: NETWORK_GROUPS,
        features: FEATURES,
      },
    });
  }
);

/**
 * @route   GET /api/network/groups/:groupName
 * @desc    Get networks by group
 * @access  Public
 */
router.get(
  "/groups/:groupName",
  (req: GetNetworksByGroupRequest, res: Response): void => {
    try {
      const { groupName } = req.params;
      const networks = getNetworksByGroup(groupName);

      res.json({
        success: true,
        data: {
          group: groupName,
          networks,
          total: networks.length,
        },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: "Network group not found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route   GET /api/network/features/:featureName
 * @desc    Get networks by feature
 * @access  Public
 */
router.get(
  "/features/:featureName",
  (req: GetNetworksByFeatureRequest, res: Response): void => {
    try {
      const { featureName } = req.params;
      const networks = getNetworksByFeature(featureName);

      res.json({
        success: true,
        data: {
          feature: featureName,
          networks,
          total: networks.length,
        },
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: "Feature not found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @route   GET /api/network/recommendations/:useCase
 * @desc    Get recommended networks for a use case
 * @access  Public
 */
router.get(
  "/recommendations/:useCase",
  (req: GetRecommendationsRequest, res: Response): void => {
    const { useCase } = req.params;
    const recommendations = getRecommendedNetworks(useCase);

    res.json({
      success: true,
      data: {
        useCase,
        recommendations,
        total: recommendations.length,
      },
    });
  }
);

export default router;

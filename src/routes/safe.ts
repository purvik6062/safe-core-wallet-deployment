import express, { Request, Response } from "express";
import { body, param, query } from "express-validator";
import SafeController from "../controllers/SafeController.js";

const router = express.Router();
const safeController = new SafeController();

// Validation middleware for Safe deployment
const validateSafeDeployment = [
  body("userInfo.userId").notEmpty().withMessage("User ID is required"),
  body("userInfo.walletAddress")
    .isEthereumAddress()
    .withMessage("Valid Ethereum address is required"),
  body("config.networks")
    .optional()
    .isArray()
    .withMessage("Networks must be an array"),
];

// Validation middleware for Safe expansion
const validateSafeExpansion = [
  param("safeId").isUUID().withMessage("Valid Safe ID is required"),
  body("networks")
    .isArray({ min: 1 })
    .withMessage("Networks array with at least one network is required"),
];

// Validation middleware for Safe metadata update
const validateSafeMetadataUpdate = [
  param("safeId").isUUID().withMessage("Valid Safe ID is required"),
  body("metadata").isObject().withMessage("Metadata object is required"),
];

// Validation middleware for Safe status update
const validateSafeStatusUpdate = [
  param("safeId").isUUID().withMessage("Valid Safe ID is required"),
  body("status")
    .isIn(["initializing", "active", "suspended", "archived"])
    .withMessage(
      "Status must be one of: initializing, active, suspended, archived"
    ),
];

// Routes
router.post(
  "/deploy",
  validateSafeDeployment,
  async (req: Request, res: Response) => {
    await safeController.deploySafes(req as any, res);
  }
);

router.get("/search", async (req: Request, res: Response) => {
  await safeController.searchSafes(req as any, res);
});

router.get("/health", async (req: Request, res: Response) => {
  await safeController.healthCheck(req, res);
});

router.get("/network/stats", async (req: Request, res: Response) => {
  await safeController.getNetworkStats(req, res);
});

router.get("/address/:address", async (req: Request, res: Response) => {
  await safeController.getSafeByAddress(req as any, res);
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  await safeController.getSafesByUserId(req as any, res);
});

router.get("/user/:userId/stats", async (req: Request, res: Response) => {
  await safeController.getUserStats(req as any, res);
});

router.get("/:safeId", async (req: Request, res: Response) => {
  await safeController.getSafeById(req as any, res);
});

router.post(
  "/:safeId/expand",
  validateSafeExpansion,
  async (req: Request, res: Response) => {
    await safeController.expandSafe(req as any, res);
  }
);

router.put(
  "/:safeId/metadata",
  validateSafeMetadataUpdate,
  async (req: Request, res: Response) => {
    await safeController.updateSafeMetadata(req as any, res);
  }
);

router.put(
  "/:safeId/status",
  validateSafeStatusUpdate,
  async (req: Request, res: Response) => {
    await safeController.updateSafeStatus(req as any, res);
  }
);

export default router;

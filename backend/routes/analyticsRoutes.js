import express from "express";

import {
  getMonthlyAnalytics,
} from "../controllers/analyticsController.js";

import {
  authMiddleware,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/monthly/:month",
  authMiddleware,
  getMonthlyAnalytics
);

export default router;
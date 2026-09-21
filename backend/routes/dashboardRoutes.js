import express from "express";

import { getDashboard } from "../controllers/dashboardController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:month", authMiddleware, getDashboard);

export default router;
import express from "express";
import { getMonthlyReport } from "../controllers/reportController.js";
import {authMiddleware} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/monthly",
  authMiddleware,
  getMonthlyReport
);

export default router;
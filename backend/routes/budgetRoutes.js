import express from "express";

import {
  saveBudget,
  getBudget,
  deleteBudget,
} from "../controllers/budgetController.js";

import { authMiddleware }  from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, saveBudget);

router.get("/", authMiddleware, getBudget);

router.delete("/", authMiddleware, deleteBudget);

export default router;
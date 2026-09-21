
import express from "express";

import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  scanReceipt,
} from "../controllers/expenseController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

import upload from "../middleware/upload.js";

const router = express.Router();

// =====================================================
// CREATE EXPENSE
// =====================================================
router.post(
  "/",
  authMiddleware,
  createExpense
);

// =====================================================
// GET ALL EXPENSES
// =====================================================
router.get(
  "/",
  authMiddleware,
  getExpenses
);

// =====================================================
// SCAN RECEIPT
// =====================================================
router.post(
  "/scan",
  authMiddleware,
  upload.single("receipt"),
  scanReceipt
);

// =====================================================
// GET SINGLE EXPENSE
// =====================================================
router.get(
  "/:id",
  authMiddleware,
  getExpenseById
);

// =====================================================
// UPDATE EXPENSE
// =====================================================
router.put(
  "/:id",
  authMiddleware,
  updateExpense
);

// =====================================================
// DELETE EXPENSE
// =====================================================
router.delete(
  "/:id",
  authMiddleware,
  deleteExpense
);

export default router;


import express from "express";
import multer from "multer";

import {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  getExpenseById,
  scanReceipt,
} from "../controllers/expenseController.js";

import { getDashboard } from "../controllers/dashboardController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// =====================================================
// MULTER CONFIGURATION
// =====================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      "-" +
      file.originalname.replace(/\s+/g, "-");

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, JPEG, PNG and WEBP images are allowed"
        )
      );
    }
  },
});

// =====================================================
// DASHBOARD
// =====================================================

router.get(
  "/dashboard/:month",
  authMiddleware,
  getDashboard
);

// =====================================================
// OCR RECEIPT SCAN
// IMPORTANT: field name = "receipt"
// =====================================================

router.post(
  "/scan",
  authMiddleware,
  upload.single("receipt"),
  scanReceipt
);

// =====================================================
// CREATE EXPENSE
// =====================================================

router.post(
  "/",
  authMiddleware,
  createExpense
);

// =====================================================
// GET EXPENSES
// =====================================================

router.get(
  "/",
  authMiddleware,
  getExpenses
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
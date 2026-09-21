import express from "express";

import {
  saveSalary,
  getSalary,
} from "../controllers/salaryController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, saveSalary);

router.get("/:month", authMiddleware, getSalary);

export default router;
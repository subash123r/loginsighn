import Budget from "../models/Budget.js";
import Expense from "../models/Expense.js";

// =====================================================
// CREATE / UPDATE BUDGET
// =====================================================
export const saveBudget = async (req, res) => {
  try {
    const userId = req.userId;

    const {
      month,
      totalBudget,
      categoryBudgets = {},
    } = req.body;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required",
      });
    }

    if (
      totalBudget === undefined ||
      totalBudget === null ||
      Number(totalBudget) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid total budget is required",
      });
    }

    const budgetData = {
      userId,
      month,
      totalBudget: Number(totalBudget),

      categoryBudgets: {
        Food: Number(categoryBudgets.Food || 0),
        Travel: Number(categoryBudgets.Travel || 0),
        Shopping: Number(categoryBudgets.Shopping || 0),
        Bills: Number(categoryBudgets.Bills || 0),
        Health: Number(categoryBudgets.Health || 0),
        Entertainment: Number(categoryBudgets.Entertainment || 0),
        Education: Number(categoryBudgets.Education || 0),
        Other: Number(categoryBudgets.Other || 0),
      },
    };

    const budget = await Budget.findOneAndUpdate(
      {
        userId,
        month,
      },
      budgetData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Budget saved successfully",
      budget,
    });
  } catch (error) {
    console.error("SAVE BUDGET ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save budget",
      error: error.message,
    });
  }
};

// =====================================================
// GET BUDGET + SPENDING
// =====================================================
export const getBudget = async (req, res) => {
  try {
    const userId = req.userId;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required",
      });
    }

    const budget = await Budget.findOne({
      userId,
      month,
    }).lean();

    // Get expenses for selected month
    const expenses = await Expense.find({
      userId,
      month,
    }).lean();

    const totalSpent = expenses.reduce(
      (total, expense) => total + Number(expense.amount || 0),
      0
    );

    // =================================================
    // CATEGORY SPENDING
    // =================================================

    const categorySpent = {
      Food: 0,
      Travel: 0,
      Shopping: 0,
      Bills: 0,
      Health: 0,
      Entertainment: 0,
      Education: 0,
      Other: 0,
    };

    expenses.forEach((expense) => {
      const category = expense.category || "Other";

      if (categorySpent[category] !== undefined) {
        categorySpent[category] += Number(expense.amount || 0);
      } else {
        categorySpent.Other += Number(expense.amount || 0);
      }
    });

    // No budget created yet
    if (!budget) {
      return res.status(200).json({
        success: true,
        budget: null,
        summary: {
          totalBudget: 0,
          totalSpent,
          remaining: 0,
          percentage: 0,
          exceeded: false,
        },
        categorySpent,
      });
    }

    const totalBudget = Number(budget.totalBudget || 0);

    const remaining = totalBudget - totalSpent;

    const percentage =
      totalBudget > 0
        ? Math.min((totalSpent / totalBudget) * 100, 100)
        : 0;

    // =================================================
    // CATEGORY SUMMARY
    // =================================================

    const categorySummary = {};

    Object.keys(categorySpent).forEach((category) => {
      const budgetAmount = Number(
        budget.categoryBudgets?.[category] || 0
      );

      const spentAmount = Number(categorySpent[category] || 0);

      const categoryRemaining = budgetAmount - spentAmount;

      const categoryPercentage =
        budgetAmount > 0
          ? Math.min((spentAmount / budgetAmount) * 100, 100)
          : 0;

      categorySummary[category] = {
        budget: budgetAmount,
        spent: spentAmount,
        remaining: categoryRemaining,
        percentage: categoryPercentage,
        exceeded:
          budgetAmount > 0 && spentAmount > budgetAmount,
      };
    });

    return res.status(200).json({
      success: true,

      budget,

      summary: {
        totalBudget,
        totalSpent,
        remaining,
        percentage,
        exceeded: totalSpent > totalBudget,
      },

      categorySpent,

      categorySummary,
    });
  } catch (error) {
    console.error("GET BUDGET ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get budget",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE BUDGET
// =====================================================
export const deleteBudget = async (req, res) => {
  try {
    const userId = req.userId;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required",
      });
    }

    const deletedBudget = await Budget.findOneAndDelete({
      userId,
      month,
    });

    if (!deletedBudget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("DELETE BUDGET ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete budget",
      error: error.message,
    });
  }
};
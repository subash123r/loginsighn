import Expense from "../models/Expense.js";
import Salary from "../models/Salary.js";

export const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.userId;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required",
      });
    }

    // Get salary
    const salaryData = await Salary.findOne({
      userId,
      month,
    });

    const salary = Number(salaryData?.amount || 0);

    // Get all expenses for selected month
    const expenses = await Expense.find({
      userId,
      month,
    }).sort({ date: -1 });

    // Total expenses
    const totalExpenses = expenses.reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );

    // Remaining balance
    const remaining = salary - totalExpenses;

    // Category breakdown
    const categoryMap = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Other";

      categoryMap[category] =
        (categoryMap[category] || 0) +
        Number(expense.amount || 0);
    });

    const categoryBreakdown = Object.entries(
      categoryMap
    ).map(([name, value]) => ({
      name,
      value,
    }));

    // Payment method breakdown
    const paymentMap = {};

    expenses.forEach((expense) => {
      const paymentMethod =
        expense.paymentMethod || "Other";

      paymentMap[paymentMethod] =
        (paymentMap[paymentMethod] || 0) +
        Number(expense.amount || 0);
    });

    const paymentMethodBreakdown = Object.entries(
      paymentMap
    ).map(([name, value]) => ({
      name,
      value,
    }));

    // Highest expense
    let highestExpense = null;

    if (expenses.length > 0) {
      highestExpense = expenses.reduce(
        (highest, current) => {
          return Number(current.amount || 0) >
            Number(highest.amount || 0)
            ? current
            : highest;
        }
      );
    }

    // Daily expense trend
    const dailyMap = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.date)
        .toISOString()
        .split("T")[0];

      dailyMap[date] =
        (dailyMap[date] || 0) +
        Number(expense.amount || 0);
    });

    const dailyExpenseTrend = Object.entries(
      dailyMap
    )
      .sort(([dateA], [dateB]) =>
        dateA.localeCompare(dateB)
      )
      .map(([date, amount]) => ({
        date,
        amount,
      }));

    // Percentage spent
    const percentageSpent =
      salary > 0
        ? Number(
            ((totalExpenses / salary) * 100).toFixed(2)
          )
        : 0;

    return res.status(200).json({
      success: true,
      report: {
        month,
        salary,
        totalExpenses,
        remaining,
        percentageSpent,
        expenseCount: expenses.length,
        highestExpense,
        categoryBreakdown,
        paymentMethodBreakdown,
        dailyExpenseTrend,
        expenses,
      },
    });
  } catch (error) {
    console.error(
      "Monthly Report Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate monthly report",
      error: error.message,
    });
  }
};
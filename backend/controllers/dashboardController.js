import Salary from "../models/Salary.js";
import Expense from "../models/Expense.js";

// ==========================================
// PAYMENT METHODS
// ==========================================

const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Other",
];

const normalizePaymentMethod = (value) => {
  return PAYMENT_METHODS.includes(value) ? value : "Other";
};

export const getDashboard = async (req, res) => {
  try {
    const { month } = req.params;

    if (!month) {
      return res.status(400).json({
        message: "Month is required",
      });
    }

    console.log("========== DASHBOARD ==========");
    console.log("USER ID:", req.userId);
    console.log("MONTH:", month);

    // ==========================================
    // GET SALARY
    // ==========================================

    const salaryData = await Salary.findOne({
      userId: req.userId,
      month: month,
    });

    const salary = Number(salaryData?.amount || 0);

    // ==========================================
    // GET ALL EXPENSES
    // ==========================================

    const expenses = await Expense.find({
      userId: req.userId,
      month: month,
    }).sort({ date: -1 });

    console.log("EXPENSE COUNT:", expenses.length);

    expenses.forEach((expense) => {
      console.log(
        expense.itemName,
        "=>",
        Number(expense.amount),
        "Payment:",
        expense.paymentMethod || "Other",
        "Month:",
        expense.month
      );
    });

    // ==========================================
    // TOTAL EXPENSE
    // ==========================================

    const totalExpenses = expenses.reduce((total, expense) => {
      return total + Number(expense.amount || 0);
    }, 0);

    // ==========================================
    // REMAINING BALANCE
    // ==========================================

    const remainingBalance = salary - totalExpenses;

    // ==========================================
    // PERCENTAGE SPENT
    // ==========================================

    const percentageSpent =
      salary > 0
        ? Number(((totalExpenses / salary) * 100).toFixed(2))
        : 0;

    // ==========================================
    // HIGHEST EXPENSE
    // ==========================================

    let highestExpense = null;

    if (expenses.length > 0) {
      highestExpense = expenses.reduce((highest, expense) => {
        return Number(expense.amount || 0) >
          Number(highest.amount || 0)
          ? expense
          : highest;
      });
    }

    // ==========================================
    // CATEGORY BREAKDOWN
    // ==========================================

    const categoryBreakdown = {};

    expenses.forEach((expense) => {
      const category = expense.category || "Other";

      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = 0;
      }

      categoryBreakdown[category] += Number(
        expense.amount || 0
      );
    });

    // ==========================================
    // PAYMENT METHOD BREAKDOWN
    // ==========================================

    const paymentMethodMap = {
      Cash: 0,
      UPI: 0,
      "Credit Card": 0,
      "Debit Card": 0,
      "Bank Transfer": 0,
      Other: 0,
    };

    expenses.forEach((expense) => {
      const paymentMethod = normalizePaymentMethod(
        expense.paymentMethod
      );

      paymentMethodMap[paymentMethod] += Number(
        expense.amount || 0
      );
    });

    const paymentMethodBreakdown = Object.entries(
      paymentMethodMap
    )
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .filter((item) => item.value > 0);

    // ==========================================
    // DAILY EXPENSE TREND
    // ==========================================

    const dailyExpenseMap = {};

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);

      if (isNaN(expenseDate.getTime())) {
        return;
      }

      const day = expenseDate
        .toISOString()
        .split("T")[0];

      if (!dailyExpenseMap[day]) {
        dailyExpenseMap[day] = 0;
      }

      dailyExpenseMap[day] += Number(
        expense.amount || 0
      );
    });

    const dailyExpenseTrend = Object.entries(
      dailyExpenseMap
    )
      .sort(([dateA], [dateB]) =>
        dateA.localeCompare(dateB)
      )
      .map(([date, amount]) => ({
        date,
        amount: Number(amount.toFixed(2)),
      }));

    // ==========================================
    // ALL EXPENSES
    // ==========================================

    const recentExpenses = expenses.map((expense) => ({
      _id: expense._id,
      date: expense.date,
      month: expense.month,
      itemName: expense.itemName,
      amount: Number(expense.amount || 0),
      quantity: Number(expense.quantity || 1),
      category: expense.category || "Other",
      vendor: expense.vendor || "",
      paymentMethod: normalizePaymentMethod(
        expense.paymentMethod
      ),
      receiptImage: expense.receiptImage || "",
      notes: expense.notes || "",
    }));

    // ==========================================
    // CONSOLE LOGS
    // ==========================================

    console.log("TOTAL EXPENSES:", totalExpenses);

    console.log(
      "CATEGORY BREAKDOWN:",
      categoryBreakdown
    );

    console.log(
      "PAYMENT METHOD BREAKDOWN:",
      paymentMethodBreakdown
    );

    console.log(
      "DAILY EXPENSE TREND:",
      dailyExpenseTrend
    );

    console.log(
      "ALL EXPENSES SENT:",
      recentExpenses.length
    );

    console.log("==============================");

    // ==========================================
    // RESPONSE
    // ==========================================

    res.status(200).json({
      month,
      salary,
      totalExpenses,
      remainingBalance,
      expenseCount: expenses.length,
      percentageSpent,
      highestExpense,
      categoryBreakdown,
      paymentMethodBreakdown,
      dailyExpenseTrend,
      recentExpenses,
    });
  } catch (error) {
    console.log("DASHBOARD ERROR:", error);

    res.status(500).json({
      message: "Failed to load dashboard",
      error: error.message,
    });
  }
};
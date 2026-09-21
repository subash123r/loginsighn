import Expense from "../models/Expense.js";

export const getMonthlyAnalytics = async (req, res) => {
  try {
    const { month } = req.params;

    if (!month) {
      return res.status(400).json({
        message: "Month is required",
      });
    }

    // ==========================================
    // CURRENT MONTH EXPENSES
    // ==========================================

    const currentExpenses = await Expense.find({
      userId: req.userId,
      month,
    }).sort({ date: 1 });

    const currentTotal = currentExpenses.reduce(
      (total, expense) => {
        return total + Number(expense.amount || 0);
      },
      0
    );

    // ==========================================
    // PREVIOUS MONTH
    // ==========================================

    const [year, monthNumber] = month
      .split("-")
      .map(Number);

    const previousDate = new Date(
      year,
      monthNumber - 2,
      1
    );

    const previousYear =
      previousDate.getFullYear();

    const previousMonth = String(
      previousDate.getMonth() + 1
    ).padStart(2, "0");

    const previousMonthString =
      `${previousYear}-${previousMonth}`;

    // ==========================================
    // PREVIOUS MONTH EXPENSES
    // ==========================================

    const previousExpenses =
      await Expense.find({
        userId: req.userId,
        month: previousMonthString,
      });

    const previousTotal =
      previousExpenses.reduce(
        (total, expense) => {
          return (
            total +
            Number(expense.amount || 0)
          );
        },
        0
      );

    // ==========================================
    // MONTH DIFFERENCE
    // ==========================================

    const difference =
      currentTotal - previousTotal;

    const percentageChange =
      previousTotal > 0
        ? Number(
            (
              (difference /
                previousTotal) *
              100
            ).toFixed(2)
          )
        : 0;

    // ==========================================
    // AVERAGE DAILY EXPENSE
    // ==========================================

    const daysInMonth =
      new Date(
        year,
        monthNumber,
        0
      ).getDate();

    const averageDailyExpense =
      daysInMonth > 0
        ? Number(
            (
              currentTotal /
              daysInMonth
            ).toFixed(2)
          )
        : 0;

    // ==========================================
    // CATEGORY ANALYTICS
    // ==========================================

    const categoryMap = {};

    currentExpenses.forEach(
      (expense) => {
        const category =
          expense.category ||
          "Other";

        if (!categoryMap[category]) {
          categoryMap[category] = 0;
        }

        categoryMap[category] +=
          Number(expense.amount || 0);
      }
    );

    const categoryAnalytics =
      Object.entries(categoryMap)
        .map(
          ([category, amount]) => ({
            category,
            amount: Number(
              amount.toFixed(2)
            ),
          })
        )
        .sort(
          (a, b) =>
            b.amount - a.amount
        );

    // ==========================================
    // TOP 5 EXPENSES
    // ==========================================

    const topExpenses =
      [...currentExpenses]
        .sort(
          (a, b) =>
            Number(b.amount || 0) -
            Number(a.amount || 0)
        )
        .slice(0, 5)
        .map((expense) => ({
          _id: expense._id,
          date: expense.date,
          itemName:
            expense.itemName,
          amount: Number(
            expense.amount || 0
          ),
          quantity: Number(
            expense.quantity || 1
          ),
          vendor:
            expense.vendor || "",
          category:
            expense.category ||
            "Other",
        }));

    // ==========================================
    // DAILY TREND
    // ==========================================

    const dailyMap = {};

    currentExpenses.forEach(
      (expense) => {
        const date = new Date(
          expense.date
        );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return;
        }

        const day = date
          .toISOString()
          .split("T")[0];

        if (!dailyMap[day]) {
          dailyMap[day] = 0;
        }

        dailyMap[day] +=
          Number(expense.amount || 0);
      }
    );

    const dailyTrend =
      Object.entries(dailyMap)
        .sort(([dateA], [dateB]) =>
          dateA.localeCompare(dateB)
        )
        .map(
          ([date, amount]) => ({
            date,
            amount: Number(
              amount.toFixed(2)
            ),
          })
        );

    // ==========================================
    // HIGHEST CATEGORY
    // ==========================================

    const highestCategory =
      categoryAnalytics.length > 0
        ? categoryAnalytics[0]
        : null;

    // ==========================================
    // RESPONSE
    // ==========================================

    res.status(200).json({
      month,

      previousMonth:
        previousMonthString,

      currentTotal:

        Number(
          currentTotal.toFixed(2)
        ),

      previousTotal:

        Number(
          previousTotal.toFixed(2)
        ),

      difference:

        Number(
          difference.toFixed(2)
        ),

      percentageChange,

      averageDailyExpense,

      transactionCount:
        currentExpenses.length,

      highestCategory,

      categoryAnalytics,

      topExpenses,

      dailyTrend,
    });
  } catch (error) {
    console.error(
      "MONTHLY ANALYTICS ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Failed to load monthly analytics",
      error: error.message,
    });
  }
};
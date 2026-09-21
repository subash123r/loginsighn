import { useEffect, useState } from "react";

import {
  Wallet,
  TrendingDown,
  CreditCard,
  Receipt,
  Plus,
  ScanLine,
  Trash2,
  Save,
  CalendarDays,
  Store,
  Pencil,
  Search,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import {
  getDashboard,
  saveSalary,
} from "../services/dashboardService";

import {
  createExpense,
  deleteExpense,
  updateExpense,
  scanReceipt,
} from "../services/expenseService";

import {
  getBudget,
  saveBudget,
} from "../services/budgetService";

import {
  getMonthlyReport,
} from "../services/reportService";

/* =====================================================
   CONSTANTS
===================================================== */

const categories = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Education",
  "Other",
];

const paymentMethods = [
  "Cash",
  "UPI",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Other",
];

const categoryColors = {
  Food: "#ff6384",
  Travel: "#36a2eb",
  Shopping: "#ffce56",
  Bills: "#4bc0c0",
  Health: "#9966ff",
  Entertainment: "#ff9f40",
  Education: "#8bc34a",
  Other: "#607d8b",
};

const paymentMethodColors = {
  Cash: "#4bc0c0",
  UPI: "#36a2eb",
  "Credit Card": "#9966ff",
  "Debit Card": "#ff6384",
  "Bank Transfer": "#8bc34a",
  Other: "#607d8b",
};

const chartColors = [
  "#ff6384",
  "#36a2eb",
  "#ffce56",
  "#4bc0c0",
  "#9966ff",
  "#ff9f40",
  "#8bc34a",
  "#607d8b",
];

/* =====================================================
   HELPERS
===================================================== */

const getToday = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(
    2,
    "0"
  )}`;
};

const getCurrentMonth = () => {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
};

const normalizeDate = (value) => {
  if (!value) return "";

  try {
    return new Date(value)
      .toISOString()
      .split("T")[0];
  } catch {
    return "";
  }
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

const normalizeBreakdown = (data) => {
  if (Array.isArray(data)) {
    return data
      .map((item) => ({
        name:
          item?.name ||
          item?.category ||
          item?.paymentMethod ||
          "Other",
        value: Number(
          item?.value ??
            item?.amount ??
            item?.total ??
            0
        ),
      }))
      .filter((item) => item.value > 0);
  }

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([name, value]) => ({
        name,
        value: Number(
          value?.value ??
            value?.amount ??
            value?.total ??
            value ??
            0
        ),
      }))
      .filter((item) => item.value > 0);
  }

  return [];
};

const parseOCRAmount = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  const text = String(value)
    .replace(/₹/g, "")
    .replace(/rs\.?/gi, "")
    .replace(/inr/gi, "")
    .replace(/,/g, "")
    .trim();

  const matches = text.match(
    /\d+(?:\.\d{1,2})?/g
  );

  if (!matches) return "";

  const numbers = matches
    .map(Number)
    .filter(Number.isFinite);

  if (!numbers.length) return "";

  return Math.max(...numbers).toString();
};

const extractAmountFromOCRText = (text) => {
  if (!text) return "";

  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const patterns = [
    /grand\s*total[^\d]*([\d,]+(?:\.\d{1,2})?)/i,
    /total\s*amount[^\d]*([\d,]+(?:\.\d{1,2})?)/i,
    /amount\s*payable[^\d]*([\d,]+(?:\.\d{1,2})?)/i,
    /net\s*amount[^\d]*([\d,]+(?:\.\d{1,2})?)/i,
    /payable[^\d]*([\d,]+(?:\.\d{1,2})?)/i,
    /^total[^\d]*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);

      if (match?.[1]) {
        const amount = parseOCRAmount(match[1]);

        if (amount) return amount;
      }
    }
  }

  return "";
};

const getRawOCRText = (response) => {
  return (
    response?.rawText ||
    response?.text ||
    response?.ocrText ||
    response?.data?.rawText ||
    response?.data?.text ||
    response?.data?.ocrText ||
    ""
  );
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [salary, setSalary] = useState("");
  const [savingSalary, setSavingSalary] =
    useState(false);

  const [dashboard, setDashboard] = useState({
    salary: 0,
    totalExpenses: 0,
    remaining: 0,
    percentageSpent: 0,
    expenseCount: 0,
    highestExpense: null,
    categoryBreakdown: [],
    paymentMethodBreakdown: [],
    recentExpenses: [],
    dailyExpenseTrend: [],
  });

  const [loading, setLoading] = useState(false);

  /* =====================================================
     MANUAL EXPENSE
  ===================================================== */

  const [manualExpense, setManualExpense] =
    useState({
      date: getToday(),
      itemName: "",
      amount: "",
      quantity: 1,
      vendor: "",
      category: "Food",
      paymentMethod: "Other",
    });

  /* =====================================================
     OCR
  ===================================================== */

  const [receiptImage, setReceiptImage] =
    useState(null);

  const [receiptPreview, setReceiptPreview] =
    useState("");

  const [scanning, setScanning] =
    useState(false);

  const [showExtracted, setShowExtracted] =
    useState(false);

  const [extractedData, setExtractedData] =
    useState({
      date: getToday(),
      itemName: "",
      amount: "",
      quantity: 1,
      vendor: "",
      category: "Other",
      paymentMethod: "Other",
    });

  /* =====================================================
     EDIT
  ===================================================== */

  const [editingExpense, setEditingExpense] =
    useState(null);

  const [editExpenseData, setEditExpenseData] =
    useState({
      date: "",
      itemName: "",
      amount: "",
      quantity: 1,
      vendor: "",
      category: "Other",
      paymentMethod: "Other",
    });

  /* =====================================================
     SEARCH
  ===================================================== */

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filterCategory, setFilterCategory] =
    useState("All");

  /* =====================================================
     BUDGET
  ===================================================== */

  const [budget, setBudget] = useState({
    totalBudget: "",
    categoryBudgets: {
      Food: "",
      Travel: "",
      Shopping: "",
      Bills: "",
      Health: "",
      Entertainment: "",
      Education: "",
      Other: "",
    },
  });

  const [budgetSummary, setBudgetSummary] =
    useState({
      totalBudget: 0,
      totalSpent: 0,
      remaining: 0,
      percentage: 0,
      exceeded: false,
    });

  const [savingBudget, setSavingBudget] =
    useState(false);

  const [showBudgetForm, setShowBudgetForm] =
    useState(false);

  /* =====================================================
     MONTHLY REPORT
  ===================================================== */

  const [monthlyReport, setMonthlyReport] =
    useState(null);

  const [reportLoading, setReportLoading] =
    useState(false);

  /* =====================================================
     LOAD DASHBOARD
  ===================================================== */

  const loadDashboard = async () => {
    try {
      const response =
        await getDashboard(selectedMonth);

      const data =
        response?.dashboard ||
        response?.data?.dashboard ||
        response?.data ||
        response ||
        {};

      const recentExpenses =
        Array.isArray(data.recentExpenses)
          ? data.recentExpenses
          : Array.isArray(data.expenses)
          ? data.expenses
          : [];

      const salaryValue = Number(
        data.salary ?? 0
      );

      const totalExpenses = Number(
        data.totalExpenses ??
          data.totalExpense ??
          data.expensesTotal ??
          data.totalSpent ??
          0
      );

      /*
        IMPORTANT:
        Always calculate balance here.
        Do not depend on backend "remaining"
        because this prevents the ₹0 bug.
      */
      const remaining =
        salaryValue - totalExpenses;

      const percentageSpent =
        salaryValue > 0
          ? (totalExpenses / salaryValue) * 100
          : 0;

      const dashboardData = {
        salary: salaryValue,

        totalExpenses,

        remaining,

        percentageSpent,

        expenseCount: Number(
          data.expenseCount ??
            recentExpenses.length ??
            0
        ),

        highestExpense:
          data.highestExpense || null,

        categoryBreakdown:
          normalizeBreakdown(
            data.categoryBreakdown
          ),

        paymentMethodBreakdown:
          normalizeBreakdown(
            data.paymentMethodBreakdown
          ),

        recentExpenses,

        dailyExpenseTrend:
          Array.isArray(
            data.dailyExpenseTrend
          )
            ? data.dailyExpenseTrend
            : [],
      };

      setDashboard(dashboardData);

      setSalary(
        data.salary !== undefined
          ? data.salary
          : ""
      );

      return dashboardData;
    } catch (error) {
      console.error(
        "Dashboard Error:",
        error
      );

      return null;
    }
  };

  /* =====================================================
     LOAD BUDGET
  ===================================================== */

  const loadBudget = async (
    expenseTotal = null
  ) => {
    try {
      const response =
        await getBudget(selectedMonth);

      const data =
        response?.budget ||
        response?.data?.budget ||
        response?.data ||
        response ||
        {};

      const totalBudget = Number(
        data.totalBudget ?? 0
      );

      const totalSpent =
        expenseTotal !== null
          ? Number(expenseTotal)
          : Number(data.totalSpent ?? 0);

      const remaining =
        totalBudget - totalSpent;

      const percentage =
        totalBudget > 0
          ? (totalSpent / totalBudget) * 100
          : 0;

      setBudget({
        totalBudget:
          data.totalBudget ?? "",

        categoryBudgets: {
          Food:
            data.categoryBudgets?.Food ?? "",
          Travel:
            data.categoryBudgets?.Travel ?? "",
          Shopping:
            data.categoryBudgets?.Shopping ?? "",
          Bills:
            data.categoryBudgets?.Bills ?? "",
          Health:
            data.categoryBudgets?.Health ?? "",
          Entertainment:
            data.categoryBudgets?.Entertainment ??
            "",
          Education:
            data.categoryBudgets?.Education ??
            "",
          Other:
            data.categoryBudgets?.Other ?? "",
        },
      });

      setBudgetSummary({
        totalBudget,
        totalSpent,
        remaining,
        percentage,
        exceeded: remaining < 0,
      });
    } catch (error) {
      console.error(
        "Budget Error:",
        error
      );
    }
  };

  /* =====================================================
     LOAD REPORT
  ===================================================== */

  const loadMonthlyReport = async () => {
    try {
      setReportLoading(true);

      const response =
        await getMonthlyReport(
          selectedMonth
        );

      const data =
        response?.report ||
        response?.data?.report ||
        response?.data ||
        {};

      setMonthlyReport(data);
    } catch (error) {
      console.error(
        "Report Error:",
        error
      );

      setMonthlyReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  /* =====================================================
     REFRESH EVERYTHING
  ===================================================== */

  const refreshAll = async () => {
    setLoading(true);

    try {
      const dashboardData =
        await loadDashboard();

      await loadBudget(
        dashboardData?.totalExpenses ?? 0
      );

      await loadMonthlyReport();
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    refreshAll();
  }, [selectedMonth]);

  /* =====================================================
     SAVE SALARY
  ===================================================== */

  const handleSaveSalary = async () => {
    const amount = Number(salary);

    if (amount < 0 || salary === "") {
      alert("Enter a valid salary");
      return;
    }

    try {
      setSavingSalary(true);

      await saveSalary({
        month: selectedMonth,
        amount,
      });

      await refreshAll();

      alert("Salary saved successfully");
    } catch (error) {
      console.error(
        "Salary Error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to save salary"
      );
    } finally {
      setSavingSalary(false);
    }
  };

  /* =====================================================
     MANUAL EXPENSE CHANGE
  ===================================================== */

  const handleManualExpenseChange = (e) => {
    const { name, value } = e.target;

    setManualExpense((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =====================================================
     ADD EXPENSE
  ===================================================== */

  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!manualExpense.itemName.trim()) {
      alert("Enter item name");
      return;
    }

    if (
      manualExpense.amount === "" ||
      Number(manualExpense.amount) <= 0
    ) {
      alert("Enter valid amount");
      return;
    }

    try {
      setLoading(true);

      await createExpense({
        ...manualExpense,
        amount: Number(
          manualExpense.amount
        ),
        quantity: Number(
          manualExpense.quantity || 1
        ),
        month: selectedMonth,
      });

      setManualExpense({
        date: getToday(),
        itemName: "",
        amount: "",
        quantity: 1,
        vendor: "",
        category: "Food",
        paymentMethod: "Other",
      });

      await refreshAll();

      alert("Expense added successfully");
    } catch (error) {
      console.error(
        "Add Expense Error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to add expense"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     RECEIPT
  ===================================================== */

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setReceiptImage(file);

    setReceiptPreview(
      URL.createObjectURL(file)
    );
  };

  /* =====================================================
     OCR
  ===================================================== */

  const handleScanReceipt = async () => {
    if (!receiptImage) {
      alert("Select receipt image first");
      return;
    }

    try {
      setScanning(true);

      const response =
        await scanReceipt(receiptImage);

      console.log(
        "OCR RESPONSE:",
        response
      );

      const rawText =
        getRawOCRText(response);

      const extracted =
        response?.extractedData ||
        response?.data?.extractedData ||
        response?.data ||
        response ||
        {};

      let amount =
        extracted.amount ||
        extracted.total ||
        extracted.totalAmount ||
        "";

      if (!amount && rawText) {
        amount =
          extractAmountFromOCRText(
            rawText
          );
      }

      amount = parseOCRAmount(amount);

      setExtractedData({
        date:
          normalizeDate(
            extracted.date
          ) || getToday(),

        itemName:
          extracted.itemName ||
          extracted.item ||
          extracted.description ||
          "Receipt Expense",

        amount,

        quantity: Number(
          extracted.quantity || 1
        ),

        vendor:
          extracted.vendor ||
          extracted.store ||
          extracted.shopName ||
          "",

        category:
          categories.includes(
            extracted.category
          )
            ? extracted.category
            : "Other",

        paymentMethod:
          paymentMethods.includes(
            extracted.paymentMethod
          )
            ? extracted.paymentMethod
            : "Other",
      });

      setShowExtracted(true);
    } catch (error) {
      console.error(
        "OCR Error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to scan receipt"
      );
    } finally {
      setScanning(false);
    }
  };

  const handleExtractedChange = (e) => {
    const { name, value } = e.target;

    setExtractedData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =====================================================
     SAVE OCR EXPENSE
  ===================================================== */

  const handleSaveExtractedExpense =
    async () => {
      if (!extractedData.itemName.trim()) {
        alert("Enter item name");
        return;
      }

      if (
        !extractedData.amount ||
        Number(extractedData.amount) <= 0
      ) {
        alert("Enter valid amount");
        return;
      }

      try {
        setLoading(true);

        await createExpense({
          ...extractedData,
          amount: Number(
            extractedData.amount
          ),
          quantity: Number(
            extractedData.quantity || 1
          ),
          month: selectedMonth,
        });

        setShowExtracted(false);
        setReceiptImage(null);
        setReceiptPreview("");

        setExtractedData({
          date: getToday(),
          itemName: "",
          amount: "",
          quantity: 1,
          vendor: "",
          category: "Other",
          paymentMethod: "Other",
        });

        await refreshAll();

        alert(
          "Receipt expense saved successfully"
        );
      } catch (error) {
        console.error(
          "OCR Save Error:",
          error
        );

        alert(
          error?.response?.data?.message ||
            "Failed to save expense"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDeleteExpense = async (
    id
  ) => {
    if (
      !window.confirm(
        "Delete this expense?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      await deleteExpense(id);

      await refreshAll();

      alert("Expense deleted successfully");
    } catch (error) {
      console.error(
        "Delete Error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to delete expense"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     EDIT
  ===================================================== */

  const handleStartEdit = (expense) => {
    setEditingExpense(expense);

    setEditExpenseData({
      date:
        normalizeDate(expense.date) ||
        getToday(),

      itemName:
        expense.itemName || "",

      amount:
        expense.amount ?? "",

      quantity:
        expense.quantity ?? 1,

      vendor:
        expense.vendor || "",

      category:
        categories.includes(
          expense.category
        )
          ? expense.category
          : "Other",

      paymentMethod:
        paymentMethods.includes(
          expense.paymentMethod
        )
          ? expense.paymentMethod
          : "Other",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditExpenseData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();

    if (!editingExpense?._id) return;

    try {
      setLoading(true);

      await updateExpense(
        editingExpense._id,
        {
          ...editExpenseData,
          amount: Number(
            editExpenseData.amount
          ),
          quantity: Number(
            editExpenseData.quantity || 1
          ),
          month: selectedMonth,
        }
      );

      setEditingExpense(null);

      await refreshAll();

      alert("Expense updated successfully");
    } catch (error) {
      console.error(
        "Update Error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to update expense"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     BUDGET
  ===================================================== */

  const handleBudgetChange = (e) => {
    const { name, value } = e.target;

    setBudget((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryBudgetChange = (
    category,
    value
  ) => {
    setBudget((prev) => ({
      ...prev,
      categoryBudgets: {
        ...prev.categoryBudgets,
        [category]: value,
      },
    }));
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();

    if (
      budget.totalBudget === "" ||
      Number(budget.totalBudget) < 0
    ) {
      alert("Enter valid budget");
      return;
    }

    try {
      setSavingBudget(true);

      await saveBudget({
        month: selectedMonth,
        totalBudget: Number(
          budget.totalBudget
        ),
        categoryBudgets:
          Object.fromEntries(
            categories.map((category) => [
              category,
              Number(
                budget.categoryBudgets[
                  category
                ] || 0
              ),
            ])
          ),
      });

      await loadBudget(
        dashboard.totalExpenses
      );

      setShowBudgetForm(false);

      alert("Budget saved successfully");
    } catch (error) {
      console.error(
        "Budget Save Error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to save budget"
      );
    } finally {
      setSavingBudget(false);
    }
  };

  /* =====================================================
     DATA
  ===================================================== */

  const expenses = Array.isArray(
    dashboard.recentExpenses
  )
    ? dashboard.recentExpenses
    : [];

  const filteredExpenses =
    expenses.filter((expense) => {
      const search =
        searchTerm.toLowerCase().trim();

      const item =
        String(
          expense.itemName || ""
        ).toLowerCase();

      const vendor =
        String(
          expense.vendor || ""
        ).toLowerCase();

      const category =
        expense.category || "Other";

      const searchMatch =
        !search ||
        item.includes(search) ||
        vendor.includes(search);

      const categoryMatch =
        filterCategory === "All" ||
        category === filterCategory;

      return (
        searchMatch &&
        categoryMatch
      );
    });

  /* =====================================================
     CHART DATA
  ===================================================== */

  const categoryChartData =
    normalizeBreakdown(
      dashboard.categoryBreakdown
    ).length > 0
      ? normalizeBreakdown(
          dashboard.categoryBreakdown
        )
      : normalizeBreakdown(
          expenses.reduce(
            (acc, expense) => {
              const category =
                expense.category ||
                "Other";

              acc[category] =
                (acc[category] || 0) +
                Number(
                  expense.amount || 0
                );

              return acc;
            },
            {}
          )
        );

  const paymentChartData =
    normalizeBreakdown(
      dashboard.paymentMethodBreakdown
    ).length > 0
      ? normalizeBreakdown(
          dashboard.paymentMethodBreakdown
        )
      : normalizeBreakdown(
          expenses.reduce(
            (acc, expense) => {
              const method =
                expense.paymentMethod ||
                "Other";

              acc[method] =
                (acc[method] || 0) +
                Number(
                  expense.amount || 0
                );

              return acc;
            },
            {}
          )
        );

  const trendData = Array.isArray(
    dashboard.dailyExpenseTrend
  )
    ? dashboard.dailyExpenseTrend.map(
        (item) => ({
          date: item.date
            ? String(item.date).slice(-5)
            : "",
          amount: Number(
            item.amount || 0
          ),
        })
      )
    : [];

  const salaryPercentage =
    Number(dashboard.salary) > 0
      ? (Number(
          dashboard.totalExpenses
        ) /
          Number(dashboard.salary)) *
        100
      : 0;

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">

      {/* HEADER */}

      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Expense Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Track your monthly income and expenses
            </p>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays
              size={19}
              className="text-slate-500"
            />

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(
                  e.target.value
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>

        </div>

        {/* TOP CARDS */}

        <div className="mb-6 grid gap-4 md:grid-cols-3">

          {/* SALARY */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3">
                <Wallet
                  size={22}
                  className="text-emerald-600"
                />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Monthly Salary
                </h3>

                <p className="text-xs text-slate-500">
                  {selectedMonth}
                </p>
              </div>
            </div>

            <div className="flex">
              <input
                type="number"
                placeholder="Enter salary"
                value={salary}
                onChange={(e) =>
                  setSalary(e.target.value)
                }
                className="w-full rounded-l-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              />

              <button
                onClick={
                  handleSaveSalary
                }
                disabled={savingSalary}
                className="rounded-r-lg bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingSalary
                  ? "Saving"
                  : "Save"}
              </button>
            </div>

          </div>

          {/* RECEIPT */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-purple-50 p-3">
                <ScanLine
                  size={22}
                  className="text-purple-600"
                />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Receipt Scanner
                </h3>

                <p className="text-xs text-slate-500">
                  Scan receipt with OCR
                </p>
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={
                handleReceiptChange
              }
              className="mb-3 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <button
              onClick={
                handleScanReceipt
              }
              disabled={scanning}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <ScanLine size={17} />

              {scanning
                ? "Scanning..."
                : "Scan Receipt"}
            </button>

          </div>

          {/* QUICK ADD */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3">
                <Plus
                  size={22}
                  className="text-blue-600"
                />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Quick Expense
                </h3>

                <p className="text-xs text-slate-500">
                  Add expense manually
                </p>
              </div>
            </div>

            <a
              href="#manual-expense"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-600 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              <Plus size={17} />
              Add Expense
            </a>

          </div>

        </div>

        {/* RECEIPT PREVIEW */}

        {receiptPreview && (
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

            <h3 className="mb-4 font-semibold text-slate-900">
              Receipt Preview
            </h3>

            <div className="flex justify-center">
              <img
                src={receiptPreview}
                alt="Receipt"
                className="max-h-80 max-w-full rounded-xl border object-contain"
              />
            </div>

          </div>
        )}

        {/* OCR RESULT */}

        {showExtracted && (
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Extracted Receipt Details
                </h2>

                <p className="text-sm text-slate-500">
                  Check OCR details before saving
                </p>
              </div>

              <button
                onClick={() =>
                  setShowExtracted(false)
                }
                className="rounded-lg border px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">

              <InputField
                label="Date"
                type="date"
                name="date"
                value={
                  extractedData.date
                }
                onChange={
                  handleExtractedChange
                }
              />

              <InputField
                label="Item Name"
                name="itemName"
                value={
                  extractedData.itemName
                }
                onChange={
                  handleExtractedChange
                }
              />

              <InputField
                label="Amount"
                type="number"
                name="amount"
                value={
                  extractedData.amount
                }
                onChange={
                  handleExtractedChange
                }
              />

              <InputField
                label="Quantity"
                type="number"
                min="1"
                name="quantity"
                value={
                  extractedData.quantity
                }
                onChange={
                  handleExtractedChange
                }
              />

              <InputField
                label="Vendor"
                name="vendor"
                value={
                  extractedData.vendor
                }
                onChange={
                  handleExtractedChange
                }
              />

              <SelectField
                label="Category"
                name="category"
                value={
                  extractedData.category
                }
                options={categories}
                onChange={
                  handleExtractedChange
                }
              />

              <SelectField
                label="Payment Method"
                name="paymentMethod"
                value={
                  extractedData.paymentMethod
                }
                options={
                  paymentMethods
                }
                onChange={
                  handleExtractedChange
                }
              />

            </div>

            <div className="mt-5 flex gap-2">

              <button
                onClick={
                  handleSaveExtractedExpense
                }
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Save size={17} />
                Save Expense
              </button>

              <button
                onClick={() =>
                  setShowExtracted(false)
                }
                className="rounded-lg border px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {/* SUMMARY */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            title="Salary"
            value={dashboard.salary}
            icon={<Wallet size={22} />}
          />

          <SummaryCard
            title="Expenses"
            value={
              dashboard.totalExpenses
            }
            icon={
              <TrendingDown
                size={22}
              />
            }
            danger
          />

          <SummaryCard
            title="Balance"
            value={
              dashboard.remaining
            }
            icon={
              <CreditCard
                size={22}
              />
            }
            danger={
              dashboard.remaining < 0
            }
          />

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Expenses
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {dashboard.expenseCount}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 p-3">
                <Receipt
                  size={22}
                  className="text-slate-600"
                />
              </div>
            </div>

          </div>

        </div>

        {/* BUDGET */}

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Monthly Budget
              </h2>

              <p className="text-sm text-slate-500">
                Set and track your spending limit
              </p>
            </div>

            <button
              onClick={() =>
                setShowBudgetForm(
                  !showBudgetForm
                )
              }
              className="rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              {showBudgetForm
                ? "Close"
                : "Edit Budget"}
            </button>

          </div>

          {showBudgetForm && (
            <form
              onSubmit={
                handleSaveBudget
              }
              className="mb-6 rounded-xl bg-slate-50 p-4"
            >

              <div className="mb-5 max-w-sm">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Total Budget
                </label>

                <input
                  type="number"
                  min="0"
                  name="totalBudget"
                  value={
                    budget.totalBudget
                  }
                  onChange={
                    handleBudgetChange
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                Category Budgets
              </h3>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">

                {categories.map(
                  (category) => (
                    <div
                      key={category}
                    >
                      <label className="mb-1 block text-xs text-slate-500">
                        {category}
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          budget
                            .categoryBudgets[
                            category
                          ]
                        }
                        onChange={(e) =>
                          handleCategoryBudgetChange(
                            category,
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  )
                )}

              </div>

              <button
                type="submit"
                disabled={savingBudget}
                className="mt-5 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <Save size={17} />

                {savingBudget
                  ? "Saving..."
                  : "Save Budget"}
              </button>

            </form>
          )}

          <div className="grid gap-4 md:grid-cols-3">

            <BudgetCard
              title="Budget"
              value={
                budgetSummary.totalBudget
              }
            />

            <BudgetCard
              title="Spent"
              value={
                budgetSummary.totalSpent
              }
              danger
            />

            <BudgetCard
              title="Remaining"
              value={
                budgetSummary.remaining
              }
              danger={
                budgetSummary.remaining <
                0
              }
            />

          </div>

          {budgetSummary.totalBudget >
            0 && (
            <div className="mt-5">

              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium">
                  Budget Usage
                </span>

                <span
                  className={
                    budgetSummary.exceeded
                      ? "font-semibold text-red-600"
                      : "font-semibold text-blue-600"
                  }
                >
                  {Number(
                    budgetSummary.percentage
                  ).toFixed(1)}
                  %
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                <div
                  className={
                    budgetSummary.exceeded
                      ? "h-full bg-red-500"
                      : "h-full bg-blue-600"
                  }
                  style={{
                    width: `${Math.min(
                      budgetSummary.percentage,
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>
          )}

        </div>

        {/* SALARY PROGRESS */}

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="mb-2 flex justify-between">
            <h2 className="font-semibold text-slate-900">
              Salary Spending
            </h2>

            <span className="font-semibold text-slate-700">
              {salaryPercentage.toFixed(
                1
              )}
              %
            </span>
          </div>

          <div className="mb-2 flex justify-between text-sm text-slate-500">
            <span>
              {formatCurrency(
                dashboard.totalExpenses
              )}{" "}
              spent
            </span>

            <span>
              {formatCurrency(
                dashboard.salary
              )}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">

            <div
              className={
                salaryPercentage >= 100
                  ? "h-full bg-red-500"
                  : salaryPercentage >= 80
                  ? "h-full bg-amber-500"
                  : "h-full bg-emerald-500"
              }
              style={{
                width: `${Math.min(
                  salaryPercentage,
                  100
                )}%`,
              }}
            />

          </div>

        </div>

        {/* CHARTS */}

        <div className="mb-6 grid gap-6 lg:grid-cols-2">

          <ChartCard
            title="Category Spending"
            data={categoryChartData}
            colors={categoryColors}
            fallbackColors={chartColors}
          />

          <ChartCard
            title="Payment Method Spending"
            data={paymentChartData}
            colors={
              paymentMethodColors
            }
            fallbackColors={chartColors}
          />

        </div>

        {/* DAILY TREND */}

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Daily Expense Trend
          </h2>

          {trendData.length > 0 ? (
            <div className="h-80 w-full">

              <ResponsiveContainer>
                <LineChart
                  data={trendData}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis dataKey="date" />

                  <YAxis />

                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(
                        value
                      )
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Expense"
                    stroke="#2563eb"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>

            </div>
          ) : (
            <EmptyState text="No daily expense data" />
          )}

        </div>

        {/* MONTHLY REPORT */}

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="mb-5 flex items-center justify-between">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Monthly Report
              </h2>

              <p className="text-sm text-slate-500">
                Financial summary for{" "}
                {selectedMonth}
              </p>
            </div>

            {reportLoading && (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            )}

          </div>

          {monthlyReport && (
            <>
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <ReportCard
                  title="Income"
                  value={
                    monthlyReport.salary
                  }
                />

                <ReportCard
                  title="Expenses"
                  value={
                    monthlyReport.totalExpenses
                  }
                  danger
                />

                <ReportCard
                  title="Balance"
                  value={
                    Number(
                      monthlyReport.salary ||
                        0
                    ) -
                    Number(
                      monthlyReport.totalExpenses ||
                        0
                    )
                  }
                  danger={
                    Number(
                      monthlyReport.salary ||
                        0
                    ) -
                      Number(
                        monthlyReport.totalExpenses ||
                          0
                      ) <
                    0
                  }
                />

                <ReportCard
                  title="Expense Count"
                  value={
                    monthlyReport.expenseCount ||
                    0
                  }
                  currency={false}
                />

              </div>

              <div className="grid gap-6 md:grid-cols-2">

                <div className="rounded-xl border p-4">

                  <h3 className="mb-4 font-semibold">
                    Category Spending
                  </h3>

                  {Array.isArray(
                    monthlyReport.categoryBreakdown
                  ) &&
                  monthlyReport
                    .categoryBreakdown
                    .length > 0 ? (
                    monthlyReport.categoryBreakdown.map(
                      (
                        item,
                        index
                      ) => {
                        const amount =
                          Number(
                            item.value ||
                              0
                          );

                        const total =
                          Number(
                            monthlyReport.totalExpenses ||
                              0
                          );

                        const percentage =
                          total > 0
                            ? (amount /
                                total) *
                              100
                            : 0;

                        return (
                          <div
                            key={`${item.name}-${index}`}
                            className="mb-4"
                          >
                            <div className="mb-1 flex justify-between text-sm">
                              <span>
                                {
                                  item.name
                                }
                              </span>

                              <span className="font-semibold">
                                {formatCurrency(
                                  amount
                                )}
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                              <div
                                className="h-full"
                                style={{
                                  width: `${Math.min(
                                    percentage,
                                    100
                                  )}%`,
                                  backgroundColor:
                                    categoryColors[
                                      item.name
                                    ] ||
                                    chartColors[
                                      index %
                                        chartColors.length
                                    ],
                                }}
                              />

                            </div>
                          </div>
                        );
                      }
                    )
                  ) : (
                    <EmptyState text="No category data" />
                  )}

                </div>

                <div className="rounded-xl border p-4">

                  <h3 className="mb-4 font-semibold">
                    Payment Methods
                  </h3>

                  {Array.isArray(
                    monthlyReport.paymentMethodBreakdown
                  ) &&
                  monthlyReport
                    .paymentMethodBreakdown
                    .length > 0 ? (
                    monthlyReport.paymentMethodBreakdown.map(
                      (
                        item,
                        index
                      ) => {
                        const amount =
                          Number(
                            item.value ||
                              0
                          );

                        const total =
                          Number(
                            monthlyReport.totalExpenses ||
                              0
                          );

                        const percentage =
                          total > 0
                            ? (amount /
                                total) *
                              100
                            : 0;

                        return (
                          <div
                            key={`${item.name}-${index}`}
                            className="mb-4"
                          >
                            <div className="mb-1 flex justify-between text-sm">
                              <span>
                                {
                                  item.name
                                }
                              </span>

                              <span className="font-semibold">
                                {formatCurrency(
                                  amount
                                )}
                              </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                              <div
                                className="h-full"
                                style={{
                                  width: `${Math.min(
                                    percentage,
                                    100
                                  )}%`,
                                  backgroundColor:
                                    paymentMethodColors[
                                      item.name
                                    ] ||
                                    chartColors[
                                      index %
                                        chartColors.length
                                    ],
                                }}
                              />

                            </div>
                          </div>
                        );
                      }
                    )
                  ) : (
                    <EmptyState text="No payment data" />
                  )}

                </div>

              </div>

              {monthlyReport.highestExpense && (
                <div className="mt-5 flex items-center justify-between rounded-xl bg-amber-50 p-4">

                  <div>
                    <p className="text-xs font-medium text-amber-700">
                      Highest Expense
                    </p>

                    <h3 className="font-semibold text-slate-900">
                      {
                        monthlyReport
                          .highestExpense
                          .itemName
                      }
                    </h3>

                    <p className="text-sm text-slate-500">
                      {
                        monthlyReport
                          .highestExpense
                          .category
                      }
                    </p>
                  </div>

                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(
                      monthlyReport
                        .highestExpense
                        .amount
                    )}
                  </p>

                </div>
              )}

            </>
          )}

        </div>

        {/* MANUAL EXPENSE */}

        <div
          id="manual-expense"
          className="mb-6 rounded-2xl bg-white p-5 shadow-sm"
        >

          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Add Expense
            </h2>

            <p className="text-sm text-slate-500">
              Add an expense manually
            </p>
          </div>

          <form
            onSubmit={
              handleAddExpense
            }
          >

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

              <InputField
                label="Date"
                type="date"
                name="date"
                value={
                  manualExpense.date
                }
                onChange={
                  handleManualExpenseChange
                }
              />

              <InputField
                label="Item Name"
                name="itemName"
                placeholder="Eg: Grocery"
                value={
                  manualExpense.itemName
                }
                onChange={
                  handleManualExpenseChange
                }
              />

              <InputField
                label="Amount"
                type="number"
                name="amount"
                placeholder="0"
                value={
                  manualExpense.amount
                }
                onChange={
                  handleManualExpenseChange
                }
              />

              <InputField
                label="Quantity"
                type="number"
                min="1"
                name="quantity"
                value={
                  manualExpense.quantity
                }
                onChange={
                  handleManualExpenseChange
                }
              />

              <InputField
                label="Vendor"
                name="vendor"
                placeholder="Eg: ABC Supermarket"
                value={
                  manualExpense.vendor
                }
                onChange={
                  handleManualExpenseChange
                }
              />

              <SelectField
                label="Category"
                name="category"
                value={
                  manualExpense.category
                }
                options={categories}
                onChange={
                  handleManualExpenseChange
                }
              />

              <SelectField
                label="Payment Method"
                name="paymentMethod"
                value={
                  manualExpense.paymentMethod
                }
                options={
                  paymentMethods
                }
                onChange={
                  handleManualExpenseChange
                }
              />

            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Plus size={17} />

              {loading
                ? "Adding..."
                : "Add Expense"}
            </button>

          </form>

        </div>

        {/* EDIT */}

        {editingExpense && (
          <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

            <div className="mb-5 flex justify-between">

              <div>
                <h2 className="text-lg font-bold">
                  Edit Expense
                </h2>

                <p className="text-sm text-slate-500">
                  Update expense details
                </p>
              </div>

              <button
                onClick={() =>
                  setEditingExpense(
                    null
                  )
                }
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Cancel
              </button>

            </div>

            <form
              onSubmit={
                handleUpdateExpense
              }
            >

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                <InputField
                  label="Date"
                  type="date"
                  name="date"
                  value={
                    editExpenseData.date
                  }
                  onChange={
                    handleEditChange
                  }
                />

                <InputField
                  label="Item Name"
                  name="itemName"
                  value={
                    editExpenseData.itemName
                  }
                  onChange={
                    handleEditChange
                  }
                />

                <InputField
                  label="Amount"
                  type="number"
                  name="amount"
                  value={
                    editExpenseData.amount
                  }
                  onChange={
                    handleEditChange
                  }
                />

                <InputField
                  label="Quantity"
                  type="number"
                  min="1"
                  name="quantity"
                  value={
                    editExpenseData.quantity
                  }
                  onChange={
                    handleEditChange
                  }
                />

                <InputField
                  label="Vendor"
                  name="vendor"
                  value={
                    editExpenseData.vendor
                  }
                  onChange={
                    handleEditChange
                  }
                />

                <SelectField
                  label="Category"
                  name="category"
                  value={
                    editExpenseData.category
                  }
                  options={categories}
                  onChange={
                    handleEditChange
                  }
                />

                <SelectField
                  label="Payment Method"
                  name="paymentMethod"
                  value={
                    editExpenseData.paymentMethod
                  }
                  options={
                    paymentMethods
                  }
                  onChange={
                    handleEditChange
                  }
                />

              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Save size={17} />
                Update Expense
              </button>

            </form>

          </div>
        )}

        {/* ALL EXPENSES */}

        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                All Expenses
              </h2>

              <p className="text-sm text-slate-500">
                Search and manage your expenses
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="flex">

                <div className="flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3">
                  <Search
                    size={17}
                    className="text-slate-500"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(
                      e.target.value
                    )
                  }
                  className="rounded-r-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />

              </div>

              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(
                    e.target.value
                  )
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
              >
                <option value="All">
                  All Categories
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  )
                )}
              </select>

            </div>

          </div>

          {filteredExpenses.length >
          0 ? (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[850px] text-left text-sm">

                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">

                    <th className="px-4 py-3">
                      Date
                    </th>

                    <th className="px-4 py-3">
                      Item
                    </th>

                    <th className="px-4 py-3">
                      Vendor
                    </th>

                    <th className="px-4 py-3">
                      Category
                    </th>

                    <th className="px-4 py-3">
                      Payment
                    </th>

                    <th className="px-4 py-3">
                      Qty
                    </th>

                    <th className="px-4 py-3">
                      Amount
                    </th>

                    <th className="px-4 py-3">
                      Action
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {filteredExpenses.map(
                    (expense) => (
                      <tr
                        key={
                          expense._id ||
                          expense.id
                        }
                        className="border-b last:border-0 hover:bg-slate-50"
                      >

                        <td className="px-4 py-3 text-slate-500">
                          {normalizeDate(
                            expense.date
                          )}
                        </td>

                        <td className="px-4 py-3 font-medium">
                          {
                            expense.itemName
                          }
                        </td>

                        <td className="px-4 py-3">
                          {expense.vendor ||
                            "-"}
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">
                            {expense.category ||
                              "Other"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {expense.paymentMethod ||
                            "Other"}
                        </td>

                        <td className="px-4 py-3">
                          {expense.quantity ||
                            1}
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {formatCurrency(
                            expense.amount
                          )}
                        </td>

                        <td className="px-4 py-3">

                          <div className="flex gap-2">

                            <button
                              onClick={() =>
                                handleStartEdit(
                                  expense
                                )
                              }
                              className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                            >
                              <Pencil
                                size={15}
                              />
                            </button>

                            <button
                              onClick={() =>
                                handleDeleteExpense(
                                  expense._id ||
                                    expense.id
                                )
                              }
                              className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2
                                size={15}
                              />
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          ) : (
            <EmptyState text="No expenses found" />
          )}

        </div>

      </div>

      {/* LOADING */}

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">

          <div className="rounded-xl bg-white px-6 py-4 shadow-lg">

            <div className="flex items-center gap-3">

              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />

              <span className="text-sm font-medium text-slate-700">
                Updating dashboard...
              </span>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

/* =====================================================
   SMALL COMPONENTS
===================================================== */

const InputField = ({
  label,
  ...props
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        {...props}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
};

const SelectField = ({
  label,
  options,
  ...props
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        {...props}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};

const SummaryCard = ({
  title,
  value,
  icon,
  danger = false,
}) => {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${
              danger
                ? "text-red-600"
                : "text-slate-900"
            }`}
          >
            {formatCurrency(value)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
          {icon}
        </div>

      </div>

    </div>
  );
};

const BudgetCard = ({
  title,
  value,
  danger = false,
}) => {
  return (
    <div className="rounded-xl border p-4">

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          danger
            ? "text-red-600"
            : "text-slate-900"
        }`}
      >
        {formatCurrency(value)}
      </p>

    </div>
  );
};

const ReportCard = ({
  title,
  value,
  danger = false,
  currency = true,
}) => {
  return (
    <div className="rounded-xl border p-4">

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          danger
            ? "text-red-600"
            : "text-slate-900"
        }`}
      >
        {currency
          ? formatCurrency(value)
          : value}
      </p>

    </div>
  );
};

const ChartCard = ({
  title,
  data,
  colors,
  fallbackColors,
}) => {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">

      <h2 className="mb-5 text-lg font-bold text-slate-900">
        {title}
      </h2>

      {data.length > 0 ? (
        <div className="h-80 w-full">

          <ResponsiveContainer>
            <PieChart>

              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={105}
                label
              >

                {data.map(
                  (entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={
                        colors[
                          entry.name
                        ] ||
                        fallbackColors[
                          index %
                            fallbackColors.length
                        ]
                      }
                    />
                  )
                )}

              </Pie>

              <Tooltip
                formatter={(value) =>
                  formatCurrency(
                    value
                  )
                }
              />

              <Legend />

            </PieChart>
          </ResponsiveContainer>

        </div>
      ) : (
        <EmptyState text="No expense data" />
      )}

    </div>
  );
};

const EmptyState = ({ text }) => {
  return (
    <div className="flex min-h-32 items-center justify-center text-sm text-slate-400">
      {text}
    </div>
  );
};

export default Dashboard;
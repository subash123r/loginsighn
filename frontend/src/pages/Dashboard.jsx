import { useEffect, useState } from "react";

import {
  Wallet,
  TrendingDown,
  CreditCard,
  Receipt,
  Upload,
  Plus,
  ScanLine,
  Trash2,
  Save,
  CalendarDays,
  Store,
  ChevronDown,
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

import "./Dashboard.css";

// ======================================================
// CONSTANTS
// ======================================================

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

// ======================================================
// HELPERS
// ======================================================

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getCurrentMonth = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
};

const normalizeDate = (date) => {
  if (!date) return "";

  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

// ======================================================
// BREAKDOWN NORMALIZER
// ======================================================

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
      .filter(
        (item) =>
          Number.isFinite(item.value) &&
          item.value > 0
      );
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
      .filter(
        (item) =>
          Number.isFinite(item.value) &&
          item.value > 0
      );
  }

  return [];
};

// ======================================================
// OCR HELPERS
// ======================================================

const parseOCRAmount = (value) => {
  if (value === undefined || value === null) return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value)
    .replace(/₹/gi, "")
    .replace(/rs\.?/gi, "")
    .replace(/inr/gi, "")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "")
    .trim();

  const amount = Number(cleaned);

  return Number.isFinite(amount) ? amount : 0;
};

const extractAmountFromOCRText = (text) => {
  if (!text) return 0;

  const raw = String(text);

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const priorityPatterns = [
    /grand\s*total[^\d₹]*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /net\s*total[^\d₹]*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /amount\s*payable[^\d₹]*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /total\s*amount[^\d₹]*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /bill\s*total[^\d₹]*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /total[^\d₹]*₹?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = raw.match(pattern);

    if (match?.[1]) {
      const amount = parseOCRAmount(match[1]);

      if (amount > 0) {
        return amount;
      }
    }
  }

  for (const line of lines) {
    if (/total|payable|amount/i.test(line)) {
      const numbers = line.match(
        /₹?\s*[\d,]+(?:\.\d{1,2})?/g
      );

      if (numbers?.length) {
        const values = numbers
          .map(parseOCRAmount)
          .filter((value) => value > 0);

        if (values.length) {
          return values[values.length - 1];
        }
      }
    }
  }

  return 0;
};

const getRawOCRText = (response) => {
  return (
    response?.rawText ||
    response?.data?.rawText ||
    response?.ocrText ||
    response?.data?.ocrText ||
    response?.text ||
    response?.data?.text ||
    ""
  );
};

// ======================================================
// CATEGORY DROPDOWN
// ======================================================

const CategoryDropdown = ({
  value,
  onChange,
  open,
  setOpen,
}) => {
  return (
    <div className="position-relative">
      <button
        type="button"
        className="form-control text-start d-flex justify-content-between align-items-center"
        onClick={() => setOpen(!open)}
      >
        <span>{value || "Select Category"}</span>

        <ChevronDown size={18} />
      </button>

      {open && (
        <div
          className="position-absolute bg-white border rounded shadow-sm w-100"
          style={{
            zIndex: 1000,
            top: "100%",
            left: 0,
          }}
        >
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              className="dropdown-item"
              onClick={() => {
                onChange(category);
                setOpen(false);
              }}
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ======================================================
// DASHBOARD
// ======================================================

const Dashboard = () => {
  // ====================================================
  // MAIN STATES
  // ====================================================

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

  // ====================================================
  // MANUAL EXPENSE
  // ====================================================

  const [manualExpense, setManualExpense] = useState({
    date: getToday(),
    itemName: "",
    amount: "",
    quantity: 1,
    vendor: "",
    category: "Food",
    paymentMethod: "Other",
  });

  // ====================================================
  // OCR
  // ====================================================

  const [receiptImage, setReceiptImage] =
    useState(null);

  const [receiptPreview, setReceiptPreview] =
    useState("");

  const [scanning, setScanning] =
    useState(false);

  const [extractedData, setExtractedData] =
    useState({
      date: "",
      itemName: "",
      amount: "",
      quantity: 1,
      vendor: "",
      category: "Other",
      paymentMethod: "Other",
    });

  const [showExtracted, setShowExtracted] =
    useState(false);

  const [categoryOpen, setCategoryOpen] =
    useState(false);

  // ====================================================
  // EDIT EXPENSE
  // ====================================================

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

  // ====================================================
  // SEARCH / FILTER
  // ====================================================

  const [searchTerm, setSearchTerm] =
    useState("");

  const [filterCategory, setFilterCategory] =
    useState("All");

  // ====================================================
  // BUDGET
  // ====================================================

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

  const [categoryBudgetSummary, setCategoryBudgetSummary] =
    useState({});

  const [savingBudget, setSavingBudget] =
    useState(false);

  const [showBudgetForm, setShowBudgetForm] =
    useState(false);

  // ====================================================
  // LOAD DASHBOARD
  // ====================================================

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const response =
        await getDashboard(selectedMonth);

      const data =
        response?.data ||
        response ||
        {};

      setDashboard({
        salary: Number(data.salary || 0),

        totalExpenses: Number(
          data.totalExpenses || 0
        ),

        remaining: Number(
          data.remaining ??
            data.remainingBalance ??
            0
        ),

        percentageSpent: Number(
          data.percentageSpent || 0
        ),

        expenseCount: Number(
          data.expenseCount || 0
        ),

        highestExpense:
          data.highestExpense || null,

        // IMPORTANT FIX
        categoryBreakdown:
          normalizeBreakdown(
            data.categoryBreakdown
          ),

        // IMPORTANT FIX
        paymentMethodBreakdown:
          normalizeBreakdown(
            data.paymentMethodBreakdown
          ),

        recentExpenses:
          Array.isArray(data.recentExpenses)
            ? data.recentExpenses
            : [],

        dailyExpenseTrend:
          Array.isArray(
            data.dailyExpenseTrend
          )
            ? data.dailyExpenseTrend
            : [],
      });

      setSalary(
        data.salary !== undefined
          ? data.salary
          : ""
      );
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // LOAD BUDGET
  // ====================================================

  const loadBudget = async () => {
    try {
      const response =
        await getBudget(selectedMonth);

      const data =
        response?.data ||
        response ||
        {};

      if (data.budget) {
        setBudget({
          totalBudget:
            data.budget.totalBudget || "",

          categoryBudgets: {
            Food:
              data.budget.categoryBudgets?.Food ||
              "",

            Travel:
              data.budget.categoryBudgets?.Travel ||
              "",

            Shopping:
              data.budget.categoryBudgets?.Shopping ||
              "",

            Bills:
              data.budget.categoryBudgets?.Bills ||
              "",

            Health:
              data.budget.categoryBudgets?.Health ||
              "",

            Entertainment:
              data.budget.categoryBudgets
                ?.Entertainment || "",

            Education:
              data.budget.categoryBudgets
                ?.Education || "",

            Other:
              data.budget.categoryBudgets?.Other ||
              "",
          },
        });
      } else {
        setBudget({
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
      }

      setBudgetSummary(
        data.summary || {
          totalBudget: 0,
          totalSpent: 0,
          remaining: 0,
          percentage: 0,
          exceeded: false,
        }
      );

      setCategoryBudgetSummary(
        data.categorySummary || {}
      );
    } catch (error) {
      console.error(
        "Budget loading error:",
        error
      );
    }
  };

  // ====================================================
  // MONTH CHANGE
  // ====================================================

  useEffect(() => {
    loadDashboard();
    loadBudget();
  }, [selectedMonth]);

  // ====================================================
  // SALARY
  // ====================================================

  const handleSaveSalary = async () => {
    if (!salary || Number(salary) <= 0) {
      alert("Please enter a valid salary");
      return;
    }

    try {
      setSavingSalary(true);

      await saveSalary({
        month: selectedMonth,
        amount: Number(salary),
      });

      alert("Salary saved successfully");

      await loadDashboard();
    } catch (error) {
      console.error(
        "Salary save error:",
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

  // ====================================================
  // MANUAL EXPENSE CHANGE
  // ====================================================

  const handleManualExpenseChange = (e) => {
    const { name, value } = e.target;

    setManualExpense((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ====================================================
  // CREATE MANUAL EXPENSE
  // ====================================================

  const handleCreateExpense = async (e) => {
    e.preventDefault();

    if (
      !manualExpense.itemName.trim() ||
      !manualExpense.amount ||
      Number(manualExpense.amount) <= 0
    ) {
      alert(
        "Please enter item name and valid amount"
      );

      return;
    }

    try {
      setLoading(true);

      await createExpense({
        ...manualExpense,

        month: selectedMonth,

        amount: Number(
          manualExpense.amount
        ),

        quantity: Number(
          manualExpense.quantity || 1
        ),

        paymentMethod:
          manualExpense.paymentMethod ||
          "Other",
      });

      alert("Expense added successfully");

      setManualExpense({
        date: getToday(),
        itemName: "",
        amount: "",
        quantity: 1,
        vendor: "",
        category: "Food",
        paymentMethod: "Other",
      });

      await loadDashboard();
      await loadBudget();
    } catch (error) {
      console.error(
        "Create expense error:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Failed to create expense"
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // RECEIPT FILE CHANGE
  // ====================================================

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setReceiptImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setReceiptPreview(previewUrl);
  };

  // ====================================================
  // SCAN RECEIPT
  // ====================================================

  const handleScanReceipt = async () => {
    if (!receiptImage) {
      alert("Please select a receipt image");
      return;
    }

    try {
      setScanning(true);

      console.log(
        "========== STARTING OCR =========="
      );

      const response =
        await scanReceipt(receiptImage);

      console.log(
        "OCR RESPONSE:",
        response
      );

      const data =
        response?.data ||
        response ||
        {};

      const rawText =
        getRawOCRText(response);

      let detectedAmount =
        parseOCRAmount(
          data.amount ??
            data.extractedData?.amount ??
            data.result?.amount
        );

      if (detectedAmount <= 1) {
        const textAmount =
          extractAmountFromOCRText(
            rawText
          );

        if (textAmount > 0) {
          detectedAmount = textAmount;
        }
      }

      const detectedDate =
        data.date ||
        data.extractedData?.date ||
        "";

      const detectedItem =
        data.itemName ||
        data.extractedData?.itemName ||
        "";

      const detectedQuantity =
        Number(
          data.quantity ||
            data.extractedData?.quantity ||
            1
        );

      const detectedVendor =
        data.vendor ||
        data.extractedData?.vendor ||
        "";

      const detectedCategory =
        data.category ||
        data.extractedData?.category ||
        "Other";

      const detectedPaymentMethod =
        data.paymentMethod ||
        data.extractedData
          ?.paymentMethod ||
        "Other";

      setExtractedData({
        date:
          normalizeDate(
            detectedDate
          ) || getToday(),

        itemName:
          detectedItem ||
          "Receipt Expense",

        amount:
          detectedAmount > 0
            ? detectedAmount
            : "",

        quantity:
          detectedQuantity > 0
            ? detectedQuantity
            : 1,

        vendor:
          detectedVendor,

        category:
          categories.includes(
            detectedCategory
          )
            ? detectedCategory
            : "Other",

        paymentMethod:
          paymentMethods.includes(
            detectedPaymentMethod
          )
            ? detectedPaymentMethod
            : "Other",
      });

      setShowExtracted(true);
    } catch (error) {
      console.error(
        "OCR error:",
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

  // ====================================================
  // OCR CHANGE
  // ====================================================

  const handleExtractedChange = (e) => {
    const { name, value } = e.target;

    setExtractedData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ====================================================
  // SAVE SCANNED EXPENSE
  // ====================================================

  const handleSaveScannedExpense =
    async () => {
      if (
        !extractedData.itemName ||
        !extractedData.amount ||
        Number(extractedData.amount) <= 0
      ) {
        alert(
          "Please check item name and amount"
        );

        return;
      }

      try {
        setLoading(true);

        await createExpense({
          ...extractedData,

          month: selectedMonth,

          date:
            extractedData.date ||
            getToday(),

          amount: Number(
            extractedData.amount
          ),

          quantity: Number(
            extractedData.quantity || 1
          ),

          category:
            extractedData.category ||
            "Other",

          paymentMethod:
            extractedData.paymentMethod ||
            "Other",
        });

        alert(
          "Scanned expense saved successfully"
        );

        setShowExtracted(false);

        setExtractedData({
          date: "",
          itemName: "",
          amount: "",
          quantity: 1,
          vendor: "",
          category: "Other",
          paymentMethod: "Other",
        });

        setReceiptImage(null);
        setReceiptPreview("");

        await loadDashboard();
        await loadBudget();
      } catch (error) {
        console.error(
          "Save scanned expense error:",
          error
        );

        alert(
          error?.response?.data?.message ||
            "Failed to save scanned expense"
        );
      } finally {
        setLoading(false);
      }
    };

  // ====================================================
  // DELETE EXPENSE
  // ====================================================

  const handleDeleteExpense =
    async (id) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this expense?"
        )
      ) {
        return;
      }

      try {
        setLoading(true);

        await deleteExpense(id);

        alert(
          "Expense deleted successfully"
        );

        await loadDashboard();
        await loadBudget();
      } catch (error) {
        console.error(
          "Delete expense error:",
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

  // ====================================================
  // EDIT EXPENSE
  // ====================================================

  const handleEditExpense =
    (expense) => {
      setEditingExpense(expense);

      setEditExpenseData({
        date:
          normalizeDate(
            expense.date
          ) || getToday(),

        itemName:
          expense.itemName || "",

        amount:
          expense.amount || "",

        quantity:
          expense.quantity || 1,

        vendor:
          expense.vendor || "",

        category:
          expense.category || "Other",

        paymentMethod:
          paymentMethods.includes(
            expense.paymentMethod
          )
            ? expense.paymentMethod
            : "Other",
      });
    };

  // ====================================================
  // UPDATE EXPENSE
  // ====================================================

  const handleUpdateExpense =
    async () => {
      if (!editingExpense?._id) {
        return;
      }

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

            paymentMethod:
              editExpenseData.paymentMethod ||
              "Other",
          }
        );

        alert(
          "Expense updated successfully"
        );

        setEditingExpense(null);

        await loadDashboard();
        await loadBudget();
      } catch (error) {
        console.error(
          "Update expense error:",
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

  // ====================================================
  // BUDGET
  // ====================================================

  const handleBudgetChange = (e) => {
    const {
      name,
      value,
    } = e.target;

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

  const handleSaveBudget = async () => {
    if (
      !budget.totalBudget ||
      Number(budget.totalBudget) <= 0
    ) {
      alert(
        "Please enter a valid monthly budget"
      );

      return;
    }

    try {
      setSavingBudget(true);

      await saveBudget({
        month: selectedMonth,

        totalBudget:
          Number(
            budget.totalBudget
          ),

        categoryBudgets: {
          Food:
            Number(
              budget.categoryBudgets.Food || 0
            ),

          Travel:
            Number(
              budget.categoryBudgets.Travel || 0
            ),

          Shopping:
            Number(
              budget.categoryBudgets.Shopping || 0
            ),

          Bills:
            Number(
              budget.categoryBudgets.Bills || 0
            ),

          Health:
            Number(
              budget.categoryBudgets.Health || 0
            ),

          Entertainment:
            Number(
              budget.categoryBudgets
                .Entertainment || 0
            ),

          Education:
            Number(
              budget.categoryBudgets
                .Education || 0
            ),

          Other:
            Number(
              budget.categoryBudgets.Other || 0
            ),
        },
      });

      alert(
        "Budget saved successfully"
      );

      await loadBudget();

      setShowBudgetForm(false);
    } catch (error) {
      console.error(
        "Save budget error:",
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

  // ====================================================
  // EXPENSES
  // ====================================================

  const expenses =
    Array.isArray(
      dashboard.recentExpenses
    )
      ? dashboard.recentExpenses
      : [];

  const filteredExpenses =
    expenses.filter((expense) => {
      const search =
        searchTerm.toLowerCase();

      const matchesSearch =
        String(
          expense.itemName || ""
        )
          .toLowerCase()
          .includes(search) ||
        String(
          expense.vendor || ""
        )
          .toLowerCase()
          .includes(search);

      const matchesCategory =
        filterCategory === "All" ||
        expense.category ===
          filterCategory;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  // ====================================================
  // CHART DATA - FIXED
  // ====================================================

  const pieData =
    normalizeBreakdown(
      dashboard.categoryBreakdown
    );

  const paymentMethodPieData =
    normalizeBreakdown(
      dashboard.paymentMethodBreakdown
    );

  // ====================================================
  // CATEGORY FALLBACK
  // ====================================================

  const categoryChartData =
    pieData.length > 0
      ? pieData
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

  // ====================================================
  // PAYMENT METHOD FALLBACK
  // ====================================================

  const paymentChartData =
    paymentMethodPieData.length > 0
      ? paymentMethodPieData
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

  // ====================================================
  // BUDGET CALCULATIONS
  // ====================================================

  const totalBudget =
    Number(
      budgetSummary.totalBudget || 0
    );

  const totalBudgetSpent =
    Number(
      budgetSummary.totalSpent || 0
    );

  const budgetPercentage =
    totalBudget > 0
      ? (totalBudgetSpent /
          totalBudget) *
        100
      : 0;

  const budgetRemaining =
    totalBudget -
    totalBudgetSpent;

  const isBudgetExceeded =
    totalBudget > 0 &&
    budgetPercentage >= 100;

  const isBudgetWarning =
    totalBudget > 0 &&
    budgetPercentage >= 80 &&
    budgetPercentage < 100;

  const isBudgetNormal =
    totalBudget > 0 &&
    budgetPercentage < 80;

  const getBudgetStatus = () => {
    if (isBudgetExceeded) {
      return {
        title: "Budget Exceeded",
        message:
          "You have crossed your monthly budget. Try to control your spending for the remaining days.",
        className: "alert-danger",
        badgeClass: "bg-danger",
        icon: "🚨",
      };
    }

    if (isBudgetWarning) {
      return {
        title: "Budget Warning",
        message:
          "You have used 80% or more of your monthly budget. Spend carefully for the rest of the month.",
        className: "alert-warning",
        badgeClass:
          "bg-warning text-dark",
        icon: "⚠️",
      };
    }

    return {
      title: "Budget Under Control",
      message:
        "Your spending is currently below 80% of your monthly budget.",
      className: "alert-success",
      badgeClass: "bg-success",
      icon: "✅",
    };
  };

  const budgetStatus =
    getBudgetStatus();

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="container-fluid py-4">

      {/* HEADER */}

      <div className="d-flex justify-content-between align-items-center mb-4">

        <div>
          <h2 className="fw-bold mb-1">
            Expense Dashboard
          </h2>

          <p className="text-muted mb-0">
            Track your salary and monthly expenses
          </p>
        </div>

        <div>
          <div className="input-group">
            <span className="input-group-text">
              <CalendarDays size={18} />
            </span>

            <input
              type="month"
              className="form-control"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(
                  e.target.value
                )
              }
            />
          </div>
        </div>

      </div>

      {/* ACTION CARDS */}

      <div className="row g-4 mb-4">

        {/* SALARY */}

        <div className="col-md-4">
          <div className="dashboard-card p-4 h-100">

            <div className="d-flex align-items-center mb-3">
              <Wallet
                size={32}
                className="me-3"
              />

              <div>
                <h5 className="mb-1">
                  Monthly Salary
                </h5>

                <small className="text-muted">
                  {selectedMonth}
                </small>
              </div>
            </div>

            <div className="input-group mb-3">

              <span className="input-group-text">
                ₹
              </span>

              <input
                type="number"
                className="form-control"
                placeholder="Enter salary"
                value={salary}
                onChange={(e) =>
                  setSalary(
                    e.target.value
                  )
                }
              />

            </div>

            <button
              type="button"
              className="btn btn-success w-100"
              onClick={
                handleSaveSalary
              }
              disabled={savingSalary}
            >
              <Save
                size={17}
                className="me-2"
              />

              {savingSalary
                ? "Saving..."
                : "Save Salary"}
            </button>

          </div>
        </div>

        {/* ADD EXPENSE */}

        <div className="col-md-4">
          <div className="dashboard-card p-4 h-100">

            <div className="d-flex align-items-center mb-3">

              <Plus
                size={32}
                className="me-3"
              />

              <div>
                <h5 className="mb-1">
                  Add Expense
                </h5>

                <small className="text-muted">
                  Add expense manually
                </small>
              </div>

            </div>

            <p className="text-muted">
              Enter your expense details manually.
            </p>

            <a
              href="#manual-expense"
              className="btn btn-primary w-100"
            >
              <Plus
                size={17}
                className="me-2"
              />
              Add Expense
            </a>

          </div>
        </div>

        {/* SCAN */}

        <div className="col-md-4">
          <div className="dashboard-card p-4 h-100">

            <div className="d-flex align-items-center mb-3">

              <ScanLine
                size={32}
                className="me-3"
              />

              <div>
                <h5 className="mb-1">
                  Scan Receipt
                </h5>

                <small className="text-muted">
                  AI OCR scanner
                </small>
              </div>

            </div>

            <label className="btn btn-outline-primary w-100">

              <Upload
                size={17}
                className="me-2"
              />

              Choose Receipt

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={
                  handleReceiptChange
                }
              />

            </label>

            {receiptImage && (
              <button
                type="button"
                className="btn btn-primary w-100 mt-2"
                onClick={
                  handleScanReceipt
                }
                disabled={scanning}
              >
                <ScanLine
                  size={17}
                  className="me-2"
                />

                {scanning
                  ? "Scanning..."
                  : "Scan Receipt"}
              </button>
            )}

          </div>
        </div>

      </div>

      {/* RECEIPT PREVIEW */}

      {receiptPreview && (
        <div className="dashboard-card p-4 mb-4">

          <h5 className="mb-3">
            Receipt Preview
          </h5>

          <img
            src={receiptPreview}
            alt="Receipt preview"
            style={{
              maxWidth: "100%",
              maxHeight: "350px",
              objectFit: "contain",
              borderRadius: "10px",
            }}
          />

        </div>
      )}

      {/* OCR RESULT */}

      {showExtracted && (
        <div className="dashboard-card p-4 mb-4">

          <h4 className="mb-1">
            Extracted Receipt Details
          </h4>

          <p className="text-muted">
            Check and edit OCR results before saving
          </p>

          <div className="row g-3">

            <div className="col-md-6">
              <label className="form-label">
                Date
              </label>

              <input
                type="date"
                name="date"
                className="form-control"
                value={
                  extractedData.date
                }
                onChange={
                  handleExtractedChange
                }
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">
                Item Name
              </label>

              <input
                type="text"
                name="itemName"
                className="form-control"
                value={
                  extractedData.itemName
                }
                onChange={
                  handleExtractedChange
                }
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">
                Amount
              </label>

              <div className="input-group">
                <span className="input-group-text">
                  ₹
                </span>

                <input
                  type="number"
                  name="amount"
                  className="form-control"
                  value={
                    extractedData.amount
                  }
                  onChange={
                    handleExtractedChange
                  }
                />
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                name="quantity"
                className="form-control"
                value={
                  extractedData.quantity
                }
                onChange={
                  handleExtractedChange
                }
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">
                Vendor
              </label>

              <input
                type="text"
                name="vendor"
                className="form-control"
                value={
                  extractedData.vendor
                }
                onChange={
                  handleExtractedChange
                }
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">
                Category
              </label>

              <CategoryDropdown
                value={
                  extractedData.category
                }
                open={categoryOpen}
                setOpen={
                  setCategoryOpen
                }
                onChange={(value) =>
                  setExtractedData(
                    (prev) => ({
                      ...prev,
                      category:
                        value,
                    })
                  )
                }
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">
                Payment Method
              </label>

              <select
                className="form-select"
                name="paymentMethod"
                value={
                  extractedData.paymentMethod
                }
                onChange={
                  handleExtractedChange
                }
              >
                {paymentMethods.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  )
                )}
              </select>
            </div>

          </div>

          <div className="d-flex gap-2 mt-4">

            <button
              type="button"
              className="btn btn-success"
              onClick={
                handleSaveScannedExpense
              }
            >
              <Save
                size={17}
                className="me-2"
              />
              Save Expense
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setShowExtracted(false)
              }
            >
              Cancel
            </button>

          </div>

        </div>
      )}

      {/* STAT CARDS */}

      <div className="row g-4 mb-4">

        <div className="col-md-3">
          <div className="dashboard-card p-4">

            <div className="d-flex justify-content-between">

              <div>
                <small className="text-muted">
                  Salary
                </small>

                <h3 className="mt-2">
                  {formatCurrency(
                    dashboard.salary
                  )}
                </h3>
              </div>

              <Wallet />

            </div>

          </div>
        </div>

        <div className="col-md-3">
          <div className="dashboard-card p-4">

            <div className="d-flex justify-content-between">

              <div>
                <small className="text-muted">
                  Total Expenses
                </small>

                <h3 className="mt-2">
                  {formatCurrency(
                    dashboard.totalExpenses
                  )}
                </h3>
              </div>

              <TrendingDown />

            </div>

          </div>
        </div>

        <div className="col-md-3">
          <div className="dashboard-card p-4">

            <div className="d-flex justify-content-between">

              <div>
                <small className="text-muted">
                  Remaining
                </small>

                <h3
                  className={`mt-2 ${
                    dashboard.remaining < 0
                      ? "text-danger"
                      : "text-success"
                  }`}
                >
                  {formatCurrency(
                    dashboard.remaining
                  )}
                </h3>
              </div>

              <CreditCard />

            </div>

          </div>
        </div>

        <div className="col-md-3">
          <div className="dashboard-card p-4">

            <div className="d-flex justify-content-between">

              <div>
                <small className="text-muted">
                  Expenses
                </small>

                <h3 className="mt-2">
                  {dashboard.expenseCount}
                </h3>
              </div>

              <Receipt />

            </div>

          </div>
        </div>

      </div>

      {/* BUDGET PLANNER */}

      <div className="dashboard-card p-4 mb-4">

        <div className="d-flex justify-content-between align-items-center mb-4">

          <div>
            <h3 className="mb-1">
              💰 Monthly Budget
            </h3>

            <p className="text-muted mb-0">
              Plan and control your spending for{" "}
              {selectedMonth}.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              setShowBudgetForm(
                (prev) => !prev
              )
            }
          >
            {showBudgetForm
              ? "Close"
              : "Set Budget"}
          </button>

        </div>

        {budgetSummary.totalBudget > 0 ? (
          <>

            <div
              className={`alert ${budgetStatus.className} d-flex align-items-start gap-3 mb-4`}
              role="alert"
            >

              <div
                style={{
                  fontSize: "28px",
                  lineHeight: 1,
                }}
              >
                {budgetStatus.icon}
              </div>

              <div className="flex-grow-1">

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">

                  <h5 className="mb-1">
                    {budgetStatus.title}
                  </h5>

                  <span
                    className={`badge ${budgetStatus.badgeClass}`}
                  >
                    {budgetPercentage.toFixed(
                      1
                    )}
                    % Used
                  </span>

                </div>

                <p className="mb-0">
                  {budgetStatus.message}
                </p>

              </div>

            </div>

            <div className="row g-3 mb-4">

              <div className="col-md-4">
                <div className="p-3 border rounded">
                  <small className="text-muted">
                    Total Budget
                  </small>

                  <h4 className="mb-0 mt-1">
                    {formatCurrency(
                      totalBudget
                    )}
                  </h4>
                </div>
              </div>

              <div className="col-md-4">
                <div className="p-3 border rounded">
                  <small className="text-muted">
                    Budget Spent
                  </small>

                  <h4 className="mb-0 mt-1">
                    {formatCurrency(
                      totalBudgetSpent
                    )}
                  </h4>
                </div>
              </div>

              <div className="col-md-4">
                <div className="p-3 border rounded">
                  <small className="text-muted">
                    Remaining Budget
                  </small>

                  <h4
                    className={`mb-0 mt-1 ${
                      budgetRemaining < 0
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {formatCurrency(
                      budgetRemaining
                    )}
                  </h4>
                </div>
              </div>

            </div>

            <div className="mb-4">

              <div className="d-flex justify-content-between mb-2">
                <strong>
                  Budget Usage
                </strong>

                <strong
                  className={
                    isBudgetExceeded
                      ? "text-danger"
                      : isBudgetWarning
                      ? "text-warning"
                      : "text-success"
                  }
                >
                  {budgetPercentage.toFixed(
                    1
                  )}
                  %
                </strong>
              </div>

              <div
                className="progress"
                style={{
                  height: "15px",
                }}
              >
                <div
                  className={`progress-bar ${
                    isBudgetExceeded
                      ? "bg-danger"
                      : isBudgetWarning
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                  style={{
                    width: `${Math.min(
                      budgetPercentage,
                      100
                    )}%`,
                  }}
                />
              </div>

              {isBudgetExceeded && (
                <div className="mt-2 text-danger fw-semibold">
                  You exceeded your budget by{" "}
                  {formatCurrency(
                    Math.abs(
                      budgetRemaining
                    )
                  )}
                </div>
              )}

              {isBudgetWarning && (
                <div className="mt-2 text-warning fw-semibold">
                  ⚠️ Only{" "}
                  {formatCurrency(
                    Math.max(
                      budgetRemaining,
                      0
                    )
                  )}{" "}
                  budget remaining.
                </div>
              )}

              {isBudgetNormal && (
                <div className="mt-2 text-success fw-semibold">
                  ✅ You still have{" "}
                  {formatCurrency(
                    budgetRemaining
                  )}{" "}
                  available.
                </div>
              )}

            </div>

            <div>

              <h5 className="mb-3">
                Category Budgets
              </h5>

              <div className="row g-3">

                {categories.map(
                  (category) => {
                    const summary =
                      categoryBudgetSummary[
                        category
                      ] || {};

                    const categorySpent =
                      Number(
                        summary.spent || 0
                      );

                    const categoryBudget =
                      Number(
                        summary.budget || 0
                      );

                    const categoryPercentage =
                      categoryBudget > 0
                        ? (categorySpent /
                            categoryBudget) *
                          100
                        : 0;

                    const categoryExceeded =
                      categoryBudget > 0 &&
                      categoryPercentage >=
                        100;

                    const categoryWarning =
                      categoryBudget > 0 &&
                      categoryPercentage >=
                        80 &&
                      categoryPercentage < 100;

                    return (
                      <div
                        className="col-md-6 col-lg-3"
                        key={category}
                      >

                        <div
                          className={`border rounded p-3 ${
                            categoryExceeded
                              ? "border-danger"
                              : categoryWarning
                              ? "border-warning"
                              : ""
                          }`}
                        >

                          <div className="d-flex justify-content-between">

                            <strong>
                              {category}
                            </strong>

                            {categoryExceeded ? (
                              <span className="text-danger">
                                🚨
                              </span>
                            ) : categoryWarning ? (
                              <span className="text-warning">
                                ⚠️
                              </span>
                            ) : (
                              categoryBudget >
                                0 && (
                                <span className="text-success">
                                  ✓
                                </span>
                              )
                            )}

                          </div>

                          <div className="mt-2">
                            <small className="text-muted">
                              Spent
                            </small>

                            <div>
                              {formatCurrency(
                                categorySpent
                              )}
                            </div>
                          </div>

                          <div className="mt-2">
                            <small className="text-muted">
                              Limit
                            </small>

                            <div>
                              {formatCurrency(
                                categoryBudget
                              )}
                            </div>
                          </div>

                          {categoryBudget >
                            0 && (
                            <>
                              <div className="progress mt-2">
                                <div
                                  className={`progress-bar ${
                                    categoryExceeded
                                      ? "bg-danger"
                                      : categoryWarning
                                      ? "bg-warning"
                                      : "bg-success"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      categoryPercentage,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>

                              <small
                                className={`d-block mt-1 ${
                                  categoryExceeded
                                    ? "text-danger"
                                    : categoryWarning
                                    ? "text-warning"
                                    : "text-success"
                                }`}
                              >
                                {categoryPercentage.toFixed(
                                  1
                                )}
                                % used
                              </small>
                            </>
                          )}

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

          </>
        ) : (
          <div className="text-center py-4">

            <Wallet
              size={45}
              className="mb-3"
            />

            <h5>
              No budget set
            </h5>

            <p className="text-muted">
              Set a monthly budget to track your spending.
            </p>

          </div>
        )}

        {/* SET BUDGET FORM */}

        {showBudgetForm && (
          <div className="border-top pt-4 mt-4">

            <h5 className="mb-3">
              Set Monthly Budget
            </h5>

            <div className="row g-3">

              <div className="col-12">

                <label className="form-label">
                  Total Monthly Budget
                </label>

                <div className="input-group">

                  <span className="input-group-text">
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    name="totalBudget"
                    placeholder="Eg: 20000"
                    value={
                      budget.totalBudget
                    }
                    onChange={
                      handleBudgetChange
                    }
                  />

                </div>

              </div>

              {categories.map(
                (category) => (
                  <div
                    className="col-md-6 col-lg-3"
                    key={category}
                  >

                    <label className="form-label">
                      {category}
                    </label>

                    <div className="input-group">

                      <span className="input-group-text">
                        ₹
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-control"
                        placeholder="0"
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
                      />

                    </div>

                  </div>
                )
              )}

            </div>

            <div className="d-flex gap-2 mt-4">

              <button
                type="button"
                className="btn btn-success"
                onClick={
                  handleSaveBudget
                }
                disabled={
                  savingBudget
                }
              >

                <Save
                  size={17}
                  className="me-2"
                />

                {savingBudget
                  ? "Saving..."
                  : "Save Budget"}

              </button>

            </div>

          </div>
        )}

      </div>

      {/* SPENDING PROGRESS */}

      <div className="dashboard-card p-4 mb-4">

        <div className="d-flex justify-content-between mb-2">

          <h5>
            Spending Progress
          </h5>

          <strong>
            {Number(
              dashboard.percentageSpent ||
                0
            ).toFixed(1)}
            %
          </strong>

        </div>

        <div
          className="progress"
          style={{
            height: "15px",
          }}
        >
          <div
            className={`progress-bar ${
              dashboard.percentageSpent >=
              100
                ? "bg-danger"
                : dashboard.percentageSpent >=
                  80
                ? "bg-warning"
                : "bg-success"
            }`}
            style={{
              width: `${Math.min(
                Number(
                  dashboard.percentageSpent ||
                    0
                ),
                100
              )}%`,
            }}
          />
        </div>

      </div>

      {/* ==================================================
          ANALYTICS
      ================================================== */}

      <div className="row g-4 mb-4">

        {/* CATEGORY SPENDING */}

        <div className="col-lg-6">

          <div className="dashboard-card p-4 h-100">

            <h5 className="mb-4">
              Category Spending
            </h5>

            {categoryChartData.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <PieChart>

                  <Pie
                    data={
                      categoryChartData
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >

                    {categoryChartData.map(
                      (entry, index) => (
                        <Cell
                          key={`category-cell-${index}`}
                          fill={
                            categoryColors[
                              entry.name
                            ] ||
                            chartColors[
                              index %
                                chartColors.length
                            ]
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(value)
                    }
                  />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-5">
                No expense data
              </div>
            )}

          </div>

        </div>

        {/* PAYMENT METHOD */}

        <div className="col-lg-6">

          <div className="dashboard-card p-4 h-100">

            <h5 className="mb-4">
              Payment Method Spending
            </h5>

            {paymentChartData.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height={320}
              >

                <PieChart>

                  <Pie
                    data={
                      paymentChartData
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >

                    {paymentChartData.map(
                      (entry, index) => (
                        <Cell
                          key={`payment-cell-${index}`}
                          fill={
                            paymentMethodColors[
                              entry.name
                            ] ||
                            chartColors[
                              index %
                                chartColors.length
                            ]
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(value)
                    }
                  />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-5">
                No payment method data
              </div>
            )}

          </div>

        </div>

      </div>

      {/* FINANCIAL SUMMARY */}

      <div className="dashboard-card p-4 mb-4">

        <h5 className="mb-4">
          Financial Summary
        </h5>

        <div className="row g-3">

          <div className="col-md-4">
            <div className="border rounded p-3">

              <small className="text-muted">
                Salary
              </small>

              <h5>
                {formatCurrency(
                  dashboard.salary
                )}
              </h5>

            </div>
          </div>

          <div className="col-md-4">
            <div className="border rounded p-3">

              <small className="text-muted">
                Expenses
              </small>

              <h5>
                {formatCurrency(
                  dashboard.totalExpenses
                )}
              </h5>

            </div>
          </div>

          <div className="col-md-4">
            <div className="border rounded p-3">

              <small className="text-muted">
                Remaining Balance
              </small>

              <h3
                className={
                  dashboard.remaining < 0
                    ? "text-danger"
                    : "text-success"
                }
              >
                {formatCurrency(
                  dashboard.remaining
                )}
              </h3>

            </div>
          </div>

        </div>

      </div>

      {/* DAILY TREND */}

      <div className="dashboard-card p-4 mb-4">

        <h5 className="mb-4">
          Daily Expense Trend
        </h5>

        {dashboard.dailyExpenseTrend
          .length > 0 ? (
          <ResponsiveContainer
            width="100%"
            height={320}
          >

            <LineChart
              data={
                dashboard.dailyExpenseTrend
              }
            >

              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis
                dataKey="date"
              />

              <YAxis />

              <Tooltip
                formatter={(value) =>
                  formatCurrency(value)
                }
              />

              <Line
                type="monotone"
                dataKey="amount"
                strokeWidth={3}
              />

            </LineChart>

          </ResponsiveContainer>
        ) : (
          <div className="text-center text-muted py-5">
            No daily expense data
          </div>
        )}

      </div>

      {/* MANUAL EXPENSE */}

      <div
        id="manual-expense"
        className="dashboard-card p-4 mb-4"
      >

        <h4 className="mb-4">
          Add Manual Expense
        </h4>

        <form
          onSubmit={
            handleCreateExpense
          }
        >

          <div className="row g-3">

            <div className="col-md-6">

              <label className="form-label">
                Date
              </label>

              <input
                type="date"
                name="date"
                className="form-control"
                value={
                  manualExpense.date
                }
                onChange={
                  handleManualExpenseChange
                }
              />

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Item Name
              </label>

              <input
                type="text"
                name="itemName"
                className="form-control"
                placeholder="Eg: Grocery"
                value={
                  manualExpense.itemName
                }
                onChange={
                  handleManualExpenseChange
                }
              />

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Amount
              </label>

              <div className="input-group">

                <span className="input-group-text">
                  ₹
                </span>

                <input
                  type="number"
                  name="amount"
                  className="form-control"
                  placeholder="850"
                  value={
                    manualExpense.amount
                  }
                  onChange={
                    handleManualExpenseChange
                  }
                />

              </div>

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                name="quantity"
                className="form-control"
                value={
                  manualExpense.quantity
                }
                onChange={
                  handleManualExpenseChange
                }
              />

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Vendor
              </label>

              <div className="input-group">

                <span className="input-group-text">
                  <Store size={17} />
                </span>

                <input
                  type="text"
                  name="vendor"
                  className="form-control"
                  placeholder="ABC Supermarket"
                  value={
                    manualExpense.vendor
                  }
                  onChange={
                    handleManualExpenseChange
                  }
                />

              </div>

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Category
              </label>

              <CategoryDropdown
                value={
                  manualExpense.category
                }
                open={categoryOpen}
                setOpen={
                  setCategoryOpen
                }
                onChange={(value) =>
                  setManualExpense(
                    (prev) => ({
                      ...prev,
                      category:
                        value,
                    })
                  )
                }
              />

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Payment Method
              </label>

              <select
                className="form-select"
                name="paymentMethod"
                value={
                  manualExpense.paymentMethod
                }
                onChange={
                  handleManualExpenseChange
                }
              >

                {paymentMethods.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          <button
            type="submit"
            className="btn btn-primary mt-4"
          >

            <Plus
              size={17}
              className="me-2"
            />

            Add Expense

          </button>

        </form>

      </div>

      {/* CATEGORY BREAKDOWN */}

      <div className="row g-4 mb-4">

        <div className="col-lg-8">

          <div className="dashboard-card p-4">

            <h5 className="mb-4">
              Category Breakdown
            </h5>

            {categoryChartData.length >
            0 ? (
              categoryChartData.map(
                (item, index) => {

                  const name =
                    item.name ||
                    "Other";

                  const amount =
                    Number(
                      item.value || 0
                    );

                  return (
                    <div
                      key={name}
                      className="mb-3"
                    >

                      <div className="d-flex justify-content-between mb-1">

                        <span>
                          {name}
                        </span>

                        <strong>
                          {formatCurrency(
                            amount
                          )}
                        </strong>

                      </div>

                      <div className="progress">

                        <div
                          className="progress-bar"
                          style={{
                            width: `${
                              dashboard.totalExpenses
                                ? Math.min(
                                    (amount /
                                      dashboard.totalExpenses) *
                                      100,
                                    100
                                  )
                                : 0
                            }%`,

                            backgroundColor:
                              categoryColors[
                                name
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
              <div className="text-center text-muted py-4">
                No category data
              </div>
            )}

          </div>

        </div>

        {/* HIGHEST EXPENSE */}

        <div className="col-lg-4">

          <div className="dashboard-card p-4 h-100">

            <h5 className="mb-4">
              Highest Expense
            </h5>

            {dashboard.highestExpense ? (
              <>

                <Receipt
                  size={40}
                  className="mb-3"
                />

                <h5>
                  {
                    dashboard
                      .highestExpense
                      .itemName
                  }
                </h5>

                <h3>
                  {formatCurrency(
                    dashboard
                      .highestExpense
                      .amount
                  )}
                </h3>

                <p className="text-muted mb-0">
                  {
                    dashboard
                      .highestExpense
                      .category
                  }
                </p>

              </>
            ) : (
              <div className="text-muted">
                No expenses yet
              </div>
            )}

          </div>

        </div>

      </div>

      {/* EDIT EXPENSE */}

      {editingExpense && (
        <div className="dashboard-card p-4 mb-4">

          <div className="d-flex justify-content-between align-items-center mb-4">

            <h4 className="mb-0">
              Edit Expense
            </h4>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() =>
                setEditingExpense(null)
              }
            >
              Cancel
            </button>

          </div>

          <div className="row g-3">

            <div className="col-md-6">

              <label className="form-label">
                Date
              </label>

              <input
                type="date"
                className="form-control"
                value={
                  editExpenseData.date
                }
                onChange={(e) =>
                  setEditExpenseData(
                    (prev) => ({
                      ...prev,
                      date:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Item Name
              </label>

              <input
                type="text"
                className="form-control"
                value={
                  editExpenseData.itemName
                }
                onChange={(e) =>
                  setEditExpenseData(
                    (prev) => ({
                      ...prev,
                      itemName:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Amount
              </label>

              <input
                type="number"
                className="form-control"
                value={
                  editExpenseData.amount
                }
                onChange={(e) =>
                  setEditExpenseData(
                    (prev) => ({
                      ...prev,
                      amount:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Quantity
              </label>

              <input
                type="number"
                min="1"
                className="form-control"
                value={
                  editExpenseData.quantity
                }
                onChange={(e) =>
                  setEditExpenseData(
                    (prev) => ({
                      ...prev,
                      quantity:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Vendor
              </label>

              <input
                type="text"
                className="form-control"
                value={
                  editExpenseData.vendor
                }
                onChange={(e) =>
                  setEditExpenseData(
                    (prev) => ({
                      ...prev,
                      vendor:
                        e.target.value,
                    })
                  )
                }
              />

            </div>

            <div className="col-md-6">

              <label className="form-label">
                Category
              </label>

              <select
                className="form-select"
                value={
                  editExpenseData.category
                }
                onChange={(e) =>
                  setEditExpenseData(
                    (prev) => ({
                      ...prev,
                      category:
                        e.target.value,
                    })
                  )
                }
              >

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

            <div className="col-md-6">

              <label className="form-label">
                Payment Method
              </label>

              <select
                className="form-select"
                value={
                  editExpenseData.paymentMethod
                }
                onChange={(e) =>
                  setEditExpenseData(
                    (prev) => ({
                      ...prev,
                      paymentMethod:
                        e.target.value,
                    })
                  )
                }
              >

                {paymentMethods.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

          <button
            type="button"
            className="btn btn-success mt-4"
            onClick={
              handleUpdateExpense
            }
          >

            <Save
              size={17}
              className="me-2"
            />

            Update Expense

          </button>

        </div>
      )}

      {/* ALL EXPENSES */}

      <div className="dashboard-card p-4 mb-4">

        <div className="d-flex justify-content-between align-items-center mb-4">

          <h4 className="mb-0">
            All Expenses
          </h4>

          <span className="badge bg-primary">
            {filteredExpenses.length}
          </span>

        </div>

        {/* SEARCH */}

        <div className="row g-3 mb-4">

          <div className="col-md-8">

            <div className="input-group">

              <span className="input-group-text">
                <Search size={18} />
              </span>

              <input
                type="text"
                className="form-control"
                placeholder="Search item or vendor..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          <div className="col-md-4">

            <select
              className="form-select"
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(
                  e.target.value
                )
              }
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

        {/* TABLE */}

        {filteredExpenses.length >
        0 ? (
          <div className="table-responsive">

            <table className="table table-hover align-middle">

              <thead>

                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Payment Method</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Actions</th>
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
                    >

                      <td>
                        {normalizeDate(
                          expense.date
                        )}
                      </td>

                      <td>
                        <strong>
                          {
                            expense.itemName
                          }
                        </strong>
                      </td>

                      <td>
                        {expense.vendor ||
                          "-"}
                      </td>

                      <td>
                        <span className="badge bg-light text-dark">
                          {
                            expense.category ||
                            "Other"
                          }
                        </span>
                      </td>

                      <td>

                        <span
                          className={`badge ${
                            expense.paymentMethod ===
                            "UPI"
                              ? "bg-primary"
                              : expense.paymentMethod ===
                                "Cash"
                              ? "bg-success"
                              : expense.paymentMethod ===
                                "Credit Card"
                              ? "bg-warning text-dark"
                              : expense.paymentMethod ===
                                "Debit Card"
                              ? "bg-info text-dark"
                              : expense.paymentMethod ===
                                "Bank Transfer"
                              ? "bg-secondary"
                              : "bg-light text-dark"
                          }`}
                        >
                          {expense.paymentMethod ||
                            "Other"}
                        </span>

                      </td>

                      <td>
                        {
                          expense.quantity ||
                          1
                        }
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            expense.amount
                          )}
                        </strong>
                      </td>

                      <td>

                        <div className="d-flex gap-2">

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() =>
                              handleEditExpense(
                                expense
                              )
                            }
                          >
                            <Pencil
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              handleDeleteExpense(
                                expense._id ||
                                  expense.id
                              )
                            }
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
          <div className="text-center py-5">

            <Receipt
              size={45}
              className="text-muted mb-3"
            />

            <h5>
              No expenses found
            </h5>

            <p className="text-muted mb-0">
              Add an expense to see it here.
            </p>

          </div>
        )}

      </div>

      {/* LOADING */}

      {loading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{
            background:
              "rgba(0,0,0,0.35)",
            zIndex: 9999,
          }}
        >

          <div className="bg-white rounded p-4 shadow text-center">

            <div
              className="spinner-border mb-3"
              role="status"
            />

            <div>
              Loading...
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default Dashboard;
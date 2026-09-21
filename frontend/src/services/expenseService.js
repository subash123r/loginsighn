import axios from "axios";

const API_URL = "http://localhost:3000/api";

// ==========================================
// GET ALL EXPENSES
// ==========================================
export const getExpenses = async () => {
  const token = localStorage.getItem("token");

  const response = await axios.get(`${API_URL}/expenses`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// ==========================================
// CREATE EXPENSE
// ==========================================
export const createExpense = async (expenseData) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    `${API_URL}/expenses`,
    expenseData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

// ==========================================
// UPDATE EXPENSE
// ==========================================
export const updateExpense = async (expenseId, expenseData) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `${API_URL}/expenses/${expenseId}`,
    expenseData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

// ==========================================
// DELETE EXPENSE
// ==========================================
export const deleteExpense = async (expenseId) => {
  const token = localStorage.getItem("token");

  const response = await axios.delete(
    `${API_URL}/expenses/${expenseId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ==========================================
// SCAN RECEIPT - OCR
// ==========================================
export const scanReceipt = async (file) => {
  const token = localStorage.getItem("token");

  if (!file) {
    throw new Error("Receipt file is required");
  }

  const formData = new FormData();

  // IMPORTANT:
  // Backend multer must use upload.single("receipt")
  formData.append("receipt", file);

  console.log("OCR FILE:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  const response = await axios.post(
    `${API_URL}/expenses/scan`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
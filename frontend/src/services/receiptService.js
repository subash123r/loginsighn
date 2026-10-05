
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// ===============================
// SCAN RECEIPT
// ===============================
export const scanReceipt = async (file) => {
  const token = localStorage.getItem("token");

  if (!file) {
    throw new Error("Receipt file is required");
  }

  const formData = new FormData();

  formData.append("receipt", file);

  const response = await axios.post(
    `${API_URL}/api/receipt/scan`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ===============================
// UPDATE EXPENSE
// ===============================
export const updateExpense = async (expenseId, expenseData) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `${API_URL}/api/expenses/${expenseId}`,
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



import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getExpenses = async () => {
  const response = await axios.get(
    `${API_URL}/api/expenses`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

export const createExpense = async (expenseData) => {
  const response = await axios.post(
    `${API_URL}/api/expenses`,
    expenseData,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

export const updateExpense = async (expenseId, expenseData) => {
  const response = await axios.put(
    `${API_URL}/api/expenses/${expenseId}`,
    expenseData,
    {
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

export const deleteExpense = async (expenseId) => {
  const response = await axios.delete(
    `${API_URL}/api/expenses/${expenseId}`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};

export const scanReceipt = async (file) => {
  if (!file) {
    throw new Error("Receipt file is required");
  }

  const formData = new FormData();

  formData.append("receipt", file);

  const response = await axios.post(
    `${API_URL}/api/expenses/scan`,
    formData,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};


import axios from "axios";

const API_URL = "http://localhost:3000/api/receipt";

export const scanReceipt = async (file) => {
  const token = localStorage.getItem("token");

  const formData = new FormData();

  formData.append("receipt", file);

  const response = await axios.post(
    `${API_URL}/scan`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

export const updateExpense = async (expenseId, expenseData) => {
  const token = localStorage.getItem("token");

  const response = await axios.put(
    `http://localhost:3000/api/expenses/${expenseId}`,
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

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// Save / Update Budget
export const saveBudget = async (budgetData) => {
  const response = await axios.post(
    `${API_URL}/api/budget`,
    budgetData,
    getAuthConfig()
  );

  return response.data;
};

// Get Budget
export const getBudget = async (month) => {
  const response = await axios.get(
    `${API_URL}/api/budget?month=${month}`,
    getAuthConfig()
  );

  return response.data;
};

// Delete Budget
export const deleteBudget = async (month) => {
  const response = await axios.delete(
    `${API_URL}/api/budget?month=${month}`,
    getAuthConfig()
  );

  return response.data;
};


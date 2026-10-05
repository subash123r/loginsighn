
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// ===============================
// GET DASHBOARD
// ===============================
export const getDashboard = async (month) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/api/dashboard/${month}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ===============================
// SAVE / UPDATE SALARY
// ===============================
export const saveSalary = async (salaryData) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    `${API_URL}/api/salary`,
    salaryData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

// ===============================
// GET MONTHLY ANALYTICS
// ===============================
export const getMonthlyAnalytics = async (month) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/api/analytics/monthly/${month}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};


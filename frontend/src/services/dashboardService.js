import axios from "axios";

const API_URL = "http://localhost:3000/api";

// ===============================
// GET DASHBOARD
// ===============================
export const getDashboard = async (month) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/expenses/dashboard/${month}`,
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
    `${API_URL}/salary`,
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

export const getMonthlyAnalytics = async (
  month
) => {
  const token =
    localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/analytics/monthly/${month}`,
    {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
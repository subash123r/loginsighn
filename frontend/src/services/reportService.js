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

// ===============================
// GET MONTHLY REPORT
// ===============================
export const getMonthlyReport = async (month) => {
  const response = await axios.get(
    `${API_URL}/api/report/monthly?month=${month}`,
    getAuthConfig()
  );

  return response.data;
};


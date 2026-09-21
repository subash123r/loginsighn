import axios from "axios";

const API_URL = "http://localhost:3000/api/report";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getMonthlyReport = async (month) => {
  const response = await axios.get(
    `${API_URL}/monthly?month=${month}`,
    getAuthConfig()
  );

  return response.data;
};
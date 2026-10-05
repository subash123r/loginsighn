import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

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
// GET SALARY
// ===============================
export const getSalary = async (month) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/api/salary/${month}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};


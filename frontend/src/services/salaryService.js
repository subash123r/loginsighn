import axios from "axios";

const API_URL = "http://localhost:3000/api/salary";

// SAVE / UPDATE SALARY
export const saveSalary = async (salaryData) => {
  const token = localStorage.getItem("token");

  const response = await axios.post(
    API_URL,
    salaryData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// GET SALARY
export const getSalary = async (month) => {
  const token = localStorage.getItem("token");

  const response = await axios.get(
    `${API_URL}/${month}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
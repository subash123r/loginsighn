import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const signupUser = async (userData) => {
  const response = await axios.post(
    `${API_URL}/api/auth/signup`,
    userData
  );

  return response.data;
};

export const loginUser = async (loginData) => {
  const response = await axios.post(
    `${API_URL}/api/auth/login`,
    loginData
  );

  return response.data;
};

export const getProfile = async () => {
  const response = await axios.get(
    `${API_URL}/api/auth/profile`,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
};
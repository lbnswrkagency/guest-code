import axios from "axios";

export const registerUser = async (name, email, password) => {
  try {
    const response = await axios.post("/api/auth/register", {
      name,
      email,
      password,
    });

    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

import axios from "axios";

// Keep only one interceptor (move it to axiosConfig.js)

export const login = async (credentials) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/auth/login`,
      credentials,
      { withCredentials: false }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchUserData = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("No token found");
    }

    // Remove the "Authorization" header here, as it will be set by the interceptor
    const response = await axios.get(
      `${process.env.REACT_APP_API_BASE_URL}/auth/user`
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching user data: ", error);
    throw error;
  }
};

export const logout = async (navigate) => {
  try {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    await axios.post(`${process.env.REACT_APP_API_BASE_URL}/auth/logout`);
    navigate("/");
  } catch (error) {
    console.error("Error during logout: ", error);
  }
};

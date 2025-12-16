import axios from "axios";

// Keep only one interceptor (move it to axiosConfig.js)

export const login = async (formData) => {
  console.log("🔄 LoginFunction: Starting login request...");
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/auth/login`,
      formData
    );

    console.log("✅ LoginFunction: Received successful response", {
      hasToken: !!response.data.token,
      hasUser: !!response.data.user,
    });

    // Store the tokens in localStorage
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("refreshToken", response.data.refreshToken);

    console.log("💾 LoginFunction: Tokens stored in localStorage");
    return {
      success: true,
      user: response.data.user,
      token: response.data.token,
    };
  } catch (error) {
    console.error("❌ LoginFunction: Error during login", {
      status: error.response?.status,
      message: error.response?.data?.message,
      details: error.response?.data?.details,
    });
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

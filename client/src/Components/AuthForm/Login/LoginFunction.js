import axios from "axios";

// Add the token to the header of axios requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const loginUser = async (credentials) => {
  try {
    // Extract email and password directly from credentials
    const { email, password } = credentials;

    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/auth/login`,
      { email, password }, // Send email and password directly
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error during login: ",
      error.response?.data || error.message
    );
    throw error.response?.data || error;
  }
};

export const login = async (formData) => {
  try {
    const response = await loginUser(formData);
    return response;
  } catch (error) {
    console.error("Error during login: ", error);
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
    // Clear the user data and token from the local storage
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Make a call to the backend to clear the refresh token cookie
    await axios.post(`${process.env.REACT_APP_API_BASE_URL}/auth/logout`);

    // Redirect to the root domain
    navigate("/");
  } catch (error) {
    console.error("Error during logout: ", error);
  }
};

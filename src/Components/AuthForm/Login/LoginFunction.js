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

export const loginUser = async (email, password) => {
  try {
    const response = await axios.post("/api/auth/login", {
      email,
      password,
    });
    return response.data;
  } catch (error) {
    console.error("Error during login: ", error.response.data);
    throw error;
  }
};

export const login = async (email, password, navigate, setUser) => {
  try {
    const { token } = await loginUser(email, password);

    if (token) {
      localStorage.setItem("token", token); // Save the token in the local storage
      const userData = await fetchUserData(); // Fetch the user data
      setUser(userData); // Set the user state after a successful login
      navigate("/dashboard");
    } else {
      throw new Error("No token received");
    }
  } catch (error) {
    console.error("Error during login: ", error);
  }
};

export const fetchUserData = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("No token found");
    }

    // Remove the "Authorization" header here, as it will be set by the interceptor
    const response = await axios.get("/api/auth/user");

    return response.data;
  } catch (error) {
    console.error("Error fetching user data: ", error);
    throw error;
  }
};

export const logout = () => {
  // Clear the user data and token from the local storage
  localStorage.removeItem("user");
  localStorage.removeItem("token");
};

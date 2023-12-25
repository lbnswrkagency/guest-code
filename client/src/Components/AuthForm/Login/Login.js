import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import AuthContext from "../../../contexts/AuthContext";
import "../AuthForm.scss";
import AuthForm from "../AuthForm";

const Login = () => {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/login`,
        formData
      );

      console.log("Login response:", response.data); // Log the response data

      const { accessToken } = response.data; // Ensure this matches the backend response

      if (accessToken) {
        localStorage.setItem("token", accessToken);
        await fetchUserData();
        navigate("/dashboard");
      } else {
        console.error("No access token received");
      }
    } catch (error) {
      console.error("Error during login: ", error);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/auth/user`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  };

  return (
    <AuthForm>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="identifier"
          placeholder="Username or Email"
          value={formData.identifier}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />
        <button type="submit">Login</button>
      </form>
      {/* <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p> */}
    </AuthForm>
  );
};

export default Login;

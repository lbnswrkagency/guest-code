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
        formData,
        { withCredentials: true } // Include this line
      );

      const { accessToken } = response.data;
      if (accessToken) {
        localStorage.setItem("token", accessToken);
        await fetchUserData();
        navigate("/dashboard");
      } else {
        console.error("No access token received");
      }
    } catch (error) {
      console.error("Error during login:", error);
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
        { headers: { Authorization: `Bearer ${token}` }, withCredentials: true }
      );

      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  };

  return (
    <AuthForm>
      <div className="login-back-arrow" onClick={() => navigate("/")}>
        <img src="/image/back-icon.svg" alt="" />
      </div>
      <img className="login-logo" src="/image/logo.svg" alt="" />

      <h2 className="login-title">Login</h2>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          className="login-form-name"
          type="text"
          name="identifier"
          placeholder="Username or Email"
          value={formData.identifier}
          onChange={handleChange}
        />
        <input
          className="login-form-password"
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />
        <button className="login-form-submit" type="submit">
          Login
        </button>
      </form>
      {/* <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p> */}
    </AuthForm>
  );
};

export default Login;

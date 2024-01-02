// Register.js
import React, { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./Register.scss"; // Make sure to create this SCSS file
import { useNavigate } from "react-router-dom";

function Register({ onRegisterSuccess }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();
  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/register`,
        { username, email, password }
      );
      toast.success("Registration successful!");
      onRegisterSuccess(response.data);
    } catch (error) {
      toast.error("Registration failed!");
      console.error("Registration error:", error);
    }
  };

  return (
    <div className="register">
      <div className="login-back-arrow" onClick={() => navigate("/")}>
        ← Back
      </div>
      <Toaster />
      <div className="register-container">
        <h1 className="register-title">Register</h1>
        <form className="register-form" onSubmit={handleRegister}>
          <input
            className="register-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="register-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="register-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="register-input"
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button className="register-form-submit" type="submit">
            Register
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;

import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../../contexts/AuthContext";
import { login } from "./LoginFunction";
import toast from "react-hot-toast";
import "./Login.scss";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const loadingToast = toast.loading("Logging in...");

    try {
      const response = await login(formData);
      localStorage.setItem("token", response.user.token);
      setUser(response.user);

      toast.dismiss(loadingToast);
      toast.success("Welcome back! 👋", {
        duration: 3000,
        icon: "🎉",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 100);
    } catch (error) {
      toast.dismiss(loadingToast);

      if (error.response?.status === 401) {
        toast.error("Invalid email or password", {
          icon: "🔐",
        });
      } else if (error.response?.status === 403) {
        toast.error("Please verify your email first", {
          icon: "✉️",
        });
      } else {
        toast.error(
          error.message || "Something went wrong. Please try again.",
          {
            icon: "❌",
          }
        );
      }
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div
        className="login-back-arrow login-back-arrow-absolute"
        onClick={() => navigate("/")}
      >
        <img src="/image/back-icon.svg" alt="Back" />
      </div>

      <img className="login-logo" src="/image/logo.svg" alt="Logo" />

      <div className="login-container">
        <h1 className="login-title">Member Area</h1>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              className="login-input"
              type="text"
              name="email"
              placeholder="Username or Email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div className="input-group">
            <input
              className="login-input"
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <button
            className={`login-submit ${loading ? "disabled" : "active"}`}
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="login-register-link">
          Not a member yet?{" "}
          <span onClick={() => navigate("/register")}>Register here</span>
        </p>
      </div>
    </div>
  );
};

export default Login;

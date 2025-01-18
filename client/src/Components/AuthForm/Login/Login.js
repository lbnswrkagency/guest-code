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

    const loadingToast = toast.loading("Logging in...", {
      style: {
        background: "#333",
        color: "#fff",
      },
    });

    try {
      const response = await login(formData);
      toast.dismiss(loadingToast);

      if (response?.user) {
        localStorage.setItem("token", response.user.token);
        setUser(response.user);

        toast.success(
          `Welcome back${
            response.user.firstName ? `, ${response.user.firstName}` : ""
          }! 👋`,
          {
            duration: 3000,
            icon: "🎉",
            style: {
              background: "#333",
              color: "#fff",
            },
          }
        );

        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }
    } catch (error) {
      toast.dismiss(loadingToast);

      // More specific error handling
      const errorMessage = error.response?.data?.details;

      switch (error.response?.status) {
        case 400:
          toast.error(errorMessage || "Please fill in all fields", {
            duration: 3000,
            icon: "⚠️",
            style: {
              background: "#333",
              color: "#fff",
            },
          });
          break;
        case 401:
          toast.error(errorMessage || "Invalid email or password", {
            duration: 3000,
            icon: "🔐",
            style: {
              background: "#333",
              color: "#fff",
            },
          });
          break;
        case 403:
          toast.error(errorMessage || "Please verify your email first", {
            duration: 3000,
            icon: "✉️",
            style: {
              background: "#333",
              color: "#fff",
            },
          });
          break;
        default:
          toast.error("Connection error. Please try again later.", {
            duration: 3000,
            icon: "❌",
            style: {
              background: "#333",
              color: "#fff",
            },
          });
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
              autoComplete="current-password"
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

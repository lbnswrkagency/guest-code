// EmailVerification.js
import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthContext from "../../contexts/AuthContext";
import "./EmailVerification.scss";
import { fetchUserData } from "../AuthForm/Login/LoginFunction";

const EmailVerification = () => {
  const [message, setMessage] = useState("Verifying your email...");
  const { token } = useParams();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await axios.get(`/api/auth/verify/${token}`);
        setMessage(response.data.message);

        // Store the new token in the local storage
        localStorage.setItem("token", response.data.token);

        // Fetch the user data and update the user state
        const userData = await fetchUserData();
        setUser(userData);

        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      } catch (error) {
        setMessage("Error verifying your email. Please try again.");
      }
    };

    verifyEmail();
  }, [token, navigate, setUser]);

  return (
    <div className="email-verification">
      <h1>Email Verification</h1>
      <p>{message}</p>
    </div>
  );
};

export default EmailVerification;

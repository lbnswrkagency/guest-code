import React from "react";
import { Link } from "react-router-dom";
import "./RegistrationSuccess.scss";

const RegistrationSuccess = () => {
  return (
    <div className="registration-success">
      <h2>Thank you for registering!</h2>
      <p>
        A verification email has been sent to your email address. Please check
        your inbox and follow the instructions to verify your account. Don't
        forget to check your spam folder as well.
      </p>
      <Link to="/login">Back to Login</Link>
    </div>
  );
};

export default RegistrationSuccess;

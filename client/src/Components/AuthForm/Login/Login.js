import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../Login/LoginFunction";
import AuthForm from "../AuthForm";
import AuthContext from "../../../contexts/AuthContext";

import "../AuthForm.scss";

const Login = () => {
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    await login(formData.identifier, formData.password, navigate, setUser);
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

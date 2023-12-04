import React from "react";
import ReactDOM from "react-dom/client"; // Update the import
import "./index.scss";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root")); // Create a root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

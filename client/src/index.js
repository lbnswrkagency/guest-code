import React from "react";
import ReactDOM from "react-dom/client"; // Update the import
import "./index.scss";
import App from "./App";
import moment from "moment-timezone";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { BrowserRouter as Router } from "react-router-dom";

moment.tz.setDefault("Europe/Athens");

const root = ReactDOM.createRoot(document.getElementById("root")); // Create a root
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <App />
      </Router>
    </Provider>
  </React.StrictMode>
);

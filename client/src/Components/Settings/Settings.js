import React from "react";
import "./Settings.scss";
import DNS from "../DNS/DNS";

function Settings() {
  return (
    <div className="settings">
      <h1>SETTINGS</h1>
      <DNS />
    </div>
  );
}

export default Settings;

// DNS.js
import React, { useState } from "react";
import "./DNS.scss";

function DNS() {
  const [domain, setDomain] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate the domain and token, then handle submission logic
    // Set error state if validation fails
    // Send data to backend for DNS configuration and verification
  };

  return (
    <div className="dns">
      <h2>Custom Domain Configuration</h2>
      <p>Configure your custom domain to point to your event page:</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="domain">Domain:</label>
          <input
            type="text"
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourdomain.com"
          />
        </div>
        <div className="form-group">
          <label htmlFor="token">Verification Token:</label>
          <input
            type="text"
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your DNS verification token"
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit">Configure Domain</button>
      </form>
    </div>
  );
}

export default DNS;

import React, { useState, useEffect } from "react";
import { updateGuestCodeCondition } from "../../utils/apiClient";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";

const GuestCodeSettings = ({ eventId, setShowGuestCodeSettings }) => {
  const navigate = useNavigate();
  const [number, setNumber] = useState("");
  const [requirePhone, setRequirePhone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch current guest code settings
  useEffect(() => {
    const fetchGuestCodeSettings = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/code-settings/${eventId}`);
        if (response.data && response.data.codeSettings) {
          const guestSetting = response.data.codeSettings.find(cs => cs.type === 'guest');
          if (guestSetting) {
            setNumber(guestSetting.condition || "");
            setRequirePhone(guestSetting.requirePhone !== undefined ? guestSetting.requirePhone : false);
          }
        }
      } catch (error) {
        console.error("Error fetching guest code settings:", error);
        setError("Failed to load current settings");
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchGuestCodeSettings();
    }
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // No validation needed since email is always required

    try {
      // Update guest code settings including contact requirements
      await axiosInstance.put(`/code-settings/${eventId}`, {
        type: 'guest',
        condition: number.trim(),
        requireEmail: true, // Always require email
        requirePhone
      });

      // Also update the legacy guest code condition if needed
      if (number.trim()) {
        await updateGuestCodeCondition(eventId, number.trim());
      }

      // Redirect to the previous page (EventDetails) after saving
      navigate(-1);
    } catch (error) {
      console.error("Error updating guest code settings:", error);
      setError(error.response?.data?.message || "Failed to update settings");
    }
  };

  if (loading) {
    return (
      <div className="guest-code-settings">
        <h2>Guest Code Settings</h2>
        <div className="loading">Loading current settings...</div>
      </div>
    );
  }

  return (
    <div className="guest-code-settings">
      <h2>Guest Code Settings</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="condition">Guest Code Condition:</label>
          <input
            id="condition"
            type="text"
            className="input-number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Enter guest code condition (optional)"
          />
          <small className="field-description">
            Optional message displayed to users when requesting guest codes
          </small>
        </div>

        <div className="form-group">
          <label>Contact Information Requirements:</label>
          <div className="info-text">
            <span>✓ Email address is always required</span>
          </div>
          <div className="checkbox-group">
            <div className="checkbox-item">
              <input
                type="checkbox"
                id="requirePhone"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
              />
              <label htmlFor="requirePhone">Also require phone number</label>
            </div>
          </div>
          <small className="field-description">
            Enable this to also require phone numbers when users request guest codes
          </small>
        </div>

        <div className="form-actions">
          <button className="submit-button" type="submit">
            Save Settings
          </button>
          <button
            className="cancel-button"
            type="button"
            onClick={() => setShowGuestCodeSettings((prev) => !prev)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default GuestCodeSettings;

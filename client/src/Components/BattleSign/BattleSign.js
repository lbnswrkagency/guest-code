import React, { useState, useEffect, forwardRef } from "react";
import axios from "axios";
import { useToast } from "../Toast/ToastContext";
import "./BattleSign.scss";

const BattleSign = forwardRef(({ eventId, ...props }, ref) => {
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [battleConfig, setBattleConfig] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch battle configuration when component mounts
  useEffect(() => {
    const fetchBattleConfig = async () => {
      if (!eventId) {
        toast.showError("No event ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/battleSign/config/${eventId}`
        );
        setBattleConfig(response.data.battleConfig);
        setEvent(response.data.event);
      } catch (error) {
        toast.showError("Error loading battle information");
        console.error("Error fetching battle config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBattleConfig();
  }, [eventId]);

  const handleCategoryChange = (categoryName) => {
    setSelectedCategories([categoryName]); // Only allow one category
    updateParticipantsForCategories([categoryName]);
  };
  
  const updateParticipantsForCategories = (categories) => {
    if (!battleConfig?.categories) return;
    
    // Find the maximum participantsPerSignup required among selected categories
    let maxParticipants = 0;
    categories.forEach(categoryName => {
      const categoryConfig = battleConfig.categories.find(cat => cat.name === categoryName);
      const requiredParticipants = categoryConfig?.participantsPerSignup || 1;
      if (requiredParticipants > maxParticipants) {
        maxParticipants = requiredParticipants;
      }
    });
    
    // Adjust participants array (excluding the main participant)
    const additionalParticipantsNeeded = maxParticipants - 1; // -1 because main person is already covered
    
    setParticipants(prev => {
      const newParticipants = [...prev];
      
      // Add participants if we need more
      while (newParticipants.length < additionalParticipantsNeeded) {
        newParticipants.push({ name: "", instagram: "" });
      }
      
      // Remove participants if we have too many
      if (newParticipants.length > additionalParticipantsNeeded) {
        newParticipants.splice(additionalParticipantsNeeded);
      }
      
      return newParticipants;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !phone || !email || selectedCategories.length === 0) {
      toast.showError(
        "Please fill in all required fields and select at least one category."
      );
      return;
    }

    const data = {
      name,
      phone,
      email,
      instagram,
      participants: participants.filter(p => p.name.trim()), // Only include participants with names
      message,
      categories: selectedCategories,
      eventId: eventId,
    };

    const loadingToast = toast.showLoading("Submitting your application...");

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/battleSign/add`,
        data
      );
      loadingToast.dismiss();
      toast.showSuccess(
        "Application submitted successfully! You will be contacted soon."
      );
      // Reset form fields here if needed
      setName("");
      setPhone("");
      setEmail("");
      setInstagram("");
      setMessage("");
      setSelectedCategories([]);
      setParticipants([]);
    } catch (error) {
      loadingToast.dismiss();
      console.error("Application submission error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Error submitting application. Please try again.";

      toast.showError(errorMessage);
    }
  };

  // Helper functions for formatting
  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDayName = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { weekday: "long" });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "TBD";
    return timeString;
  };

  if (loading) {
    return (
      <div ref={ref} className="battleSign">
        <div className="battleSign-loading">Loading battle information...</div>
      </div>
    );
  }

  if (!battleConfig || !battleConfig.isEnabled) {
    return (
      <div ref={ref} className="battleSign">
        <div className="battleSign-error">
          <h2>Battle Not Available</h2>
          <p>This event does not have battle registration enabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="battleSign">
      <h1 className="battleSign-title">
        {battleConfig.title || event?.title || "DANCE BATTLE"}
      </h1>

      <div className="battleSign-info">
        <div className="battleSign-info-main">
          <h2 className="battleSign-info-title">
            {battleConfig.subtitle || "1 vs 1 Dance Battles"}
          </h2>
          <p className="battleSign-info-subtitle">
            {battleConfig.description || "The crowd picks the winner!"}
          </p>
        </div>
        <div className="battleSign-info-details">
          <div className="battleSign-info-col">
            <span className="battleSign-info-label">Date</span>
            <span className="battleSign-info-value">
              {formatDate(
                battleConfig.battleDate || event?.startDate || event?.date
              )}
            </span>
            <span className="battleSign-info-subvalue">
              {formatDayName(
                battleConfig.battleDate || event?.startDate || event?.date
              )}
            </span>
          </div>
          <div className="battleSign-info-col">
            <span className="battleSign-info-label">Time</span>
            <span className="battleSign-info-value">
              {formatTime(battleConfig.battleStartTime || event?.startTime)}
            </span>
            <span className="battleSign-info-subvalue">H</span>
          </div>
          <div className="battleSign-info-col">
            <span className="battleSign-info-label">Venue</span>
            <span className="battleSign-info-value">
              {battleConfig.battleLocation || event?.location || "TBD"}
            </span>
            <span className="battleSign-info-subvalue">
              {event?.street || ""}
            </span>
          </div>
        </div>
        {battleConfig.prizeMoney > 0 && (
          <div className="battleSign-info-prize">
            <span className="battleSign-info-prize-label">Cash Prize</span>
            <span className="battleSign-info-prize-value">
              {battleConfig.prizeMoney} {battleConfig.currency || "€"}
            </span>
            <span className="battleSign-info-prize-subvalue">per category</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="battleSign-form">
        <h2 className="battleSign-form-title">Sign Up for the Battle</h2>

        {battleConfig.categories && battleConfig.categories.length > 0 ? (
          <div className="battleSign-form-categories">
            {battleConfig.categories.map((category) => (
              <label 
                key={category.name} 
                className={`battleSign-form-category ${category.signUpsDone ? 'sold-out' : ''}`}
              >
                <input
                  type="radio"
                  name="battleCategory"
                  checked={selectedCategories.includes(category.name)}
                  onChange={() => handleCategoryChange(category.name)}
                  disabled={category.signUpsDone}
                />
                <span className="category-label">
                  {category.displayName || category.name}
                  {category.signUpsDone && <span className="sold-out-badge">FULL</span>}
                </span>
                {category.prizeMoney > 0 && !category.signUpsDone && (
                  <span className="category-prize">
                    {category.prizeMoney} {battleConfig.currency || "€"}
                  </span>
                )}
              </label>
            ))}
          </div>
        ) : (
          <div className="battleSign-form-no-categories">
            <p>No battle categories available for registration.</p>
          </div>
        )}

        {battleConfig.prizeMoney > 0 && (
          <div className="battleSign-form-prize">
            <p>Prize per category:</p>
            <p>
              <span className="prize-amount">
                {battleConfig.prizeMoney} {battleConfig.currency || "€"}
              </span>{" "}
              CASH
            </p>
          </div>
        )}

        <input
          type="text"
          placeholder="Your Name"
          className="battleSign-form-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="Your Phone Number"
          className="battleSign-form-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Your Email"
          className="battleSign-form-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="@username (Instagram)"
          className="battleSign-form-instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
        
        {/* Additional participants for team battles */}
        {participants.length > 0 && (
          <div className="additional-participants">
            <h4>Additional Team Members</h4>
            {participants.map((participant, index) => (
              <div key={index} className="participant-group">
                <h5>Team Member {index + 2}</h5>
                <input
                  type="text"
                  placeholder="Team member name"
                  className="battleSign-form-participant-name"
                  value={participant.name}
                  onChange={(e) => {
                    const newParticipants = [...participants];
                    newParticipants[index].name = e.target.value;
                    setParticipants(newParticipants);
                  }}
                  required
                />
                <input
                  type="text"
                  placeholder="@username (Instagram)"
                  className="battleSign-form-participant-instagram"
                  value={participant.instagram}
                  onChange={(e) => {
                    const newParticipants = [...participants];
                    newParticipants[index].instagram = e.target.value;
                    setParticipants(newParticipants);
                  }}
                />
              </div>
            ))}
          </div>
        )}
        
        <textarea
          placeholder="Anything you want us to know? or ask us"
          className="battleSign-form-text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        ></textarea>

        <button type="submit" className="battleSign-form-submit">
          Join the Battle
        </button>
      </form>
    </div>
  );
});

export default BattleSign;

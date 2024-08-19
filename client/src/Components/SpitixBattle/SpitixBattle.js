import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment";
import Navigation from "../Navigation/Navigation";
import Footer from "../Footer/Footer";
import ActionButtons from "../ActionButtons/ActionButtons";
import { toast, Toaster } from "react-hot-toast";
import "./SpitixBattle.scss";

function SpitixBattle({ user, onClose }) {
  const [battleSignups, setBattleSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);

  useEffect(() => {
    fetchBattleSignups();
  }, []);

  const fetchBattleSignups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/battleSign/fetch`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );
      setBattleSignups(response.data);
      setLoading(false);
    } catch (err) {
      setError("Error fetching battle signups");
      setLoading(false);
    }
  };

  const categories = ["allStyles", "afroStyles", "dancehall"];

  const confirmRoute = (id) =>
    `${process.env.REACT_APP_API_BASE_URL}/battleSign/confirm/${id}`;
  const declineRoute = (id) =>
    `${process.env.REACT_APP_API_BASE_URL}/battleSign/decline/${id}`;
  const resetRoute = (id) =>
    `${process.env.REACT_APP_API_BASE_URL}/battleSign/reset/${id}`;

  const getCategoryCount = (category) => {
    return battleSignups.filter((signup) =>
      signup.categories.includes(category)
    ).length;
  };

  const getConfirmedCount = (category) => {
    return battleSignups.filter(
      (signup) =>
        signup.categories.includes(category) && signup.status === "confirmed"
    ).length;
  };

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  const handleConfirm = (updatedSignup) => {
    const category = updatedSignup.categories[0]; // Assuming each signup is for one category
    const confirmedCount = getConfirmedCount(category);

    if (confirmedCount >= 16) {
      toast.error(
        `Maximum limit reached for ${category}. Cannot confirm more.`
      );
      return;
    }

    setBattleSignups(
      battleSignups.map((signup) =>
        signup._id === updatedSignup._id ? updatedSignup : signup
      )
    );
  };

  const handleDecline = (updatedSignup) => {
    setBattleSignups(
      battleSignups.map((signup) =>
        signup._id === updatedSignup._id ? updatedSignup : signup
      )
    );
  };

  const handleReset = (updatedSignup) => {
    setBattleSignups(
      battleSignups.map((signup) =>
        signup._id === updatedSignup._id ? updatedSignup : signup
      )
    );
  };

  if (loading) return <div className="spitixBattle-loading">Loading...</div>;
  if (error) return <div className="spitixBattle-error">{error}</div>;

  return (
    <div className="spitixBattle">
      <Toaster />
      <div className="spitixBattle-wrapper">
        <Navigation onBack={onClose} />
        <h1 className="spitixBattle-title">Spitix Beach Battle</h1>

        <div className="spitixBattle-container">
          {categories.map((category) => (
            <div key={category} className="spitixBattle-category">
              <h2 className="spitixBattle-category-title">
                {category.charAt(0).toUpperCase() + category.slice(1)}
                <span className="spitixBattle-category-count">
                  {getConfirmedCount(category)}/16
                </span>
              </h2>
              <div
                className="spitixBattle-category-total"
                onClick={() => toggleCategory(category)}
              >
                Total {getCategoryCount(category)}
                <img
                  src="/image/arrow-up.svg"
                  alt=""
                  className={`spitixBattle-category-arrow ${
                    expandedCategory === category ? "rotated" : ""
                  }`}
                />
              </div>
              {expandedCategory === category && (
                <div className="spitixBattle-category-details">
                  {battleSignups
                    .filter((signup) => signup.categories.includes(category))
                    .map((signup, index) => (
                      <div key={index} className="spitixBattle-signup">
                        <p className="spitixBattle-signup-name">
                          {signup.name}
                        </p>
                        <p className="spitixBattle-signup-contact">
                          {signup.phone} | {signup.email}
                        </p>
                        {signup.message && (
                          <p className="spitixBattle-signup-message">
                            {signup.message}
                          </p>
                        )}
                        <p className="spitixBattle-signup-status">
                          Status: {signup.status || "pending"}
                        </p>
                        <ActionButtons
                          item={signup}
                          onConfirm={handleConfirm}
                          onDecline={handleDecline}
                          onReset={handleReset}
                          token={user.token}
                          confirmRoute={confirmRoute}
                          declineRoute={declineRoute}
                          resetRoute={resetRoute}
                          confirmLabel="Approve"
                          declineLabel="Reject"
                          resetLabel="Reset"
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default SpitixBattle;

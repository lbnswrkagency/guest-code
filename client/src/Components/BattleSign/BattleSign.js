import React, { useState, forwardRef } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./BattleSign.scss";

const BattleSign = forwardRef((props, ref) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [categories, setCategories] = useState({
    allStyles: false,
    afroStyles: false,
    dancehall: false,
  });

  const battleCategories = [
    { id: "allStyles", label: "All Styles" },
    { id: "afroStyles", label: "Afro Styles" },
    { id: "dancehall", label: "Dancehall" },
  ];

  const handleCategoryChange = (category) => {
    setCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !name ||
      !phone ||
      !email ||
      !Object.values(categories).some((v) => v)
    ) {
      toast.error(
        "Please fill in all required fields and select at least one category."
      );
      return;
    }

    const data = {
      name,
      phone,
      email,
      message,
      categories: Object.keys(categories).filter((k) => categories[k]),
    };

    const loadingToast = toast.loading("Submitting your application...");

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/battleSign/add`,
        data
      );
      toast.dismiss(loadingToast);
      toast.success(
        "Application submitted successfully! You will be contacted soon.",
        {
          duration: 4000, // Display the success message for 4 seconds
        }
      );
      // Reset form fields here if needed
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
      setCategories({
        allStyles: false,
        afroStyles: false,
        dancehall: false,
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Error submitting application. Please try again.");
      console.error("Application submission error:", error);
    }
  };

  return (
    <div ref={ref} className="battleSign">
      <Toaster />

      <h1 className="battleSign-title">SPITIX BEACH BATTLE</h1>
      <div className="battleSign-flyer">
        <img
          src="/image/battle.png"
          alt="Beach Battle Flyer"
          className="battleSign-flyer-image"
        />
        <div className="battleSign-flyer-overlay"></div>
      </div>
      <div className="battleSign-info">
        <p className="battleSign-text">
          Join the 1 vs 1 Dance Battles at the beach! The crowd picks the
          winner!
        </p>
        <div className="battleSign-event-details">
          <p className="battleSign-date">04.09.2024</p>
          <p className="battleSign-day">Wednesday</p>
          <p className="battleSign-time">START 8 PM</p>
          <p className="battleSign-day">AT BOLIVAR BEACH BAR</p>
          <p className="battleSign-prize">333 € CASH PRIZE</p>
          <p className="battleSign-prize-subtext">for each category</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="battleSign-form">
        <h2 className="battleSign-form-title">Sign Up for the Battle</h2>

        <div className="battleSign-form-categories">
          {battleCategories.map((category) => (
            <label key={category.id} className="battleSign-form-category">
              <input
                type="checkbox"
                checked={categories[category.id]}
                onChange={() => handleCategoryChange(category.id)}
              />
              {category.label}
            </label>
          ))}
        </div>

        <div className="battleSign-form-prize">
          <p>Prize for each category:</p>
          <p>
            <span className="prize-amount">333 €</span> CASH
          </p>
        </div>

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

      <div className="battleSign-footer">
        <p>Hosted by:</p>
        <img
          src="/image/logo.svg"
          alt="Afro Spiti"
          className="battleSign-footer-logo"
        />
        <img
          src="/image/bolivar.svg"
          alt="Bolivar"
          className="battleSign-footer-logo"
        />
      </div>
    </div>
  );
});

export default BattleSign;

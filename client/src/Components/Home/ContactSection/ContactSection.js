import React, { useState } from "react";
import axios from "axios";
import "./ContactSection.scss";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    contactMethod: "",
    message: "",
  });
  const [status, setStatus] = useState({
    submitting: false,
    success: false,
    error: false,
    message: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Form validation
    if (!formData.name || !formData.message) {
      setStatus({
        submitting: false,
        success: false,
        error: true,
        message: "Please fill out all required fields.",
      });
      return;
    }

    setStatus({ ...status, submitting: true });

    try {
      const response = await axios.post("/api/contact/send", {
        name: formData.name,
        email: formData.contactMethod,
        message: formData.message,
      });

      setStatus({
        submitting: false,
        success: true,
        error: false,
        message: "Thank you for reaching out! We'll get back to you soon.",
      });

      // Reset form
      setFormData({
        name: "",
        contactMethod: "",
        message: "",
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setStatus((prev) => ({ ...prev, success: false, message: "" }));
      }, 5000);
    } catch (error) {
      setStatus({
        submitting: false,
        success: false,
        error: true,
        message: "Something went wrong. Please try again later.",
      });
    }
  };

  return (
    <section className="contactSection">
      <div className="contactSection-container">
        <div className="contactSection-text">
          <h2>Get in Touch</h2>
          <p>
            We're still in Alpha testing, pushing boundaries in event
            management. If you encounter any issues or need assistance, please
            don't hesitate to reach out. We're here to help make your experience
            seamless.
          </p>
        </div>

        <form className="contactSection-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your Name *"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              name="contactMethod"
              value={formData.contactMethod}
              onChange={handleChange}
              placeholder="Email or Phone (optional)"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Your Message *"
              className="form-textarea"
              required
            ></textarea>
          </div>

          <button
            type="submit"
            className={`submit-button ${status.submitting ? "submitting" : ""}`}
            disabled={status.submitting}
          >
            {status.submitting ? "Sending..." : "Send Message"}
          </button>

          {status.success && (
            <div className="form-success">{status.message}</div>
          )}

          {status.error && <div className="form-error">{status.message}</div>}
        </form>
      </div>
    </section>
  );
};

export default ContactSection;

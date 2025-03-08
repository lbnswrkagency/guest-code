import React, { useState, useEffect } from "react";
import "./DeviceRestriction.scss";

const DeviceRestriction = ({ children }) => {
  const [isSmartphoneSize, setIsSmartphoneSize] = useState(true);

  useEffect(() => {
    const checkDeviceSize = () => {
      // Consider smartphone size as width <= 768px
      setIsSmartphoneSize(window.innerWidth <= 768);
    };

    // Check on initial load
    checkDeviceSize();

    // Check on resize
    window.addEventListener("resize", checkDeviceSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkDeviceSize);
  }, []);

  if (isSmartphoneSize) {
    return children;
  }

  // Generate dust particles
  const dustParticles = Array.from({ length: 50 }, (_, i) => (
    <div key={`dust-${i}`} className="dust-particle"></div>
  ));

  return (
    <div className="device-restriction">
      {/* Animated background elements */}
      <div className="animated-background">
        {/* Nebula effects */}
        <div className="nebula-container">
          <div className="nebula"></div>
          <div className="nebula"></div>
        </div>

        {/* Star field */}
        <div className="star-container">
          {[...Array(30)].map((_, i) => (
            <div key={`star-${i}`} className="star"></div>
          ))}
        </div>

        {/* Dust particles */}
        <div className="dust-container">{dustParticles}</div>

        {/* Particles */}
        <div className="particles-container">
          {[...Array(15)].map((_, i) => (
            <div
              key={`particle-${i}`}
              className={`particle particle-${i + 1}`}
            ></div>
          ))}
        </div>

        {/* Glow overlay */}
        <div className="glow-overlay"></div>
      </div>

      <div className="device-restriction__content">
        <div className="device-restriction__message">
          <h1>GuestCode</h1>
          <p className="subtitle">Mobile Experience</p>
          <span className="alpha-badge">Alpha</span>
          <p className="mobile-note">Please switch to your smartphone</p>
        </div>
      </div>
    </div>
  );
};

export default DeviceRestriction;

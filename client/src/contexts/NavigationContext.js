import React, { createContext, useContext, useState, useEffect } from "react";

const NavigationContext = createContext();

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  const openNavigation = () => {
    setIsNavigationOpen(true);
  };

  const closeNavigation = () => {
    setIsNavigationOpen(false);
  };

  // Listen for global navigation events
  useEffect(() => {
    const handleNavigationOpen = () => openNavigation();
    const handleNavigationClose = () => closeNavigation();

    window.addEventListener("openNavigation", handleNavigationOpen);
    window.addEventListener("closeNavigation", handleNavigationClose);

    return () => {
      window.removeEventListener("openNavigation", handleNavigationOpen);
      window.removeEventListener("closeNavigation", handleNavigationClose);
    };
  }, []);

  // Expose the navigation state and methods
  const value = {
    isNavigationOpen,
    openNavigation,
    closeNavigation,
    toggleNavigation: () => setIsNavigationOpen((prev) => !prev),
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationContext;

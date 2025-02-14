import React, { createContext, useContext, useState, useCallback } from "react";
import Toast from "./Toast";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(
    ({ message, type = "info", duration = 3000 }) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((currentToasts) => [
        ...currentToasts,
        { id, message, type, duration },
      ]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  }, []);

  const showLoading = useCallback(
    (message = "Loading...") => {
      return addToast({ message, type: "loading", duration: null });
    },
    [addToast]
  );

  const showSuccess = useCallback(
    (message) => {
      return addToast({ message, type: "success" });
    },
    [addToast]
  );

  const showError = useCallback(
    (message) => {
      return addToast({ message, type: "error", duration: 5000 });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (message) => {
      return addToast({ message, type: "info" });
    },
    [addToast]
  );

  const updateToast = useCallback((id, updates) => {
    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  }, []);

  return (
    <ToastContext.Provider
      value={{
        showLoading,
        showSuccess,
        showError,
        showInfo,
        removeToast,
        updateToast,
      }}
    >
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

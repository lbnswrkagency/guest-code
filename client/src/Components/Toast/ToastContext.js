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

  const updateToast = useCallback((id, updates) => {
    if (!id) return;
    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  }, []);

  const clearLoadingToasts = useCallback(() => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.type !== "loading")
    );
  }, []);

  const showSuccess = useCallback(
    (message) => {
      clearLoadingToasts(); // Clear any loading toasts first
      return addToast({ message, type: "success", duration: 2000 });
    },
    [addToast, clearLoadingToasts]
  );

  const showError = useCallback(
    (message) => {
      clearLoadingToasts(); // Clear any loading toasts first
      const truncatedMessage =
        typeof message === "string" && message.length > 100
          ? message.substring(0, 100) + "..."
          : message;
      return addToast({
        message: truncatedMessage,
        type: "error",
        duration: 3000,
      });
    },
    [addToast, clearLoadingToasts]
  );

  const showInfo = useCallback(
    (message) => {
      return addToast({ message, type: "info", duration: 2500 });
    },
    [addToast]
  );

  const showLoading = useCallback(
    (message = "Loading...") => {
      const id = addToast({ message, type: "loading", duration: null });
      return {
        id,
        dismiss: () => removeToast(id),
        update: (updates) => updateToast(id, updates),
      };
    },
    [addToast, removeToast, updateToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showLoading,
        showSuccess,
        showError,
        showInfo,
        removeToast,
        updateToast,
        clearLoadingToasts,
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

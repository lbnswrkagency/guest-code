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
    (message, options = {}) => {
      clearLoadingToasts(); // Clear any loading toasts first
      return addToast({
        message,
        type: "success",
        duration: options.autoClose || options.duration || 2000,
      });
    },
    [addToast, clearLoadingToasts]
  );

  const showError = useCallback(
    (message, options = {}) => {
      // Check if a toast with this ID already exists
      if (options.id && toasts.some((toast) => toast.id === options.id)) {
        // Don't add duplicate toast with same ID
        return;
      }

      const id = options.id || Date.now();
      const toast = {
        id,
        message,
        type: "error",
        duration: options.duration || 5000,
      };

      setToasts((prev) => [...prev, toast]);

      // Auto remove after duration
      if (toast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, toast.duration);
      }
    },
    [toasts, addToast, removeToast]
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

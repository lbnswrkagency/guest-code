import React from "react";
import { motion } from "framer-motion";
import "./ConfirmDialog.scss";

const ConfirmDialog = ({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = "default",
}) => {
  return (
    <motion.div
      className="confirm-dialog-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="confirm-dialog"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h3>{title}</h3>
        <p>{message}</p>

        <div className="dialog-actions">
          <motion.button
            className="cancel-btn"
            onClick={onCancel}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {cancelText}
          </motion.button>

          <motion.button
            className={`confirm-btn ${type}`}
            onClick={onConfirm}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {confirmText}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConfirmDialog;

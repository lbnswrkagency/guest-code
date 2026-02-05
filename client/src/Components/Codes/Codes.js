import React, { useState, useEffect, useContext } from "react";
import "./Codes.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCodeLine,
  RiAddCircleLine,
  RiEditLine,
  RiDeleteBin6Line,
  RiBuildingLine,
  RiTicketLine,
  RiUserLine,
  RiVipLine,
  RiTableLine,
  RiHeartLine,
  RiStarLine,
  RiFireLine,
  RiThumbUpLine,
  RiCupLine,
  RiGift2Line,
  RiMedalLine,
  RiTrophyLine,
} from "react-icons/ri";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosConfig";
import AuthContext from "../../contexts/AuthContext";
import { useToast } from "../Toast/ToastContext";
import Navigation from "../Navigation/Navigation";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import CodeDetailPanel from "../CodeDetailPanel/CodeDetailPanel";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";

// Icon map for dynamic icon rendering
const ICON_MAP = {
  RiCodeLine,
  RiTicketLine,
  RiUserLine,
  RiVipLine,
  RiTableLine,
  RiHeartLine,
  RiStarLine,
  RiFireLine,
  RiThumbUpLine,
  RiCupLine,
  RiGift2Line,
  RiMedalLine,
  RiTrophyLine,
};

const Codes = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const toast = useToast();

  const [codes, setCodes] = useState([]);
  const [userBrands, setUserBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState(null);

  // Fetch user's code templates and brands
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch codes and brands in parallel
      const [codesResponse, brandsResponse] = await Promise.all([
        axiosInstance.get("/code-templates"),
        axiosInstance.get("/brands"),
      ]);

      setCodes(codesResponse.data.templates || []);
      setUserBrands(brandsResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.showError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(`/@${user?.username}`);
  };

  const handleCodeClick = (code) => {
    setSelectedCode(code);
    setShowNewForm(false);
  };

  const handleNewCode = () => {
    setSelectedCode(null);
    setShowNewForm(true);
  };

  const handleCloseDetail = () => {
    setSelectedCode(null);
    setShowNewForm(false);
  };

  const handleSave = async (codeData) => {
    try {
      let response;

      if (selectedCode) {
        // Update existing
        response = await axiosInstance.put(`/code-templates/${selectedCode._id}`, codeData);
        setCodes((prev) =>
          prev.map((c) =>
            c._id === selectedCode._id ? response.data.template : c
          )
        );
        toast.showSuccess("Code template updated");
      } else {
        // Create new
        response = await axiosInstance.post("/code-templates", codeData);
        setCodes((prev) => [...prev, response.data.template]);
        toast.showSuccess("Code template created");
      }

      handleCloseDetail();
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Failed to save code template"
      );
    }
  };

  const handleDeleteClick = (e, code) => {
    e.stopPropagation();
    setCodeToDelete(code);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!codeToDelete) return;

    try {
      await axiosInstance.delete(`/code-templates/${codeToDelete._id}`);
      setCodes((prev) => prev.filter((c) => c._id !== codeToDelete._id));
      toast.showSuccess("Code template deleted");

      // Close detail panel if deleting the currently selected code
      if (selectedCode?._id === codeToDelete._id) {
        handleCloseDetail();
      }
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Failed to delete code template"
      );
    } finally {
      setShowDeleteConfirm(false);
      setCodeToDelete(null);
    }
  };

  // Get icon component by name
  const getIconStyle = (color) => ({
    backgroundColor: color || "#2196F3",
  });

  return (
    <div className="page-wrapper">
      <Navigation
        onBack={handleBack}
        onMenuClick={() => setIsNavigationOpen(true)}
      />

      <DashboardNavigation
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
        currentUser={user}
        setUser={setUser}
      />

      <div className="codes">
        <div className="codes-header">
          <h1>Your Codes</h1>
          <p>Create code templates and attach them to your brands & events</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="codes-loading-container">
            <LoadingSpinner size="large" color="primary" />
          </div>
        )}

        {/* No Codes State */}
        {!loading && codes.length === 0 && !showNewForm && (
          <div className="no-content-container">
            <div className="no-content-card">
              <RiCodeLine className="no-content-icon" />
              <h3>No Code Templates Yet</h3>
              <p>Create your first code template to get started</p>
              <motion.button
                className="create-code-btn"
                onClick={handleNewCode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RiAddCircleLine />
                Create Code Template
              </motion.button>
            </div>
          </div>
        )}

        {/* Codes Grid */}
        {!loading && (codes.length > 0 || showNewForm) && (
          <div className="codes-grid">
            {codes.map((code) => (
              <CodeCard
                key={code._id}
                code={code}
                isSelected={selectedCode?._id === code._id}
                onClick={() => handleCodeClick(code)}
                onDelete={(e) => handleDeleteClick(e, code)}
              />
            ))}

            {/* Add New Card */}
            <motion.div
              className="code-card add-card"
              onClick={handleNewCode}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <RiAddCircleLine className="add-icon" />
              <p>Create New Code</p>
            </motion.div>
          </div>
        )}

        {/* Detail Panel */}
        <AnimatePresence>
          {(selectedCode || showNewForm) && (
            <CodeDetailPanel
              code={selectedCode}
              userBrands={userBrands}
              onSave={handleSave}
              onClose={handleCloseDetail}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && codeToDelete && (
          <ConfirmDialog
            title="Delete Code Template"
            message={`Are you sure you want to delete "${codeToDelete.name}"? This will remove it from all brands and events.`}
            confirmText="Delete"
            type="danger"
            onConfirm={handleDelete}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setCodeToDelete(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Code Card Component
const CodeCard = ({ code, isSelected, onClick, onDelete }) => {
  const attachmentCount = code.attachments?.length || 0;
  const IconComponent = ICON_MAP[code.icon] || RiCodeLine;

  return (
    <motion.div
      className={`code-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="card-header">
        <div
          className="card-icon"
          style={{ backgroundColor: code.color || "#2196F3" }}
        >
          <IconComponent />
        </div>
        <div className="card-actions">
          <motion.button
            className="action-btn delete"
            onClick={onDelete}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <RiDeleteBin6Line />
          </motion.button>
        </div>
      </div>

      <div className="card-content">
        <h3>{code.name}</h3>
        {code.condition && (
          <p className="code-condition">{code.condition}</p>
        )}
      </div>

      <div className="card-footer">
        <div className="attachment-count">
          <RiBuildingLine />
          <span>
            {attachmentCount} {attachmentCount === 1 ? "brand" : "brands"}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default Codes;

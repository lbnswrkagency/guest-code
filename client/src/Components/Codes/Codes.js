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

      // First fetch user's brands
      const brandsResponse = await axiosInstance.get("/brands");
      const brands = brandsResponse.data || [];
      setUserBrands(brands);

      // Fetch brand-level codes for each brand the user manages
      const allCodes = [];
      for (const brand of brands) {
        try {
          const codesResponse = await axiosInstance.get(`/code-settings/brands/${brand._id}/codes`);
          // Add brand info to each code
          for (const code of codesResponse.data.codes || []) {
            allCodes.push({
              ...code,
              brandId: brand._id,
              brandName: brand.name,
              brandUsername: brand.username,
              brandLogo: brand.logo,
            });
          }
        } catch (error) {
          console.log(`Failed to fetch codes for brand ${brand.name}:`, error.message);
        }
      }

      // Group codes by name to merge attachments (codes with same name across brands)
      const codesByName = {};
      for (const code of allCodes) {
        if (!codesByName[code.name]) {
          codesByName[code.name] = {
            ...code,
            attachments: [],
            // Track all code IDs for this name (one per brand)
            codeIdsByBrand: {},
          };
        }
        // Add this brand as an attachment
        codesByName[code.name].attachments.push({
          brandId: code.brandId,
          brandName: code.brandName,
          brandUsername: code.brandUsername,
          brandLogo: code.brandLogo,
          isGlobalForBrand: code.isGlobalForBrand !== false,
          enabledEvents: [],
        });
        // Track the code ID for this brand
        codesByName[code.name].codeIdsByBrand[code.brandId] = code._id;
      }

      setCodes(Object.values(codesByName));
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
      const attachments = codeData.attachments || [];

      // Brand attachment is optional - codes without a brand are user-level only
      if (attachments.length === 0) {
        toast.showInfo("Code saved without brand attachment. Attach to a brand to use it in events.");
        handleCloseDetail();
        return;
      }

      if (selectedCode) {
        // EDITING: diff old vs new attachments
        const oldBrandIds = new Set(
          selectedCode.attachments?.map(a => a.brandId) || []
        );
        const newBrandIds = new Set(attachments.map(a => a.brandId));

        // Delete removed brands
        for (const brandId of oldBrandIds) {
          if (!newBrandIds.has(brandId)) {
            const codeId = selectedCode.codeIdsByBrand?.[brandId];
            if (codeId) {
              await axiosInstance.delete(`/code-settings/brands/${brandId}/codes/${codeId}`);
            }
          }
        }

        // Update existing / Create new
        for (const attachment of attachments) {
          const brandId = attachment.brandId;
          const existingCodeId = selectedCode.codeIdsByBrand?.[brandId];

          if (existingCodeId) {
            // Update existing code for this brand
            await axiosInstance.put(
              `/code-settings/brands/${brandId}/codes/${existingCodeId}`,
              { ...codeData, isGlobalForBrand: attachment.isGlobalForBrand ?? true }
            );
          } else {
            // Create new code for this brand
            await axiosInstance.post(
              `/code-settings/brands/${brandId}/codes`,
              { ...codeData, isGlobalForBrand: attachment.isGlobalForBrand ?? true }
            );
          }
        }

        toast.showSuccess("Code updated");
      } else {
        // CREATING: Create one CodeSettings per brand
        for (const attachment of attachments) {
          await axiosInstance.post(
            `/code-settings/brands/${attachment.brandId}/codes`,
            { ...codeData, isGlobalForBrand: attachment.isGlobalForBrand ?? true }
          );
        }
        toast.showSuccess("Code created");
      }

      // Refresh data to get updated state
      await fetchData();
      handleCloseDetail();
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Failed to save code"
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
      // Delete from ALL brands this code is attached to
      const attachments = codeToDelete.attachments || [];
      const codeIdsByBrand = codeToDelete.codeIdsByBrand || {};

      if (attachments.length === 0) {
        toast.showError("Cannot delete code: no brand attachments found");
        return;
      }

      for (const attachment of attachments) {
        const codeId = codeIdsByBrand[attachment.brandId];
        if (codeId) {
          await axiosInstance.delete(
            `/code-settings/brands/${attachment.brandId}/codes/${codeId}`
          );
        }
      }

      toast.showSuccess("Code deleted");

      // Refresh data to get updated state
      await fetchData();

      // Close detail panel if deleting the currently selected code
      if (selectedCode?.name === codeToDelete.name) {
        handleCloseDetail();
      }
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Failed to delete code"
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

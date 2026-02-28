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
      const allBrands = brandsResponse.data || [];

      // Filter to only brands where user is the FOUNDER/OWNER
      // Users can only attach code templates to brands they own
      const ownedBrands = allBrands.filter(brand =>
        brand.owner === user?._id ||
        brand.owner?.toString() === user?._id?.toString() ||
        brand.role?.isFounder === true
      );
      setUserBrands(ownedBrands);

      // Fetch brand-level codes only for brands the user owns
      const allCodes = [];
      for (const brand of ownedBrands) {
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

      // Also fetch user-level codes (no brand attached)
      let userLevelCodes = [];
      try {
        const userCodesResponse = await axiosInstance.get("/code-settings/user/codes");
        userLevelCodes = userCodesResponse.data.codes || [];
      } catch (error) {
        console.log("Failed to fetch user-level codes:", error.message);
      }

      // Group codes by name to merge attachments (codes with same name across brands)
      const codesByName = {};

      // First, add user-level codes (no brand attachment)
      for (const code of userLevelCodes) {
        codesByName[code.name] = {
          ...code,
          attachments: [],
          codeIdsByBrand: {},
          userLevelCodeId: code._id, // Track the user-level code ID
        };
      }

      // Then merge brand-level codes
      for (const code of allCodes) {
        if (!codesByName[code.name]) {
          codesByName[code.name] = {
            ...code,
            attachments: [],
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

      // Ensure Guest Code always exists as a built-in entry
      if (codesByName["Guest Code"]) {
        codesByName["Guest Code"].isBuiltIn = true;
        codesByName["Guest Code"].type = "guest";
      } else {
        // Create a virtual unattached Guest Code card
        codesByName["Guest Code"] = {
          _id: "built-in-guest-code",
          name: "Guest Code",
          type: "guest",
          isBuiltIn: true,
          condition: "",
          note: "",
          maxPax: 1,
          defaultLimit: 0,
          color: "#ffc807",
          icon: "RiVipLine",
          requireEmail: true,
          requirePhone: false,
          isEnabled: true,
          isEditable: false,
          attachments: [],
          codeIdsByBrand: {},
        };
      }

      // Sort: Guest Code first, then alphabetical
      const sortedCodes = Object.values(codesByName).sort((a, b) => {
        if (a.type === "guest") return -1;
        if (b.type === "guest") return 1;
        return (a.name || "").localeCompare(b.name || "");
      });

      setCodes(sortedCodes);
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
      // Force guest code constraints
      if (codeData.type === "guest") {
        codeData.name = "Guest Code";
        codeData.isEditable = false;
      }

      const attachments = codeData.attachments || [];

      if (selectedCode) {
        // EDITING an existing code
        const oldBrandIds = new Set(
          selectedCode.attachments?.map(a => a.brandId) || []
        );
        const newBrandIds = new Set(attachments.map(a => a.brandId));

        // Delete removed brand attachments
        for (const brandId of oldBrandIds) {
          if (!newBrandIds.has(brandId)) {
            const codeId = selectedCode.codeIdsByBrand?.[brandId];
            if (codeId) {
              await axiosInstance.delete(`/code-settings/brands/${brandId}/codes/${codeId}`);
            }
          }
        }

        if (attachments.length === 0) {
          // No brands attached — save/update as user-level code
          if (selectedCode.userLevelCodeId) {
            // Update existing user-level code
            await axiosInstance.put(
              `/code-settings/user/codes/${selectedCode.userLevelCodeId}`,
              codeData
            );
          } else {
            // Create new user-level code
            await axiosInstance.post("/code-settings/user/codes", codeData);
          }
        } else {
          // Has brand attachments — delete user-level version if it existed
          if (selectedCode.userLevelCodeId) {
            try {
              await axiosInstance.delete(`/code-settings/user/codes/${selectedCode.userLevelCodeId}`);
            } catch (e) {
              // User-level code may already be gone
            }
          }

          // Update existing / Create new brand-level codes
          for (const attachment of attachments) {
            const brandId = attachment.brandId;
            const existingCodeId = selectedCode.codeIdsByBrand?.[brandId];

            if (existingCodeId) {
              await axiosInstance.put(
                `/code-settings/brands/${brandId}/codes/${existingCodeId}`,
                { ...codeData, isGlobalForBrand: attachment.isGlobalForBrand ?? true }
              );
            } else {
              await axiosInstance.post(
                `/code-settings/brands/${brandId}/codes`,
                { ...codeData, isGlobalForBrand: attachment.isGlobalForBrand ?? true }
              );
            }
          }
        }

        toast.showSuccess("Code updated");
      } else {
        // CREATING a new code
        if (attachments.length === 0) {
          // No brand — save as user-level code
          await axiosInstance.post("/code-settings/user/codes", codeData);
        } else {
          // Has brands — create one CodeSettings per brand
          for (const attachment of attachments) {
            await axiosInstance.post(
              `/code-settings/brands/${attachment.brandId}/codes`,
              { ...codeData, isGlobalForBrand: attachment.isGlobalForBrand ?? true }
            );
          }
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
    if (code.type === "guest") return; // Cannot delete built-in Guest Code
    setCodeToDelete(code);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!codeToDelete) return;

    try {
      // Delete from ALL brands this code is attached to
      const attachments = codeToDelete.attachments || [];
      const codeIdsByBrand = codeToDelete.codeIdsByBrand || {};

      for (const attachment of attachments) {
        const codeId = codeIdsByBrand[attachment.brandId];
        if (codeId) {
          await axiosInstance.delete(
            `/code-settings/brands/${attachment.brandId}/codes/${codeId}`
          );
        }
      }

      // Also delete user-level code if it exists
      if (codeToDelete.userLevelCodeId) {
        await axiosInstance.delete(`/code-settings/user/codes/${codeToDelete.userLevelCodeId}`);
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
  const isBuiltIn = code.type === "guest";

  return (
    <motion.div
      className={`code-card ${isSelected ? "selected" : ""} ${isBuiltIn ? "built-in" : ""}`}
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
          {isBuiltIn ? (
            <span className="built-in-badge">Built-in</span>
          ) : (
            <motion.button
              className="action-btn delete"
              onClick={onDelete}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RiDeleteBin6Line />
            </motion.button>
          )}
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

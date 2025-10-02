import React, { useState, useEffect, useContext } from "react";
import "./Brands.scss";
import { RiAddCircleLine, RiEditLine, RiSettings4Line } from "react-icons/ri";
import {
  FaInstagram,
  FaTiktok,
  FaFacebookF,
  FaTwitter,
  FaYoutube,
  FaSpotify,
  FaSoundcloud,
  FaLinkedinIn,
  FaGlobe,
  FaWhatsapp,
  FaTelegram,
} from "react-icons/fa";
import { MdEmail, MdPhone, MdLocationOn } from "react-icons/md";
import BrandForm from "../BrandForm/BrandForm";
import BrandSettings from "../BrandSettings/BrandSettings";
import Navigation from "../Navigation/Navigation";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useToast } from "../Toast/ToastContext";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import AuthContext from "../../contexts/AuthContext";
import { motion } from "framer-motion";
import ProgressiveImage from "../ProgressiveImage/ProgressiveImage";
import { useSelector } from "react-redux";
import { selectAllBrands } from "../../redux/brandSlice";
import { selectAllRoles } from "../../redux/rolesSlice";

// Helper function to check if a user can access brand settings (team management or owner)
const hasBrandSettingsPermissions = (brand, user) => {
  // If no user or brand, permission denied
  if (!user || !brand) return false;

  // If user is the brand owner, they have permission
  const ownerId = typeof brand.owner === "object" ? brand.owner._id : brand.owner;
  const userId = user._id;

  if (ownerId === userId) {
    return true;
  }

  // Check if the brand has the user's role attached (from Redux resolution)
  if (brand.role && brand.role.permissions) {
    // Use the resolved role permissions for team management
    const hasTeamManagePermission = brand.role.permissions.team?.manage === true;
    return hasTeamManagePermission;
  }

  // Fallback to the original logic for backward compatibility
  if (brand.team && Array.isArray(brand.team)) {
    const teamMember = brand.team.find((member) => {
      const memberId = typeof member.user === "object" ? member.user._id : member.user;
      return memberId === userId;
    });

    if (teamMember) {
      // Parse permissions if they're a string
      let parsedPermissions = teamMember.permissions;

      if (typeof teamMember.permissions === "string") {
        try {
          parsedPermissions = JSON.parse(teamMember.permissions);
        } catch (error) {
          parsedPermissions = {};
        }
      }

      // Check the permissions object
      if (parsedPermissions) {
        const hasTeamManagePermission = parsedPermissions?.team?.manage === true;
        return hasTeamManagePermission;
      }
    }
  }
  return false;
};

// Helper function to check if a user can edit the brand itself (owner only)
const hasBrandEditPermissions = (brand, user) => {
  // If no user or brand, permission denied
  if (!user || !brand) return false;

  // Only brand owners can edit the brand itself
  const ownerId = typeof brand.owner === "object" ? brand.owner._id : brand.owner;
  const userId = user._id;

  return ownerId === userId;
};

// Helper function to get user permissions for a brand (like Events.js)
const getUserBrandPermissions = (brand, user) => {
  // If no user or brand, return empty permissions
  if (!user || !brand) return {};

  // If user is the brand owner, they have all permissions
  const ownerId = typeof brand.owner === "object" ? brand.owner._id : brand.owner;
  const userId = user._id;

  if (ownerId === userId) {
    return {
      isOwner: true,
      team: { manage: true },
      events: { create: true, edit: true, delete: true },
      analytics: { view: true },
      settings: { manage: true }
    };
  }

  // Check if the brand has the user's role attached (from Redux resolution)
  if (brand.role && brand.role.permissions) {
    return brand.role.permissions;
  }

  // Fallback to team member permissions
  const teamMember = brand.team?.find(
    (member) =>
      member.user === user._id ||
      (typeof member.user === "object" && member.user._id === user._id)
  );

  if (teamMember && teamMember.permissions) {
    if (typeof teamMember.permissions === "string") {
      try {
        return JSON.parse(teamMember.permissions);
      } catch (error) {
        return {};
      }
    }
    return teamMember.permissions;
  }

  return {};
};

const SocialIcon = ({ platform, url }) => {
  const icons = {
    instagram: FaInstagram,
    tiktok: FaTiktok,
    facebook: FaFacebookF,
    twitter: FaTwitter,
    youtube: FaYoutube,
    spotify: FaSpotify,
    soundcloud: FaSoundcloud,
    linkedin: FaLinkedinIn,
    website: FaGlobe,
    whatsapp: FaWhatsapp,
    telegram: FaTelegram,
  };

  const Icon = icons[platform];
  return (
    <div className={`social-icon ${url ? "active" : "empty"}`}>
      <Icon />
    </div>
  );
};

const ContactInfo = ({ type, value, icon: Icon }) => (
  <div className={`contact-info ${value ? "active" : "empty"}`}>
    <Icon />
    <span>{value || ""}</span>
  </div>
);

const Brands = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // Get Redux store data
  const reduxBrands = useSelector(selectAllBrands);
  const roles = useSelector(selectAllRoles);
  const userRoles = useSelector((state) => state.roles?.userRoles || {});
  
  const [userBrands, setUserBrands] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedBrandForSettings, setSelectedBrandForSettings] =
    useState(null);
  const toast = useToast();

  // Prepare brand with role data (copied from Events.js)
  const prepareBrandWithData = (brand) => {
    // Get user's role for this brand
    const userRoleId = userRoles[brand._id];
    const userRole = roles.find((role) => role._id === userRoleId);

    return {
      ...brand,
      role: userRole,
    };
  };

  // Use Redux brands and prepare them with role data
  const prepareBrands = () => {
    if (reduxBrands.length > 0) {
      const brandsWithData = reduxBrands.map(prepareBrandWithData);
      setUserBrands(brandsWithData);
    } else {
      setUserBrands([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Only run prepareBrands if we have the necessary data
    if (reduxBrands.length >= 0 && user?._id) {
      prepareBrands();
    }
  }, [reduxBrands, roles, userRoles, user]);

  const handleBrandClick = (brand) => {
    setSelectedBrand(brand);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedBrand(null);
  };

  const handleSave = async (brandData) => {
    try {
      // The brand data will be updated in Redux by the BrandForm component
      // We just need to update our local state
      setUserBrands((prev) => {
        const updatedBrands = selectedBrand
          ? prev.map((b) => (b._id === selectedBrand._id ? brandData : b))
          : [...prev, brandData];

        return updatedBrands;
      });

      handleClose();
    } catch (error) {
      toast.showError(error.response?.data?.message || "Failed to save brand");
    }
  };

  const handleDelete = async (brandId) => {
    try {
      const loadingToast = toast.showLoading("Deleting brand...");

      const token = localStorage.getItem("token");
      if (!token) {
        toast.showError("Authentication required");
        return;
      }

      const deleteUrl = `${process.env.REACT_APP_API_BASE_URL}/brands/${brandId}`;

      await axios.delete(deleteUrl, {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.showSuccess("Brand deleted successfully!");
      prepareBrands();
      loadingToast.dismiss();
    } catch (error) {
      toast.showError("Failed to delete brand");
    }
  };

  const handleBack = () => {
    navigate(`/@${user.username}`);
  };

  const handleSettingsClick = (brand) => {
    // Check if this is a deletion result from BrandCard
    if (brand && brand.action === "deleted") {
      // Remove the deleted brand from the userBrands array
      setUserBrands((prev) => prev.filter((b) => b._id !== brand.brandId));
      toast.showSuccess("Brand successfully deleted");
      return;
    }

    // Regular settings handling
    setSelectedBrandForSettings(brand);
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    setSelectedBrandForSettings(null);
  };

  const handleBrandDelete = async (brandId) => {
    try {
      await handleDelete(brandId);
      handleSettingsClose();
    } catch (error) {
      // Error is already handled in handleDelete
    }
  };

  const handleSettingsSave = async (settings) => {
    try {
      if (!selectedBrandForSettings) return;

      const token = localStorage.getItem("token");
      if (!token) {
        toast.showError("Authentication required");
        return;
      }

      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/brands/${selectedBrandForSettings._id}`,
        {
          settings,
        },
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.showSuccess("Brand settings updated successfully");
      // The brands will be updated via Redux, so we just need to trigger a re-preparation
      prepareBrands();
    } catch (error) {
      toast.showError("Failed to update brand settings");
    }
  };

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
      />

      <div className="brands">
        <div className="brands-header">
          <h1>Your Brands</h1>
          <p>Create and manage your brand portfolio</p>
        </div>

        <div className="brands-grid">
          {loading ? (
            <div className="loading-state">Loading brands...</div>
          ) : userBrands.length > 0 ? (
            <>
              {userBrands.map((brand) => (
                <BrandCard
                  key={brand._id}
                  brand={brand}
                  onClick={handleBrandClick}
                  onSettingsClick={handleSettingsClick}
                  onSettingsSave={handleSettingsSave}
                  onSettingsDelete={handleBrandDelete}
                />
              ))}

              <div
                className="brand-card add-card"
                onClick={() => setShowForm(true)}
              >
                <RiAddCircleLine className="add-icon" />
                <p>Create New Brand</p>
              </div>
            </>
          ) : (
            <>
              <div
                className="brand-card add-card"
                onClick={() => setShowForm(true)}
              >
                <RiAddCircleLine className="add-icon" />
                <p>No brands found. Create your first brand!</p>
              </div>
            </>
          )}
        </div>

        {showForm && (
          <BrandForm
            brand={selectedBrand}
            onClose={handleClose}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
};

const BrandCard = ({
  brand,
  onClick,
  onSettingsClick,
  onSettingsSave,
  onSettingsDelete,
}) => {
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const { user } = useContext(AuthContext); // Get current user

  // Check if the user has permission to access brand settings (team management or owner)
  const hasSettingsPermission = hasBrandSettingsPermissions(brand, user);
  
  // Check if the user can edit the brand itself (owner only)
  const hasEditPermission = hasBrandEditPermissions(brand, user);
  
  // Get the user's specific permissions for this brand
  const userPermissions = getUserBrandPermissions(brand, user);

  const getImageUrl = (imageObj) => {
    if (!imageObj) return null;

    // If it's a string, it's a direct URL
    if (typeof imageObj === "string") return imageObj;

    // If it has urls object, use that
    if (imageObj.urls) {
      return (
        imageObj.urls.medium || imageObj.urls.full || imageObj.urls.thumbnail
      );
    }

    // If it has different sizes, use those
    return (
      imageObj.medium ||
      imageObj.full ||
      imageObj.thumbnail ||
      imageObj.original
    );
  };

  const coverImageUrl = getImageUrl(brand.coverImage);
  const logoUrl = getImageUrl(brand.logo);

  const socialPlatforms = [
    "instagram",
    "tiktok",
    "facebook",
    "twitter",
    "youtube",
    "spotify",
    "soundcloud",
    "linkedin",
    "website",
    "whatsapp",
    "telegram",
  ];

  const handleEditClick = (e) => {
    e.stopPropagation();
    onClick(brand);
  };

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    setShowSettingsPopup(true);
  };

  return (
    <>
    <motion.div className="brand-card">
      <div className="brand-card-header">
        <div className="brand-cover-image">
          {coverImageUrl && (
            <ProgressiveImage
              thumbnailSrc={getImageUrl(brand.coverImage)}
              mediumSrc={getImageUrl(brand.coverImage)}
              fullSrc={getImageUrl(brand.coverImage)}
              alt={`${brand.name} cover`}
              className="cover-image"
            />
          )}
        </div>
        <div className="card-actions">
          {/* Edit button - only for brand owners */}
          {hasEditPermission && (
            <motion.button
              className="action-button edit"
              onClick={handleEditClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RiEditLine />
            </motion.button>
          )}
          {/* Settings button - for team managers and owners */}
          {hasSettingsPermission && (
            <motion.button
              className="action-button settings"
              onClick={handleSettingsClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RiSettings4Line />
            </motion.button>
          )}
        </div>
      </div>
      <div className="brand-card-content">
        {logoUrl && (
          <div className="brand-logo">
            <ProgressiveImage
              thumbnailSrc={getImageUrl(brand.logo)}
              mediumSrc={getImageUrl(brand.logo)}
              fullSrc={getImageUrl(brand.logo)}
              alt={`${brand.name} logo`}
              className="logo-image"
            />
          </div>
        )}
        <div className="brand-info">
          <h3>{brand.name}</h3>
          <span className="username">@{brand.username}</span>
          {brand.description && (
            <p className="description">{brand.description}</p>
          )}
        </div>

        <div className="brand-details">
          <div className="social-icons">
            {socialPlatforms.map((platform) => (
              <SocialIcon
                key={platform}
                platform={platform}
                url={brand.social?.[platform]}
              />
            ))}
          </div>

          <div className="contact-section">
            <ContactInfo
              type="email"
              value={brand.contact?.email}
              icon={MdEmail}
            />
            <ContactInfo
              type="phone"
              value={brand.contact?.phone}
              icon={MdPhone}
            />
            <ContactInfo
              type="address"
              value={brand.contact?.address}
              icon={MdLocationOn}
            />
          </div>
        </div>
      </div>
    </motion.div>
    
    {/* Settings Popup Modal */}
    {showSettingsPopup && hasSettingsPermission && (
      <div className="settings-popup-overlay" onClick={() => setShowSettingsPopup(false)}>
        <div className="settings-popup" onClick={(e) => e.stopPropagation()}>
          <BrandSettings
            brand={brand}
            userPermissions={userPermissions}
            onClose={(result) => {
              setShowSettingsPopup(false);
              // If this was a deletion, notify the parent via onSettingsClick callback
              if (result && result.deleted) {
                onSettingsClick({ action: "deleted", brandId: result.brandId });
              }
            }}
            onDelete={onSettingsDelete}
            onSave={onSettingsSave}
          />
        </div>
      </div>
    )}
    
    {/* No Permission Modal */}
    {showSettingsPopup && !hasSettingsPermission && (
      <div className="settings-popup-overlay" onClick={() => setShowSettingsPopup(false)}>
        <div className="settings-popup" onClick={(e) => e.stopPropagation()}>
          <div className="no-permission-message">
            <h3>Access Restricted</h3>
            <p>You don't have permission to access brand settings.</p>
            <button className="back-button" onClick={() => setShowSettingsPopup(false)}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Brands;

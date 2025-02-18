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
  const [brands, setBrands] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedBrandForSettings, setSelectedBrandForSettings] =
    useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    const loadingToast = toast.showLoading("Loading brands...");
    try {
      console.log("[Brands] Fetching brands...");

      // Get current token and log it
      const token = localStorage.getItem("token");
      console.log("[Brands] Auth check:", {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenStart: token ? `${token.substring(0, 20)}...` : null,
      });

      if (!token) {
        console.error("[Brands] No token found in localStorage");
        toast.showError("Authentication required");
        setLoading(false);
        setBrands([]);
        return;
      }

      // Log the complete URL and request config
      const url = `${process.env.REACT_APP_API_BASE_URL}/brands`;
      const config = {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      console.log("[Brands] Request configuration:", {
        url,
        method: "GET",
        headers: config.headers,
        withCredentials: config.withCredentials,
      });

      const response = await axios.get(url, config);

      console.log("[Brands] Response details:", {
        status: response.status,
        statusText: response.statusText,
        headers: {
          contentType: response.headers["content-type"],
          authorization: response.config.headers["Authorization"],
        },
        data: {
          isArray: Array.isArray(response.data),
          length: response.data?.length || 0,
          sample: response.data?.[0]
            ? {
                id: response.data[0]._id,
                name: response.data[0].name,
              }
            : null,
        },
      });

      if (Array.isArray(response.data)) {
        setBrands(response.data);
        console.log(
          "[Brands] State updated with brands:",
          response.data.length
        );
      } else {
        console.error("[Brands] Response data is not an array:", response.data);
        setBrands([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("[Brands] Error fetching brands:", error);

      if (error.response?.status === 401) {
        toast.showError("Session expired. Please log in again.");
      } else {
        toast.showError("Failed to load brands");
      }

      setLoading(false);
      setBrands([]);
    } finally {
      loadingToast.dismiss();
    }
  };

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
      console.log("[Brands] Starting brand save with data:", {
        id: selectedBrand?._id,
        name: brandData.name,
        username: brandData.username,
        hasLogo: !!brandData.logo,
        hasCover: !!brandData.coverImage,
      });

      // Update the brands list with the new data immediately
      setBrands((prev) => {
        if (selectedBrand) {
          return prev.map((b) => (b._id === selectedBrand._id ? brandData : b));
        } else {
          return [...prev, brandData];
        }
      });

      // No need to fetch brands again since we've already updated the state
      handleClose();
    } catch (error) {
      console.error("[Brands] Save error:", error);
      toast.showError(error.response?.data?.message || "Failed to save brand");
    }
  };

  const handleDelete = async (brandId) => {
    console.log("[Brands] handleDelete triggered", {
      brandId,
      hasToken: !!localStorage.getItem("token"),
    });

    try {
      const loadingToast = toast.showLoading("Deleting brand...");
      console.log("[Brands] Sending delete request for brand:", brandId);

      await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/brands/${brandId}`,
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      console.log("[Brands] Brand deleted successfully:", brandId);
      toast.showSuccess("Brand deleted successfully!");
      fetchBrands();
    } catch (error) {
      console.error("[Brands] Error deleting brand:", {
        brandId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.showError("Failed to delete brand");
    }
  };

  const handleBack = () => {
    navigate(`/@${user.username}`);
  };

  const handleSettingsClick = (brand) => {
    setSelectedBrandForSettings(brand);
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
    setSelectedBrandForSettings(null);
  };

  const handleBrandDelete = async (brandId) => {
    console.log("[Brands] handleBrandDelete triggered", { brandId });
    try {
      await handleDelete(brandId);
      console.log("[Brands] handleDelete completed, closing settings");
      handleSettingsClose();
    } catch (error) {
      console.error("[Brands] Error in handleBrandDelete:", {
        brandId,
        error: error.message,
      });
    }
  };

  const handleSettingsSave = async (settings) => {
    try {
      if (!selectedBrandForSettings) return;

      await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/brands/${selectedBrandForSettings._id}`,
        {
          settings,
        }
      );

      toast.showSuccess("Brand settings updated successfully");
      fetchBrands();
    } catch (error) {
      console.error("Error updating brand settings:", error);
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
          ) : brands.length > 0 ? (
            <>
              {brands.map((brand) => (
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
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBackContent, setShowBackContent] = useState(false);

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

  useEffect(() => {
    if (isFlipped) {
      // Show back content after a small delay to sync with flip
      const timer = setTimeout(() => setShowBackContent(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowBackContent(false);
    }
  }, [isFlipped]);

  console.log("[BrandCard] Rendering brand:", {
    id: brand._id,
    name: brand.name,
    coverImage: brand.coverImage,
    logo: brand.logo,
    social: brand.social,
    contact: brand.contact,
  });

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
    setIsFlipped(true);
  };

  const handleSettingsClose = () => {
    setIsFlipped(false);
  };

  return (
    <motion.div
      className={`brand-card ${isFlipped ? "flipped" : ""}`}
      style={{
        transformStyle: "preserve-3d",
        perspective: "1000px",
      }}
    >
      {/* Front side */}
      <div
        className="card-front"
        style={{
          backfaceVisibility: "hidden",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          zIndex: isFlipped ? 0 : 1,
          position: "absolute",
          inset: 0,
          transformOrigin: "center",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
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
            <motion.button
              className="action-button edit"
              onClick={handleEditClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RiEditLine />
            </motion.button>
            <motion.button
              className="action-button settings"
              onClick={handleSettingsClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RiSettings4Line />
            </motion.button>
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
      </div>

      {/* Back side */}
      <div
        className="card-back"
        style={{
          backfaceVisibility: "hidden",
          transform: `rotateY(${isFlipped ? 0 : -180}deg) scaleX(-1)`,
          zIndex: isFlipped ? 1 : 0,
          position: "absolute",
          inset: 0,
          transformOrigin: "center",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {showBackContent && (
          <BrandSettings
            brand={brand}
            onClose={() => setIsFlipped(false)}
            onDelete={onSettingsDelete}
            onSave={onSettingsSave}
          />
        )}
      </div>
    </motion.div>
  );
};

export default Brands;

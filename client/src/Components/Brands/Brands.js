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
import Navigation from "../Navigation/Navigation";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import AuthContext from "../../contexts/AuthContext";

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

const BrandCard = ({ brand, onClick }) => {
  console.log("[BrandCard] Rendering brand:", {
    id: brand._id,
    name: brand.name,
    coverImage: brand.coverImage,
    logo: brand.logo,
    social: brand.social,
    contact: brand.contact,
  });

  const addCacheBuster = (url) => {
    if (!url) return "";
    // Add both a timestamp and a random string to defeat CloudFront caching
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(7);
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${timestamp}-${random}`;
  };

  const getImageUrl = (imageObj, size) => {
    if (!imageObj || !imageObj[size]) return "";
    const url = imageObj[size];

    // If it's a blob URL, use it as is (temporary preview)
    if (url.startsWith("blob:")) {
      return url;
    }

    // Always add cache buster for CloudFront URLs
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(7);
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${timestamp}-${random}`;
  };

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
    // Will implement settings later
    console.log("Settings clicked");
  };

  return (
    <div className="brand-card">
      <div className="brand-card-header">
        {brand.coverImage && (
          <img
            src={getImageUrl(brand.coverImage, "medium")}
            alt=""
            className="brand-cover-image"
            onError={(e) => {
              console.error("[BrandCard] Error loading cover image:", e);
              e.target.style.display = "none";
            }}
          />
        )}
        <div className="card-actions">
          <button className="action-button edit" onClick={handleEditClick}>
            <RiEditLine />
          </button>
          <button
            className="action-button settings"
            onClick={handleSettingsClick}
          >
            <RiSettings4Line />
          </button>
        </div>
      </div>
      <div className="brand-card-content">
        {brand.logo && (
          <img
            src={getImageUrl(brand.logo, "thumbnail")}
            alt=""
            className="brand-logo"
            onError={(e) => {
              console.error("[BrandCard] Error loading logo image:", e);
              e.target.style.display = "none";
            }}
          />
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
  );
};

const Brands = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [brands, setBrands] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      console.log("[Brands] Fetching brands...");
      toast.loading("Loading brands...");

      // Get current token and log it
      const token = localStorage.getItem("token");
      console.log("[Brands] Auth check:", {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenStart: token ? `${token.substring(0, 20)}...` : null,
      });

      // Log the complete URL and request config
      const url = `${process.env.REACT_APP_API_BASE_URL}/brands`;
      const config = {
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${token}`,
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
      toast.remove();
    } catch (error) {
      console.error("[Brands] Error fetching brands:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          headers: error.config?.headers,
          withCredentials: error.config?.withCredentials,
        },
      });
      toast.error("Failed to load brands");
      setLoading(false);
      setBrands([]); // Set empty array on error
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
      toast.loading(selectedBrand ? "Updating brand..." : "Creating brand...");

      console.log("[Brands] Starting brand save with data:", {
        id: selectedBrand?._id,
        name: brandData.name,
        username: brandData.username,
        hasLogo: !!brandData.logo,
        hasCover: !!brandData.coverImage,
      });

      const token = localStorage.getItem("token");
      const config = {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      console.log("[Brands] Auth check for save:", {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenStart: token ? `${token.substring(0, 20)}...` : null,
      });

      // Prepare the data to send
      const dataToSend = {
        ...brandData,
        logo: brandData.logo || null,
        coverImage: brandData.coverImage || null,
        social: {
          ...(selectedBrand?.social || {}),
          ...(brandData.social || {}),
        },
        contact: {
          ...(selectedBrand?.contact || {}),
          ...(brandData.contact || {}),
        },
      };

      let response;
      if (selectedBrand) {
        const updateUrl = `${process.env.REACT_APP_API_BASE_URL}/brands/${selectedBrand._id}`;
        console.log("[Brands] Updating brand:", {
          url: updateUrl,
          method: "PUT",
          brandId: selectedBrand._id,
          headers: config.headers,
        });

        response = await axios.put(updateUrl, dataToSend, config);

        console.log("[Brands] Update response:", {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: {
            id: response.data?._id,
            name: response.data?.name,
            hasLogo: !!response.data?.logo,
            hasCover: !!response.data?.coverImage,
          },
        });

        toast.success("Brand updated successfully!");
      } else {
        const createUrl = `${process.env.REACT_APP_API_BASE_URL}/brands`;
        console.log("[Brands] Creating new brand:", {
          url: createUrl,
          method: "POST",
          headers: config.headers,
        });

        response = await axios.post(createUrl, dataToSend, config);

        console.log("[Brands] Creation response:", {
          status: response.status,
          statusText: response.statusText,
          data: {
            id: response.data?._id,
            name: response.data?.name,
          },
        });

        toast.success("Brand created successfully!");
      }

      // Update the brands list with the new data immediately
      setBrands((prev) => {
        if (selectedBrand) {
          return prev.map((b) =>
            b._id === selectedBrand._id ? response.data : b
          );
        } else {
          return [...prev, response.data];
        }
      });

      await fetchBrands(); // Refresh the brands list
      handleClose();
    } catch (error) {
      console.error("[Brands] Save error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          baseURL: error.config?.baseURL,
          withCredentials: error.config?.withCredentials,
        },
      });

      toast.error(
        selectedBrand ? "Failed to update brand" : "Failed to create brand"
      );
    }
  };

  const handleDelete = async (brandId) => {
    if (window.confirm("Are you sure you want to delete this brand?")) {
      try {
        toast.loading("Deleting brand...");
        await axios.delete(
          `${process.env.REACT_APP_API_BASE_URL}/brands/${brandId}`,
          {
            withCredentials: true,
          }
        );
        toast.success("Brand deleted successfully!");
        fetchBrands();
      } catch (error) {
        toast.error("Failed to delete brand");
      }
    }
  };

  const handleBack = () => {
    navigate("/dashboard");
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
              {brands.map((brand) => {
                console.log("[Brands] Rendering brand card:", {
                  id: brand._id,
                  name: brand.name,
                  hasLogo: !!brand.logo,
                  hasCover: !!brand.coverImage,
                });
                return (
                  <BrandCard
                    key={brand._id}
                    brand={brand}
                    onClick={handleBrandClick}
                  />
                );
              })}

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
              <div className="no-brands-message">
                <p>No brands found. Create your first brand!</p>
              </div>
              <div
                className="brand-card add-card"
                onClick={() => setShowForm(true)}
              >
                <RiAddCircleLine className="add-icon" />
                <p>Create New Brand</p>
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

export default Brands;

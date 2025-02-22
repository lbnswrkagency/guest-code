import React, { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import "./BrandForm.scss";
import ImageUploader from "../../utils/ImageUploader";
import {
  RiCloseLine,
  RiUpload2Line,
  RiInstagramLine,
  RiTiktokLine,
  RiFacebookBoxLine,
  RiTwitterXLine,
  RiYoutubeLine,
  RiSpotifyLine,
  RiSoundcloudLine,
  RiLinkedinBoxLine,
  RiGlobalLine,
  RiWhatsappLine,
  RiTelegramLine,
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
  RiArrowDownSLine,
} from "react-icons/ri";
import {
  processImage,
  generateBlurPlaceholder,
} from "../../utils/imageProcessor";
import ProgressiveImage from "../ProgressiveImage/ProgressiveImage";
import ErrorBoundary from "../ErrorBoundary/ErrorBoundary";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import { useToast } from "../Toast/ToastContext";
import axios from "axios";

const BrandFormContent = ({ brand, onClose, onSave }) => {
  const toast = useToast();
  const [errors, setErrors] = useState({
    name: "",
    username: "",
    logo: "",
  });

  const [formData, setFormData] = useState(() => ({
    name: brand?.name || "",
    username: brand?.username || "",
    description: brand?.description || "",
    logo: null,
    coverImage: null,
    colors: {
      primary: brand?.colors?.primary || "#ffc807",
      secondary: brand?.colors?.secondary || "#ffffff",
      accent: brand?.colors?.accent || "#000000",
    },
    social: {
      instagram: brand?.social?.instagram || "",
      tiktok: brand?.social?.tiktok || "",
      facebook: brand?.social?.facebook || "",
      twitter: brand?.social?.twitter || "",
      youtube: brand?.social?.youtube || "",
      spotify: brand?.social?.spotify || "",
      soundcloud: brand?.social?.soundcloud || "",
      linkedin: brand?.social?.linkedin || "",
      telegram: brand?.social?.telegram || "",
    },
    contact: {
      email: brand?.contact?.email || "",
      phone: brand?.contact?.phone || "",
      address: brand?.contact?.address || "",
      website: brand?.contact?.website || "",
      whatsapp: brand?.contact?.whatsapp || "",
    },
  }));

  const [processedFiles, setProcessedFiles] = useState({
    logo: null,
    cover: null,
  });

  const [previews, setPreviews] = useState(() => ({
    logo: brand?.logo || null,
    cover: brand?.coverImage || null,
  }));

  const [showAllSocial, setShowAllSocial] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [blobUrls, setBlobUrls] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const processQueue = useRef([]);
  const abortControllerRef = useRef(null);

  // Initialize only once when component mounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Cleanup blob URLs
      Object.values(previews).forEach((preview) => {
        if (preview?.urls) {
          Object.values(preview.urls).forEach((url) => {
            if (url && url.startsWith("blob:")) {
              URL.revokeObjectURL(url);
            }
          });
        }
      });
    };
  }, []); // Empty dependency array

  const initializeImagePreviews = useCallback(async () => {
    if (!brand) return;
    // ... rest of initialization logic
  }, [brand]); // Only depend on brand

  const createAndTrackBlobUrl = (blob) => {
    const url = URL.createObjectURL(blob);
    setBlobUrls((prev) => new Set([...prev, url]));
    return url;
  };

  // Validate form
  useEffect(() => {
    const isValid =
      formData.name &&
      formData.username &&
      (processedFiles.logo || brand?.logo);
    setIsFormValid(isValid);
  }, [formData.name, formData.username, processedFiles.logo, brand?.logo]);

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const loadingToast = toast.showLoading("Processing...");

    try {
      // Validate file size
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("Max: 20MB");
      }

      const blurPlaceholder = await generateBlurPlaceholder(file);
      const processed = await processImage(file);

      // Create and track blob URLs
      const previewUrls = {
        thumbnail: createAndTrackBlobUrl(processed.thumbnail.file),
        medium: createAndTrackBlobUrl(processed.medium.file),
        full: createAndTrackBlobUrl(processed.full.file),
        blur: createAndTrackBlobUrl(new Blob([blurPlaceholder])),
      };

      // Update state
      setProcessedFiles((prev) => ({
        ...prev,
        [type]: processed,
      }));

      setPreviews((prev) => ({
        ...prev,
        [type]: previewUrls,
      }));

      toast.showSuccess("Done");
    } catch (error) {
      // Format error message to be more concise
      let errorMsg = error.message;
      if (errorMsg.includes("dimensions")) {
        errorMsg = errorMsg.replace(/.*dimensions/i, "Min dimensions:");
      }
      toast.showError(errorMsg);
      // Clear the file input
      e.target.value = "";
    } finally {
      loadingToast.dismiss();
    }
  };

  const handleImageUpload = async (file, type, brandId) => {
    try {
      const formData = new FormData();
      formData.append(type === "logo" ? "logo" : "coverImage", file);

      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/brands/${brandId}/${type}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );

      return response.data.brand;
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) {
      const newErrors = {};
      if (!formData.name) newErrors.name = "Brand name is required";
      if (!formData.username) newErrors.username = "Username is required";
      if (!processedFiles.logo && !brand?.logo)
        newErrors.logo = "Logo is required";
      setErrors(newErrors);

      const errorMessage = Object.values(newErrors).join(", ");
      toast.showError(errorMessage);
      return;
    }

    setErrors({});
    const loadingToast = toast.showLoading("Saving...");
    setIsSubmitting(true);

    try {
      let updatedFormData = { ...formData };
      const token = localStorage.getItem("token");

      let brandResponse;
      if (brand?._id) {
        // Update existing brand
        brandResponse = await axios.put(
          `${process.env.REACT_APP_API_BASE_URL}/brands/${brand._id}`,
          {
            ...updatedFormData,
            username: updatedFormData.username.toLowerCase(),
          },
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        // Create new brand
        brandResponse = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/brands`,
          {
            ...updatedFormData,
            username: updatedFormData.username.toLowerCase(),
          },
          {
            withCredentials: true,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      let updatedBrand = brandResponse.data;

      // Upload logo if exists
      if (processedFiles.logo) {
        const logoFormData = new FormData();
        logoFormData.append("logo", processedFiles.logo.full.file);

        try {
          const logoResponse = await axios.put(
            `${process.env.REACT_APP_API_BASE_URL}/brands/${brandResponse.data._id}/logo`,
            logoFormData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${token}`,
              },
              withCredentials: true,
            }
          );
          updatedBrand = logoResponse.data.brand;

          // Add a small delay to allow cache invalidation to complete
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          toast.showError("Logo upload failed, but brand was created");
        }
      }

      // Upload cover if exists
      if (processedFiles.cover) {
        const coverFormData = new FormData();
        coverFormData.append("coverImage", processedFiles.cover.full.file);

        try {
          const coverResponse = await axios.put(
            `${process.env.REACT_APP_API_BASE_URL}/brands/${brandResponse.data._id}/cover`,
            coverFormData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${token}`,
              },
              withCredentials: true,
            }
          );
          updatedBrand = coverResponse.data.brand;

          // Add a small delay to allow cache invalidation to complete
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          toast.showError("Cover image upload failed, but brand was created");
        }
      }

      // Fetch the latest brand data to ensure we have the most up-to-date information
      const finalBrandResponse = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/brands/${brandResponse.data._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
      updatedBrand = finalBrandResponse.data;

      // Call onSave with the final brand data that includes updated image URLs
      await onSave(updatedBrand);

      // Show success message and close form
      toast.showSuccess(
        brand?._id
          ? "Brand updated successfully!"
          : "Brand created successfully!"
      );
      onClose();
    } catch (error) {
      toast.showError(
        error.response?.data?.message || "Error saving brand. Please try again."
      );
    } finally {
      setIsSubmitting(false);
      loadingToast.dismiss();
    }
  };

  const socialInputs = [
    {
      name: "instagram",
      icon: <RiInstagramLine />,
      prefix: "instagram.com/",
      placeholder: "username",
      priority: 1,
    },
    {
      name: "tiktok",
      icon: <RiTiktokLine />,
      prefix: "tiktok.com/@",
      placeholder: "username",
      priority: 2,
    },
    {
      name: "facebook",
      icon: <RiFacebookBoxLine />,
      prefix: "facebook.com/",
      placeholder: "username or page name",
      priority: 3,
    },
    {
      name: "twitter",
      icon: <RiTwitterXLine />,
      prefix: "twitter.com/",
      placeholder: "username",
      priority: 4,
    },
    {
      name: "youtube",
      icon: <RiYoutubeLine />,
      prefix: "youtube.com/@",
      placeholder: "channel name",
      priority: 5,
    },
    {
      name: "spotify",
      icon: <RiSpotifyLine />,
      prefix: "open.spotify.com/artist/",
      placeholder: "artist name",
      priority: 6,
    },
    {
      name: "soundcloud",
      icon: <RiSoundcloudLine />,
      prefix: "soundcloud.com/",
      placeholder: "profile name",
      priority: 7,
    },
    {
      name: "linkedin",
      icon: <RiLinkedinBoxLine />,
      prefix: "linkedin.com/company/",
      placeholder: "company name",
      priority: 8,
    },
    {
      name: "telegram",
      icon: <RiTelegramLine />,
      prefix: "t.me/",
      placeholder: "username",
      priority: 9,
    },
  ];

  // Sort social inputs by priority and filter based on showAllSocial
  const visibleSocialInputs = socialInputs
    .sort((a, b) => a.priority - b.priority)
    .filter((_, index) => showAllSocial || index < 5);

  return (
    <div className="brand-form-overlay">
      <div className="brand-form">
        <button className="close-button" onClick={onClose}>
          <RiCloseLine />
        </button>

        <h2>{brand ? "Edit Brand" : "Create New Brand"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-header">
            <div className="cover-upload">
              <div className="upload-placeholder">
                <div className="dashed-border" />
                <RiUpload2Line />
                <span>Upload Cover Image</span>
              </div>
              {previews.cover && (
                <ProgressiveImage
                  thumbnailSrc={previews.cover.thumbnail}
                  mediumSrc={previews.cover.medium}
                  fullSrc={previews.cover.full}
                  blurPlaceholder={previews.cover.blur}
                  alt="Cover"
                  className="cover-image"
                />
              )}
              <input
                type="file"
                onChange={(e) => handleFileChange(e, "cover")}
                accept="image/*"
                id="cover-upload"
                disabled={isUploading}
              />
              <label htmlFor="cover-upload">
                <RiUpload2Line />
                <span>Upload Cover Image</span>
              </label>
            </div>

            <div
              className={`logo-upload required ${errors.logo ? "error" : ""}`}
            >
              <input
                type="file"
                onChange={(e) => handleFileChange(e, "logo")}
                accept="image/*"
                id="logo-upload"
                disabled={isUploading}
              />
              <label htmlFor="logo-upload">
                {previews.logo ? (
                  <ProgressiveImage
                    thumbnailSrc={previews.logo.thumbnail}
                    mediumSrc={previews.logo.medium}
                    fullSrc={previews.logo.full}
                    blurPlaceholder={previews.logo.blur}
                    alt="Logo"
                    className="logo-image"
                  />
                ) : (
                  <>
                    <RiUpload2Line />
                    <span>
                      Upload Logo{" "}
                      {errors.logo && <span className="error-text">*</span>}
                    </span>
                  </>
                )}
              </label>
              {errors.logo && (
                <div className="error-message">{errors.logo}</div>
              )}
            </div>
          </div>

          <div className="form-fields">
            <div
              className={`input-group required ${errors.name ? "error" : ""}`}
            >
              <input
                type="text"
                placeholder="Brand Name"
                value={formData.name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                required
              />
              {errors.name && (
                <div className="error-message">{errors.name}</div>
              )}
            </div>

            <div
              className={`input-group username-group required ${
                errors.username ? "error" : ""
              }`}
            >
              <div className="username-wrapper">
                <span className="username-prefix">@</span>
                <input
                  className="username-input"
                  type="text"
                  placeholder="Choose your username"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }));
                    if (errors.username)
                      setErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  required
                />
              </div>
              {errors.username && (
                <div className="error-message">{errors.username}</div>
              )}
              <p className="input-hint">This will be your unique identifier</p>
            </div>

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />

            <div className="form-section social-section">
              <h3>Social Media</h3>
              <div className="social-inputs">
                {visibleSocialInputs.map((social) => (
                  <div key={social.name} className="social-input-group">
                    <div className="input-wrapper">
                      <div className="social-icon">{social.icon}</div>
                      <span className="social-prefix">{social.prefix}</span>
                      <input
                        type="text"
                        placeholder={social.placeholder}
                        value={formData.social[social.name]}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            social: {
                              ...prev.social,
                              [social.name]: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>

              {socialInputs.length > 5 && (
                <button
                  type="button"
                  className={`show-more ${showAllSocial ? "expanded" : ""}`}
                  onClick={() => setShowAllSocial(!showAllSocial)}
                >
                  {showAllSocial ? "Show Less" : "Show More"}
                  <RiArrowDownSLine />
                </button>
              )}
            </div>

            <div className="form-section">
              <h3>Contact Information</h3>
              <div className="contact-info">
                <div className="input-wrapper">
                  <RiGlobalLine />
                  <input
                    type="url"
                    placeholder="Website URL"
                    value={formData.contact.website}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact: { ...prev.contact, website: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="input-wrapper">
                  <RiMailLine />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.contact.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact: { ...prev.contact, email: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="input-wrapper">
                  <RiPhoneLine />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formData.contact.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact: { ...prev.contact, phone: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="input-wrapper">
                  <RiWhatsappLine />
                  <input
                    type="tel"
                    placeholder="WhatsApp"
                    value={formData.contact.whatsapp}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact: { ...prev.contact, whatsapp: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="input-wrapper">
                  <RiMapPinLine />
                  <input
                    type="text"
                    placeholder="Address"
                    value={formData.contact.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact: { ...prev.contact, address: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className={`save-button ${!isFormValid ? "disabled" : ""}`}
                disabled={!isFormValid || isUploading}
              >
                {isUploading ? (
                  <span className="button-content">
                    <LoadingSpinner size="small" color="white" />
                    <span>Uploading...</span>
                  </span>
                ) : (
                  <span className="button-content">
                    {brand ? "Save Changes" : "Create Brand"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

BrandFormContent.propTypes = {
  brand: PropTypes.shape({
    name: PropTypes.string,
    username: PropTypes.string,
    description: PropTypes.string,
    logo: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        thumbnail: PropTypes.string,
        medium: PropTypes.string,
        full: PropTypes.string,
      }),
    ]),
    coverImage: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        thumbnail: PropTypes.string,
        medium: PropTypes.string,
        full: PropTypes.string,
      }),
    ]),
    colors: PropTypes.shape({
      primary: PropTypes.string,
      secondary: PropTypes.string,
      accent: PropTypes.string,
    }),
    social: PropTypes.object,
    contact: PropTypes.object,
  }),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

const BrandForm = (props) => (
  <ErrorBoundary>
    <BrandFormContent {...props} />
  </ErrorBoundary>
);

export default BrandForm;

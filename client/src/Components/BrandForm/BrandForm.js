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

const BrandFormContent = ({ brand, onClose, onSave }) => {
  const toast = useToast();

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

    const toastId = toast.showLoading("Processing image...");

    try {
      // Validate file size
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("File size too large. Maximum size is 20MB");
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

      toast.updateToast(toastId, {
        type: "success",
        message: "Image processed successfully",
        duration: 2000,
      });
    } catch (error) {
      toast.updateToast(toastId, {
        type: "error",
        message: error.message,
        duration: 5000,
      });
      // Clear the file input
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsUploading(true);
    const uploadToastId = toast.showLoading("Uploading files...");

    // Initialize new AbortController for this upload
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      let updatedFormData = { ...formData };

      // Upload logo if changed
      if (processedFiles.logo) {
        const logoUrls = await ImageUploader.uploadMultipleResolutions(
          processedFiles.logo,
          ImageUploader.folders.BRAND_LOGOS,
          `${formData.username}_logo`,
          (progress) => {
            toast.updateToast(uploadToastId, {
              message: `Uploading logo... ${Math.round(progress)}%`,
            });
          },
          signal
        );
        updatedFormData.logo = logoUrls;
      }

      // Upload cover if changed
      if (processedFiles.cover) {
        const coverUrls = await ImageUploader.uploadMultipleResolutions(
          processedFiles.cover,
          ImageUploader.folders.BRAND_COVERS,
          `${formData.username}_cover`,
          (progress) => {
            toast.updateToast(uploadToastId, {
              message: `Uploading cover... ${Math.round(progress)}%`,
            });
          },
          signal
        );
        updatedFormData.coverImage = coverUrls;
      }

      await onSave(updatedFormData);

      toast.updateToast(uploadToastId, {
        type: "success",
        message: brand
          ? "Brand updated successfully"
          : "Brand created successfully",
        duration: 3000,
      });
    } catch (error) {
      toast.updateToast(uploadToastId, {
        type: "error",
        message: `Upload failed: ${error.message}`,
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
      // Clean up the abort controller
      abortControllerRef.current = null;
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

            <div className="logo-upload required">
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
                    <span>Upload Logo</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="form-fields">
            <div className="input-group required">
              <input
                type="text"
                placeholder="Brand Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div className="input-group username-group required">
              <div className="username-wrapper">
                <span className="username-prefix">@</span>
                <input
                  className="username-input"
                  type="text"
                  placeholder="Choose your username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  required
                />
              </div>
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

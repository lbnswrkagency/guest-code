import React, { useState } from "react";
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
  RiAddLine,
} from "react-icons/ri";

const BrandForm = ({ brand, onClose, onSave }) => {
  const [formData, setFormData] = useState(
    brand || {
      name: "",
      username: "",
      description: "",
      logo: null,
      coverImage: null,
      colors: {
        primary: "#ffc807",
        secondary: "#ffffff",
        accent: "#000000",
      },
      social: {
        instagram: "",
        tiktok: "",
        facebook: "",
        twitter: "",
        youtube: "",
        spotify: "",
        soundcloud: "",
        linkedin: "",
        telegram: "",
      },
      contact: {
        email: "",
        phone: "",
        address: "",
        website: "",
        whatsapp: "",
      },
    }
  );

  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(brand?.logo || null);
  const [coverPreview, setCoverPreview] = useState(brand?.coverImage || null);
  const [showAllSocial, setShowAllSocial] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  // Validate form
  React.useEffect(() => {
    const isValid =
      formData.name && formData.username && (logoPreview || brand?.logo);
    setIsFormValid(isValid);
  }, [formData.name, formData.username, logoPreview, brand?.logo]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "logo") {
          setLogoPreview(reader.result);
          setLogoFile(file);
        } else {
          setCoverPreview(reader.result);
          setCoverFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsUploading(true);
    try {
      let updatedFormData = { ...formData };

      // Upload logo if changed
      if (logoFile) {
        const logoUrl = await ImageUploader.upload(
          logoFile,
          ImageUploader.folders.BRAND_LOGOS
        );
        updatedFormData.logo = logoUrl;
      }

      // Upload cover if changed
      if (coverFile) {
        const coverUrl = await ImageUploader.upload(
          coverFile,
          ImageUploader.folders.BRAND_COVERS
        );
        updatedFormData.coverImage = coverUrl;
      }

      onSave(updatedFormData);
    } catch (error) {
      console.error("Upload failed:", error);
      // Handle error (show notification, etc.)
    } finally {
      setIsUploading(false);
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
            <div
              className="cover-upload"
              style={
                coverPreview ? { backgroundImage: `url(${coverPreview})` } : {}
              }
            >
              <input
                type="file"
                onChange={(e) => handleFileChange(e, "cover")}
                accept="image/*"
                id="cover-upload"
                disabled={isUploading}
              />
              <label htmlFor="cover-upload">
                {isUploading ? (
                  <span className="uploading">Uploading...</span>
                ) : (
                  <>
                    <RiUpload2Line />
                    <span>Upload Cover Image</span>
                  </>
                )}
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
                {logoPreview ? (
                  <img src={logoPreview} alt="logo preview" />
                ) : isUploading ? (
                  <span className="uploading">Uploading...</span>
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
                {isUploading
                  ? "Uploading..."
                  : brand
                  ? "Save Changes"
                  : "Create Brand"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrandForm;

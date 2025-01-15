import React, { useState } from "react";
import "./BrandForm.scss";
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
        website: "",
        whatsapp: "",
        telegram: "",
      },
      contact: {
        email: "",
        phone: "",
        address: "",
      },
    }
  );

  const [logoPreview, setLogoPreview] = useState(brand?.logo || null);
  const [coverPreview, setCoverPreview] = useState(brand?.coverImage || null);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "logo") {
          setLogoPreview(reader.result);
          setFormData((prev) => ({ ...prev, logo: file }));
        } else {
          setCoverPreview(reader.result);
          setFormData((prev) => ({ ...prev, coverImage: file }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const socialInputs = [
    {
      name: "instagram",
      icon: <RiInstagramLine />,
      prefix: "instagram.com/",
    },
    {
      name: "tiktok",
      icon: <RiTiktokLine />,
      prefix: "tiktok.com/@",
    },
    {
      name: "facebook",
      icon: <RiFacebookBoxLine />,
      prefix: "facebook.com/",
    },
    {
      name: "twitter",
      icon: <RiTwitterXLine />,
      prefix: "twitter.com/",
    },
    {
      name: "youtube",
      icon: <RiYoutubeLine />,
      prefix: "youtube.com/@",
    },
    {
      name: "spotify",
      icon: <RiSpotifyLine />,
      prefix: "open.spotify.com/artist/",
    },
    {
      name: "soundcloud",
      icon: <RiSoundcloudLine />,
      prefix: "soundcloud.com/",
    },
    {
      name: "linkedin",
      icon: <RiLinkedinBoxLine />,
      prefix: "linkedin.com/company/",
    },
    {
      name: "website",
      icon: <RiGlobalLine />,
      placeholder: "Website URL",
    },
    {
      name: "whatsapp",
      icon: <RiWhatsappLine />,
      prefix: "+",
      placeholder: "Phone Number",
    },
    {
      name: "telegram",
      icon: <RiTelegramLine />,
      prefix: "t.me/",
    },
  ];

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
              />
              <label htmlFor="cover-upload">
                <RiUpload2Line />
                <span>Upload Cover Image</span>
              </label>
            </div>

            <div className="logo-upload">
              <input
                type="file"
                onChange={(e) => handleFileChange(e, "logo")}
                accept="image/*"
                id="logo-upload"
              />
              <label htmlFor="logo-upload">
                {logoPreview ? (
                  <img src={logoPreview} alt="logo preview" />
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
            <input
              type="text"
              placeholder="Brand Name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />

            <input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, username: e.target.value }))
              }
              required
            />

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

            <div className="form-section">
              <h3>Social Media</h3>
              <div className="social-links">
                {socialInputs.map((social) => (
                  <div key={social.name} className="social-input-wrapper">
                    {social.icon}
                    {social.prefix && (
                      <span className="social-prefix">{social.prefix}</span>
                    )}
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
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>Contact Information</h3>
              <div className="contact-info">
                <div className="contact-input-wrapper">
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
                <div className="contact-input-wrapper">
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
                <div className="contact-input-wrapper">
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

            <button type="submit" className="submit-button">
              {brand ? "Save Changes" : "Create Brand"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrandForm;

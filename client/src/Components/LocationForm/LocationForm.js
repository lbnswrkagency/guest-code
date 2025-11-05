import React, { useState } from "react";
import "./LocationForm.scss";
import { RiCloseLine, RiUpload2Line } from "react-icons/ri";

const LocationForm = ({ location, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState(
    location || {
      name: "",
      type: "club", // club, bar, restaurant, etc.
      description: "",
      logo: null,
      coverImage: null,
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      capacity: "",
      features: {
        hasParking: false,
        hasVIP: false,
        hasSmoking: false,
        hasOutdoor: false,
        isWheelchairAccessible: false,
      },
      contact: {
        email: "",
        phone: "",
        website: "",
      },
      openingHours: {
        monday: { open: "", close: "" },
        tuesday: { open: "", close: "" },
        wednesday: { open: "", close: "" },
        thursday: { open: "", close: "" },
        friday: { open: "", close: "" },
        saturday: { open: "", close: "" },
        sunday: { open: "", close: "" },
      },
    }
  );

  const [logoPreview, setLogoPreview] = useState(location?.logo || null);
  const [coverPreview, setCoverPreview] = useState(
    location?.coverImage || null
  );

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

  const venueTypes = [
    { value: "club", label: "Club" },
    { value: "bar", label: "Bar" },
    { value: "restaurant", label: "Restaurant" },
    { value: "lounge", label: "Lounge" },
    { value: "concert_hall", label: "Concert Hall" },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="location-form-overlay">
      <div className="location-form">
        <button className="close-button" onClick={onClose}>
          <RiCloseLine />
        </button>

        <h2>{location ? "Edit Venue" : "Create New Venue"}</h2>

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
              placeholder="Venue Name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />

            <select
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, type: e.target.value }))
              }
              required
            >
              <option value="">Select Venue Type</option>
              {venueTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

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
              <h3>Address</h3>
              <input
                type="text"
                placeholder="Street"
                value={formData.address.street}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, street: e.target.value },
                  }))
                }
              />
              <input
                type="text"
                placeholder="City"
                value={formData.address.city}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: e.target.value },
                  }))
                }
              />
              {/* Add other address fields similarly */}
            </div>

            <div className="form-section">
              <h3>Features</h3>
              <div className="features-grid">
                {Object.entries(formData.features).map(([key, value]) => (
                  <label key={key} className="feature-checkbox">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          features: {
                            ...prev.features,
                            [key]: e.target.checked,
                          },
                        }))
                      }
                    />
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (str) => str.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-section">
              <h3>Contact Information</h3>
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
              <input
                type="url"
                placeholder="Website"
                value={formData.contact.website}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, website: e.target.value },
                  }))
                }
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-button">
                {location ? "Save Changes" : "Create Venue"}
              </button>
              {location && (
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => onDelete(location._id)}
                >
                  Delete Venue
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LocationForm;

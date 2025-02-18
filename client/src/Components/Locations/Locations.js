import React, { useState, useEffect, useContext } from "react";
import "./Locations.scss";
import { RiAddCircleLine } from "react-icons/ri";
import LocationForm from "../LocationForm/LocationForm";
import Navigation from "../Navigation/Navigation";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";
import axios from "axios";
import { useToast } from "../Toast/ToastContext";

const Locations = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const loadingToastId = toast.showLoading("Loading locations...");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/locations`,
        {
          withCredentials: true,
        }
      );
      setLocations(response.data);
      setLoading(false);
      toast.removeToast(loadingToastId);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.showError("Failed to load locations");
      setLoading(false);
    }
  };

  const handleLocationClick = (location) => {
    setSelectedLocation(location);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedLocation(null);
  };

  const handleSave = async (locationData) => {
    try {
      const loadingToastId = toast.showLoading(
        selectedLocation ? "Updating location..." : "Creating location..."
      );

      const config = {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (selectedLocation) {
        await axios.put(
          `${process.env.REACT_APP_API_BASE_URL}/locations/${selectedLocation._id}`,
          locationData,
          config
        );
        toast.showSuccess("Location updated successfully!");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/locations`,
          locationData,
          config
        );
        toast.showSuccess("Location created successfully!");
      }

      toast.removeToast(loadingToastId);
      fetchLocations();
      handleClose();
    } catch (error) {
      console.error("Error saving location:", error);
      toast.showError(
        selectedLocation
          ? "Failed to update location"
          : "Failed to create location"
      );
    }
  };

  const handleDelete = async (locationId) => {
    if (window.confirm("Are you sure you want to delete this location?")) {
      try {
        const loadingToastId = toast.showLoading("Deleting location...");
        await axios.delete(
          `${process.env.REACT_APP_API_BASE_URL}/locations/${locationId}`,
          {
            withCredentials: true,
          }
        );
        toast.removeToast(loadingToastId);
        toast.showSuccess("Location deleted successfully!");
        fetchLocations();
      } catch (error) {
        console.error("Error deleting location:", error);
        toast.showError("Failed to delete location");
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

      <div className="locations">
        <div className="locations-header">
          <h1>Your Venues</h1>
          <p>Create and manage your venues</p>
        </div>

        <div className="locations-grid">
          {locations.map((location) => (
            <div
              key={location._id}
              className="location-card"
              onClick={() => handleLocationClick(location)}
            >
              <div className="location-card-header">
                {location.coverImage && (
                  <img
                    src={location.coverImage}
                    alt="cover"
                    className="location-cover-image"
                  />
                )}
              </div>
              <div className="location-card-content">
                {location.logo && (
                  <img
                    src={location.logo}
                    alt="logo"
                    className="location-logo"
                  />
                )}
                <h3>{location.name}</h3>
                <p>{location.type}</p>
                <div className="location-details">
                  <span>{location.capacity} capacity</span>
                  <span>{location.city}</span>
                </div>
              </div>
            </div>
          ))}

          <div
            className="location-card add-card"
            onClick={() => setShowForm(true)}
          >
            <RiAddCircleLine className="add-icon" />
            <p>Add New Venue</p>
          </div>
        </div>

        {showForm && (
          <LocationForm
            location={selectedLocation}
            onClose={handleClose}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
};

export default Locations;

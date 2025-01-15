import React, { useState, useEffect, useContext } from "react";
import "./Brands.scss";
import { RiAddCircleLine } from "react-icons/ri";
import BrandForm from "../BrandForm/BrandForm";
import Navigation from "../Navigation/Navigation";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
import AuthContext from "../../contexts/AuthContext";

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
      toast.loading("Loading brands...");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/brands`,
        {
          withCredentials: true,
        }
      );
      setBrands(response.data);
      setLoading(false);
      toast.remove();
    } catch (error) {
      console.error("Error fetching brands:", error);
      toast.error("Failed to load brands");
      setLoading(false);
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

      const config = {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (selectedBrand) {
        await axios.put(
          `${process.env.REACT_APP_API_BASE_URL}/brands/${selectedBrand._id}`,
          brandData,
          config
        );
        toast.success("Brand updated successfully!");
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/brands`,
          brandData,
          config
        );
        toast.success("Brand created successfully!");
      }

      fetchBrands();
      handleClose();
    } catch (error) {
      console.error("Error saving brand:", error);
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
        console.error("Error deleting brand:", error);
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
          {brands.map((brand) => (
            <div
              key={brand._id}
              className="brand-card"
              onClick={() => handleBrandClick(brand)}
            >
              <div className="brand-card-header">
                {brand.coverImage && (
                  <img
                    src={brand.coverImage}
                    alt="cover"
                    className="brand-cover-image"
                  />
                )}
              </div>
              <div className="brand-card-content">
                {brand.logo && (
                  <img src={brand.logo} alt="logo" className="brand-logo" />
                )}
                <h3>{brand.name}</h3>
                <p>{brand.description}</p>
              </div>
            </div>
          ))}

          <div
            className="brand-card add-card"
            onClick={() => setShowForm(true)}
          >
            <RiAddCircleLine className="add-icon" />
            <p>Create New Brand</p>
          </div>
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

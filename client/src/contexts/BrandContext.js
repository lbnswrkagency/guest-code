import React, { createContext, useContext, useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import axiosInstance from "../utils/axiosConfig";
import {
  setBrands,
  setLoading,
  setError,
  clearBrands,
  setSelectedBrand,
} from "../redux/brandSlice";
import { useAuth } from "./AuthContext";

const BrandContext = createContext();

export const useBrands = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error("useBrands must be used within a BrandProvider");
  }
  return context;
};

export const BrandProvider = ({ children }) => {
  const [loading, setLocalLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { user, authInitialized } = useAuth();
  const dispatch = useDispatch();

  // Fetch all brands that the user belongs to
  const fetchUserBrands = async () => {
    if (!user) return [];

    try {
      setLocalLoading(true);
      dispatch(setLoading());

      const response = await axiosInstance.get("/brands");

      if (response.data) {
        dispatch(setBrands(response.data));
        return response.data;
      }

      return [];
    } catch (error) {
      console.error("Error fetching brands:", error);
      dispatch(setError(error.message || "Failed to fetch brands"));
      return [];
    } finally {
      setLocalLoading(false);
      setInitialized(true);
    }
  };

  // Fetch a single brand by ID
  const fetchBrandById = async (brandId) => {
    if (!brandId) return null;

    try {
      setLocalLoading(true);

      const response = await axiosInstance.get(`/brands/${brandId}`);

      if (response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching brand ${brandId}:`, error);
      return null;
    } finally {
      setLocalLoading(false);
    }
  };

  // Fetch a brand by username
  const fetchBrandByUsername = async (username) => {
    if (!username) return null;

    try {
      setLocalLoading(true);

      const response = await axiosInstance.get(
        `/brands/profile/username/${username}`
      );

      if (response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching brand by username ${username}:`, error);
      return null;
    } finally {
      setLocalLoading(false);
    }
  };

  // Select a brand (both locally and in Redux)
  const selectBrand = (brand) => {
    dispatch(setSelectedBrand(brand));
  };

  // Initialize and fetch brands when auth is initialized
  useEffect(() => {
    if (authInitialized && user) {
      fetchUserBrands();
    } else if (authInitialized && !user) {
      dispatch(clearBrands());
      setInitialized(true);
    }
  }, [authInitialized, user, dispatch]);

  // Handle when user logs out - clear brands
  useEffect(() => {
    if (authInitialized && !user) {
      dispatch(clearBrands());
    }
  }, [user, authInitialized, dispatch]);

  const value = {
    loading,
    initialized,
    fetchUserBrands,
    fetchBrandById,
    fetchBrandByUsername,
    selectBrand,
  };

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
};

export default BrandContext;

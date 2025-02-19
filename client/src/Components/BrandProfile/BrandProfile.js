import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./BrandProfile.scss";
import Navigation from "../Navigation/Navigation";
import BrandProfileHeader from "./BrandProfileHeader";
import BrandProfileFeed from "./BrandProfileFeed";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../Components/Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import {
  RiUserAddLine,
  RiUserFollowLine,
  RiShareLine,
  RiMoreLine,
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
  RiStarLine,
  RiStarFill,
} from "react-icons/ri";
import SocialLinks from "./SocialLinks";

const BrandProfile = () => {
  console.log("[BrandProfile] Component initialization:", {
    params: useParams(),
    location: useLocation(),
    isAuthenticated: !!useAuth().user,
    timestamp: new Date().toISOString(),
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { brandUsername } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [joinStatus, setJoinStatus] = useState(null);

  const cleanUsername = brandUsername?.replace("@", "");

  useEffect(() => {
    console.log("[BrandProfile] Profile data dependencies changed:", {
      brandUsername,
      cleanUsername,
      isAuthenticated: !!user,
      currentUser: user?.username,
      pathname: location.pathname,
      timestamp: new Date().toISOString(),
    });

    if (cleanUsername) {
      fetchBrand();
    }
  }, [cleanUsername, user]);

  const fetchBrand = async () => {
    console.log("[BrandProfile] Fetching brand data:", {
      brandUsername,
      cleanUsername,
      isAuthenticated: !!user,
      currentUser: user?.username,
      timestamp: new Date().toISOString(),
    });

    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/brands/profile/username/${cleanUsername}`
      );

      console.log("[BrandProfile] Brand data fetched:", {
        brandId: response.data._id,
        brandUsername: response.data.username,
        isOwner: user?._id === response.data.owner,
        userStatus: response.data.userStatus,
        timestamp: new Date().toISOString(),
      });

      setBrand(response.data);
      if (user) {
        setIsFollowing(response.data.userStatus?.isFollowing || false);
        setIsMember(response.data.userStatus?.isMember || false);
        setIsFavorited(response.data.userStatus?.isFavorited || false);
      }
    } catch (error) {
      console.error("[BrandProfile] Error fetching brand:", {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        timestamp: new Date().toISOString(),
      });

      toast.showError("Failed to load brand profile");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleFollow = async () => {
    if (!user) {
      console.log("[BrandProfile:handleFollow] No user logged in");
      toast.showError("Please log in to follow brands");
      return;
    }

    console.log(
      "[BrandProfile:handleFollow] Starting follow/unfollow action:",
      {
        isCurrentlyFollowing: isFollowing,
        brandId: brand._id,
        userId: user._id,
        currentFollowers: brand.followers,
        timestamp: new Date().toISOString(),
      }
    );

    try {
      const endpoint = isFollowing ? "unfollow" : "follow";
      console.log(
        `[BrandProfile:handleFollow] Making ${endpoint} request to:`,
        {
          url: `/brands/${brand._id}/${endpoint}`,
          method: "POST",
        }
      );

      const response = await axiosInstance.post(
        `/brands/${brand._id}/${endpoint}`
      );

      console.log("[BrandProfile:handleFollow] Received response:", {
        status: response.status,
        data: response.data,
        followers: response.data.followers,
        userStatus: response.data.userStatus,
      });

      if (response.status === 200) {
        const newFollowingState = !isFollowing;
        console.log("[BrandProfile:handleFollow] Updating local state:", {
          oldFollowingState: isFollowing,
          newFollowingState,
          newFollowersCount: response.data.followers.length,
        });

        setIsFollowing(newFollowingState);
        toast.showSuccess(
          newFollowingState ? "Following brand" : "Unfollowed brand"
        );

        setBrand((prev) => {
          const updatedBrand = {
            ...prev,
            followers: response.data.followers,
            userStatus: {
              ...prev.userStatus,
              isFollowing: newFollowingState,
            },
          };
          console.log("[BrandProfile:handleFollow] Updated brand state:", {
            previousFollowers: prev.followers,
            newFollowers: updatedBrand.followers,
            followersCount: updatedBrand.followers.length,
          });
          return updatedBrand;
        });
      }
    } catch (error) {
      console.error("[BrandProfile:handleFollow] Error:", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        isFollowing,
        brandId: brand._id,
        userId: user._id,
      });

      if (error.response?.status === 400) {
        console.log(
          "[BrandProfile:handleFollow] Refreshing brand data due to error"
        );
        await fetchBrand();
        toast.showError(
          error.response.data.message || "Failed to update follow status"
        );
      } else {
        toast.showError("Failed to update follow status");
      }
    }
  };

  const handleJoinRequest = async () => {
    if (!user) {
      toast.showError("Please log in to join brands");
      return;
    }

    try {
      // Optimistically update UI
      setJoinRequestStatus("pending");

      const response = await axiosInstance.post(`/brands/${brand._id}/join`);

      if (response.data.status === "joined") {
        setIsMember(true);
        setJoinRequestStatus(null);
        toast.showSuccess("Joined brand");
      } else if (response.data.status === "pending") {
        setJoinRequestStatus("pending");
        toast.showSuccess("Join request sent");
      }

      // Refresh brand data
      await fetchBrand();
    } catch (error) {
      // Revert optimistic update on error
      setJoinRequestStatus(null);

      if (error.response?.status === 400 && error.response.data?.message) {
        toast.showError(error.response.data.message);
      } else {
        console.error("Error sending join request:", error);
        toast.showError("Failed to send join request");
      }
    }
  };

  const handleJoinResponse = async (requestId, status) => {
    try {
      const response = await axiosInstance.post(
        `/brands/join-requests/${requestId}/process`,
        {
          action: status,
        }
      );

      if (response.status === 200) {
        toast.showSuccess(
          `Join request ${status === "accepted" ? "accepted" : "rejected"}`
        );

        // Refresh brand data
        await fetchBrand();
      }
    } catch (error) {
      console.error("Error processing join request:", error);
      toast.showError("Failed to process join request");
    }
  };

  // Add useEffect to persist join status
  useEffect(() => {
    if (brand?.userStatus?.joinStatus) {
      setJoinRequestStatus(brand.userStatus.joinStatus);
    }
  }, [brand?.userStatus?.joinStatus]);

  const handleFavorite = async () => {
    if (!user) {
      toast.showError("Please log in to favorite brands");
      return;
    }

    try {
      const endpoint = isFavorited ? "unfavorite" : "favorite";

      // Optimistically update UI
      setIsFavorited(!isFavorited);
      setBrand((prev) => ({
        ...prev,
        favorites: isFavorited
          ? prev.favorites.filter((id) => id !== user._id)
          : [...prev.favorites, user._id],
      }));

      const response = await axiosInstance.post(
        `/brands/${brand._id}/${endpoint}`
      );

      if (response.status === 200) {
        toast.showSuccess(
          isFavorited ? "Removed from favorites" : "Added to favorites"
        );
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsFavorited(!isFavorited);
      setBrand((prev) => ({
        ...prev,
        favorites: isFavorited
          ? [...prev.favorites, user._id]
          : prev.favorites.filter((id) => id !== user._id),
      }));

      console.error("Error favoriting brand:", error);
      toast.showError("Failed to update favorite status");
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: brand.name,
          text: brand.description,
          url: url,
        })
        .catch(console.error);
    } else {
      navigator.clipboard
        .writeText(url)
        .then(() => toast.showSuccess("Profile link copied to clipboard!"))
        .catch(() => toast.showError("Failed to copy link"));
    }
  };

  const getSocialIcon = (platform) => {
    const icons = {
      instagram: RiInstagramLine,
      tiktok: RiTiktokLine,
      facebook: RiFacebookBoxLine,
      twitter: RiTwitterXLine,
      youtube: RiYoutubeLine,
      spotify: RiSpotifyLine,
      soundcloud: RiSoundcloudLine,
      linkedin: RiLinkedinBoxLine,
      website: RiGlobalLine,
      whatsapp: RiWhatsappLine,
      telegram: RiTelegramLine,
    };
    return icons[platform];
  };

  const renderActions = () => {
    if (!user) {
      return (
        <div className="brand-actions">
          <motion.button
            className="action-button login"
            onClick={() => navigate("/login")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RiUserAddLine />
            Login to interact
          </motion.button>
        </div>
      );
    }

    return (
      <div className="brand-actions">
        <motion.button
          className={`action-button ${isFollowing ? "active" : ""}`}
          onClick={handleFollow}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isFollowing ? <RiUserFollowLine /> : <RiUserAddLine />}
          {isFollowing ? "Following" : "Follow"}
        </motion.button>
        <motion.button
          className={`action-button ${isMember ? "active" : ""} ${
            joinRequestStatus === "pending" ? "pending" : ""
          }`}
          onClick={handleJoinRequest}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={joinRequestStatus === "pending"}
        >
          <RiUserAddLine />
          {isMember
            ? "Member"
            : joinRequestStatus === "pending"
            ? "Pending"
            : "Join"}
        </motion.button>
        <motion.button
          className={`action-button ${isFavorited ? "active" : ""}`}
          onClick={handleFavorite}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isFavorited ? <RiStarFill /> : <RiStarLine />}
        </motion.button>
        <motion.button
          className="action-button"
          onClick={handleShare}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RiShareLine />
        </motion.button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navigation onBack={handleBack} />
        <div className="brand-profile loading">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="loading-content"
          >
            Loading brand profile...
          </motion.div>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="page-wrapper">
        <Navigation onBack={handleBack} />
        <div className="brand-profile error">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="error-content"
          >
            Brand not found
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navigation onBack={handleBack} />

      <div className="brand-profile">
        <div className="brand-header">
          <div className="brand-cover">
            {brand.coverImage ? (
              <img
                src={brand.coverImage.full}
                alt={brand.name}
                className="cover-image"
              />
            ) : (
              <div className="cover-placeholder" />
            )}
          </div>

          <div className="brand-info">
            <div className="brand-logo">
              {brand.logo ? (
                <img src={brand.logo.thumbnail} alt={brand.name} />
              ) : (
                <div className="logo-placeholder">
                  {brand.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="brand-details">
              <h1>{brand.name}</h1>
              <span className="username">@{brand.username}</span>
            </div>

            {renderActions()}
          </div>

          <div className="brand-stats">
            <div className="stat-item">
              <span className="stat-value">{brand.team?.length || 0}</span>
              <span className="stat-label">Members</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{brand.followers?.length || 0}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{brand.events?.length || 0}</span>
              <span className="stat-label">Events</span>
            </div>
          </div>

          {brand.social &&
            Object.keys(brand.social).some((key) => brand.social[key]) && (
              <SocialLinks social={brand.social} />
            )}
        </div>

        <BrandProfileFeed brand={brand} />
      </div>
    </div>
  );
};

export default BrandProfile;

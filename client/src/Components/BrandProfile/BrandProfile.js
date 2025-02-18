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
  console.log("[BrandProfile] Component initialization starting", {
    timestamp: new Date().toISOString(),
  });

  const navigate = useNavigate();
  const location = useLocation();
  const { brandUsername, username } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null);
  const [showActions, setShowActions] = useState(false);

  console.log("[BrandProfile] Route and auth state:", {
    params: {
      brandUsername,
      username,
    },
    location: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    },
    user: user
      ? {
          id: user._id,
          username: user.username,
        }
      : null,
    timestamp: new Date().toISOString(),
  });

  const cleanUsername = brandUsername?.replace("@", "");

  console.log("[BrandProfile] Processed username:", {
    original: brandUsername,
    cleaned: cleanUsername,
    timestamp: new Date().toISOString(),
  });

  const fetchBrand = async () => {
    console.log("[BrandProfile] Attempting to fetch brand:", {
      cleanUsername,
      originalUsername: brandUsername,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/brands/profile/username/${cleanUsername}`
      );

      console.log("[BrandProfile] Fetched brand data:", {
        username: cleanUsername,
        userStatus: response.data.userStatus,
        userId: user?._id,
        isPublicView: !user,
        brandData: {
          id: response.data._id,
          name: response.data.name,
          username: response.data.username,
        },
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
        cleanUsername,
        pathname: window.location.pathname,
      });

      if (error.response?.status === 401 && user) {
        toast.showError("Session expired. Please log in again.");
        navigate("/login");
      } else {
        toast.showError("Failed to load brand profile");
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("[BrandProfile] useEffect triggered:", {
      cleanUsername,
      hasUser: !!user,
      timestamp: new Date().toISOString(),
    });

    if (cleanUsername) {
      fetchBrand();
    }
  }, [cleanUsername, user]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleFollow = async () => {
    if (!user) {
      toast.showError("Please log in to follow brands");
      return;
    }

    try {
      const endpoint = isFollowing ? "unfollow" : "follow";
      const response = await axiosInstance.post(
        `/brands/${brand._id}/${endpoint}`
      );

      if (response.status === 200) {
        setIsFollowing(!isFollowing);
        toast.showSuccess(isFollowing ? "Unfollowed brand" : "Following brand");

        setBrand((prev) => ({
          ...prev,
          followers: isFollowing
            ? prev.followers.filter((id) => id !== user._id)
            : [...prev.followers, user._id],
        }));
      }
    } catch (error) {
      console.error("Error following brand:", error);

      if (error.response?.status === 400) {
        if (isFollowing) {
          toast.showError("You are not following this brand");
        } else {
          toast.showError("You are already following this brand");
        }
        const response = await axiosInstance.get(
          `/brands/profile/${brand._id}`
        );
        setIsFollowing(response.data.userStatus?.isFollowing || false);
      } else {
        toast.showError("Failed to update follow status");
      }
    }
  };

  const handleJoin = async () => {
    if (!user) {
      toast.showError("Please log in to join brands");
      return;
    }

    try {
      if (isMember) {
        await axiosInstance.post(`/brands/${brand._id}/leave`);
        setIsMember(false);
        setJoinRequestStatus(null);
        toast.showSuccess("Left brand");
      } else {
        const response = await axiosInstance.post(`/brands/${brand._id}/join`);
        if (response.data.status === "joined") {
          setIsMember(true);
          setJoinRequestStatus(null);
          toast.showSuccess("Joined brand");
        } else if (response.data.status === "pending") {
          setJoinRequestStatus("pending");
          toast.showSuccess("Join request sent");
        }
      }
    } catch (error) {
      console.error("Error joining brand:", error);
      toast.showError("Failed to update membership status");
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.showError("Please log in to favorite brands");
      return;
    }

    try {
      const endpoint = isFavorited ? "unfavorite" : "favorite";
      const response = await axiosInstance.post(
        `/brands/${brand._id}/${endpoint}`
      );

      if (response.status === 200) {
        setIsFavorited(!isFavorited);
        toast.showSuccess(
          isFavorited ? "Removed from favorites" : "Added to favorites"
        );

        setBrand((prev) => ({
          ...prev,
          favorites: isFavorited
            ? prev.favorites.filter((id) => id !== user._id)
            : [...prev.favorites, user._id],
        }));
      }
    } catch (error) {
      console.error("Error favoriting brand:", error);

      if (error.response?.status === 400) {
        if (isFavorited) {
          toast.showError("You haven't favorited this brand");
        } else {
          toast.showError("You've already favorited this brand");
        }
        const response = await axiosInstance.get(
          `/brands/profile/${brand._id}`
        );
        setIsFavorited(response.data.userStatus?.isFavorited || false);
      } else {
        toast.showError("Failed to update favorite status");
      }
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
          onClick={handleJoin}
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

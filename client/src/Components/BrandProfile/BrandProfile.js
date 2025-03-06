import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./BrandProfile.scss";
import Navigation from "../Navigation/Navigation";
import DashboardNavigation from "../DashboardNavigation/DashboardNavigation";
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
import ConfirmDialog from "../../Components/ConfirmDialog/ConfirmDialog";

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
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [joinStatus, setJoinStatus] = useState(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showCancelJoinConfirm, setShowCancelJoinConfirm] = useState(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [userStatus, setUserStatus] = useState({
    isFollowing: false,
    isMember: false,
    isFavorited: false,
    joinRequestStatus: null,
  });
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);

  // Clean username for API calls - handle both param and direct path extraction
  let cleanUsername;
  if (brandUsername) {
    // Normal route param
    cleanUsername = brandUsername.replace(/^@/, "");
  } else if (location.pathname.startsWith("/@")) {
    // Direct path matching
    // Extract only the username part, not including any date slug
    const pathParts = location.pathname.substring(2).split("/");
    cleanUsername = pathParts[0]; // Take only the first part after /@
  }

  // Enhanced logging for debugging
  console.log("[BrandProfile] Detailed params:", {
    brandUsername,
    cleanUsername,
    rawParams: useParams(),
    pathname: location.pathname,
    pathParts: location.pathname.substring(2).split("/"),
    isExactMatch: location.pathname === `/@${cleanUsername}`,
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    console.log("[BrandProfile] useEffect triggered with:", {
      cleanUsername,
      user: !!user,
      timestamp: new Date().toISOString(),
    });

    if (cleanUsername) {
      fetchBrand();
    } else {
      console.error("[BrandProfile] No username found in params or path");
      toast.showError("Invalid brand profile");
      navigate("/");
    }
  }, [cleanUsername, user]);

  useEffect(() => {
    if (brand?.userStatus) {
      setIsFollowing(brand.userStatus.isFollowing || false);
      setIsMember(brand.userStatus.isMember || false);
      setIsFavorited(brand.userStatus.isFavorited || false);
      setJoinRequestStatus(brand.userStatus.joinRequestStatus || null);
    }
  }, [brand?.userStatus]);

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

      // Log the exact API endpoint being called
      const apiEndpoint = `/brands/profile/username/${cleanUsername}`;
      console.log(`[BrandProfile] Calling API endpoint: ${apiEndpoint}`);

      const response = await axiosInstance.get(apiEndpoint);

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

      // Only redirect to home if it's not a 404 error
      if (error.response?.status === 404) {
        toast.showError(`Brand "${cleanUsername}" not found`);
        // Stay on the page but show a not found message
        setBrand(null);
        setLoading(false);
      } else {
        toast.showError("Failed to load brand profile");
        navigate("/");
      }
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

  const getJoinButtonText = () => {
    if (isMember) return "Member";
    if (joinRequestStatus === "pending") return "Pending";
    if (joinRequestStatus === "accepted") return "Accepted";
    if (joinRequestStatus === "rejected") return "Rejected";
    return "Join";
  };

  const getJoinButtonClass = () => {
    if (isMember) return "active";
    if (joinRequestStatus === "pending") return "pending";
    if (joinRequestStatus === "accepted") return "accepted";
    if (joinRequestStatus === "rejected") return "rejected";
    return "";
  };

  const handleCancelJoinRequest = async () => {
    try {
      const response = await axiosInstance.post(
        `/brands/${brand._id}/cancel-join`
      );

      if (response.data.status === "cancelled") {
        setJoinRequestStatus(null);
        toast.showSuccess("Join request cancelled");
        await fetchBrand();
      }
    } catch (error) {
      console.error("Error cancelling join request:", error);
      toast.showError(
        error.response?.data?.message || "Failed to cancel join request"
      );
    }
    setShowCancelJoinConfirm(false);
  };

  const handleJoinRequest = async () => {
    if (!user) {
      toast.showError("Please log in to join brands");
      return;
    }

    // If already a member, handle leaving
    if (isMember) {
      setShowLeaveConfirm(true);
      return;
    }

    // If pending, show cancel confirmation
    if (joinRequestStatus === "pending") {
      setShowCancelJoinConfirm(true);
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

  const handleLeaveBrand = async () => {
    if (!user) {
      toast.showError("Please log in to leave brands");
      return;
    }

    try {
      const response = await axiosInstance.post(`/brands/${brand._id}/leave`);

      if (response.status === 200) {
        setIsMember(false);
        toast.showSuccess("Successfully left brand");

        // Refresh brand data
        await fetchBrand();
      }
    } catch (error) {
      console.error("Error leaving brand:", error);
      toast.showError("Failed to leave brand");
    }
  };

  const renderActions = () => {
    if (!user) {
      return (
        <div className="brand-actions">
          {/* Only show the share button for public view */}
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
          className={`action-button ${getJoinButtonClass()}`}
          onClick={handleJoinRequest}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RiUserAddLine />
          {getJoinButtonText()}
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

  // Add effect to log navigation state changes
  useEffect(() => {
    console.log("[BrandProfile] DashboardNavigation isOpen:", isNavigationOpen);
  }, [isNavigationOpen]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navigation
          onBack={handleBack}
          onMenuClick={() => setIsNavigationOpen(true)}
        />
        <div className="brand-profile loading">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="page-wrapper">
        <Navigation
          onBack={handleBack}
          onMenuClick={() => setIsNavigationOpen(true)}
        />
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
      <Navigation
        onBack={handleBack}
        onMenuClick={() => setIsNavigationOpen(true)}
      />
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

          {/* Lineup Section */}
          {brand.lineups && brand.lineups.length > 0 && (
            <div className="brand-lineups">
              <h3 className="section-title">Lineup</h3>
              <div className="lineup-container">
                {/* Group lineups by category */}
                {Object.entries(
                  brand.lineups.reduce((groups, artist) => {
                    const category = artist.category || "Other";
                    if (!groups[category]) {
                      groups[category] = [];
                    }
                    groups[category].push(artist);
                    return groups;
                  }, {})
                ).map(([category, artists]) => (
                  <div key={category} className="lineup-category-group">
                    <h4 className="category-title">{category}</h4>
                    <div className="lineup-artists">
                      {artists.map((artist, index) => (
                        <div key={artist._id || index} className="artist">
                          <div className="artist-avatar">
                            {artist.avatar && artist.avatar.thumbnail ? (
                              <img
                                src={artist.avatar.thumbnail}
                                alt={artist.name}
                              />
                            ) : (
                              <div className="artist-avatar placeholder">
                                {artist.name
                                  ? artist.name.charAt(0).toUpperCase()
                                  : "?"}
                              </div>
                            )}
                          </div>
                          <div className="artist-info">
                            <span className="artist-name">{artist.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Log brand data before passing to BrandProfileFeed */}
        {console.log(
          "[BrandProfile] Brand data being passed to BrandProfileFeed:",
          {
            id: brand._id,
            username: brand.username,
            name: brand.name,
            hasEvents: Array.isArray(brand.events),
            eventCount: Array.isArray(brand.events) ? brand.events.length : 0,
            timestamp: new Date().toISOString(),
          }
        )}

        <BrandProfileFeed brand={brand} />
      </div>

      <AnimatePresence mode="wait">
        {showLeaveConfirm && (
          <motion.div
            className="delete-confirmation-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
          >
            <motion.div
              className="delete-confirmation"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#151515",
                borderRadius: "12px",
                padding: "1.5rem",
                width: "90%",
                maxWidth: "400px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <h3>Leave Brand</h3>
              <p>
                Are you sure you want to leave this brand? You'll need to
                request to join again if you want to become a member in the
                future.
              </p>
              <div className="confirmation-actions">
                <motion.button
                  className="cancel-btn"
                  onClick={() => setShowLeaveConfirm(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="confirm-delete-btn"
                  onClick={() => {
                    handleLeaveBrand();
                    setShowLeaveConfirm(false);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Leave
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCancelJoinConfirm && (
          <ConfirmDialog
            title="Cancel Join Request"
            message="Are you sure you want to cancel your join request?"
            confirmText="Cancel Request"
            type="danger"
            onConfirm={handleCancelJoinRequest}
            onCancel={() => setShowCancelJoinConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Only render DashboardNavigation for authenticated users */}
      {user && (
        <DashboardNavigation
          isOpen={isNavigationOpen}
          onClose={() => setIsNavigationOpen(false)}
          currentUser={user}
          setUser={setUser}
        />
      )}
    </div>
  );
};

export default BrandProfile;

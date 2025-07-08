import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  RiTicketLine,
  RiVipCrownLine,
  RiTableLine,
  RiArrowRightSLine,
} from "react-icons/ri";
import SocialLinks from "./SocialLinks";
import ConfirmDialog from "../../Components/ConfirmDialog/ConfirmDialog";

const BrandProfile = () => {
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
  const [userStatus, setUserStatus] = useState({
    isFollowing: false,
    isMember: false,
    isFavorited: false,
    joinRequestStatus: null,
  });
  const [joinRequests, setJoinRequests] = useState([]);
  const [loadingJoinRequests, setLoadingJoinRequests] = useState(false);

  // State for current event and action buttons
  const [currentEvent, setCurrentEvent] = useState(null);
  const [ticketSettings, setTicketSettings] = useState([]);
  const [codeSettings, setCodeSettings] = useState([]);
  const [loadingEventData, setLoadingEventData] = useState(false);

  // Filter ticket settings to only include visible ones (same as UpcomingEvent)
  const visibleTicketSettings = useMemo(() => {
    // Ensure ticketSettings exists and is an array before filtering
    if (!Array.isArray(ticketSettings)) {
      return [];
    }
    // Filter out tickets where isVisible is explicitly false
    return ticketSettings.filter((ticket) => ticket.isVisible !== false);
  }, [ticketSettings]);

  // State for sticky action buttons
  const [isActionButtonsSticky, setIsActionButtonsSticky] = useState(false);
  const actionButtonsRef = useRef(null);
  const actionButtonsStickyPosRef = useRef(null);

  // Clean username for API calls - handle both param and direct path extraction
  let cleanUsername;

  // For nested paths like /@hendricks/@whitechocolate, we want the last username
  if (location.pathname.includes("/@")) {
    // Find the last occurrence of /@
    const lastAtIndex = location.pathname.lastIndexOf("/@");
    if (lastAtIndex >= 0) {
      // Extract everything after the last /@
      const lastPath = location.pathname.substring(lastAtIndex + 1);
      // Remove @ if present and get the username part (before any slashes)
      cleanUsername = lastPath.replace(/^@/, "").split("/")[0];
    }
  }

  // If we still don't have a username, try the route param
  if (!cleanUsername && brandUsername) {
    cleanUsername = brandUsername.replace(/^@/, "");
  }

  // Skip fetching if this is the user's own profile
  useEffect(() => {
    // Extract brandUsername from URL path
    const pathMatch = location.pathname.match(/\/@([^\/]+)/);
    const brandUsername = pathMatch ? pathMatch[1] : null;

    // Skip fetching if this might be the user's profile and we have a user
    if (user && brandUsername && user.username === brandUsername) {
      return; // Don't proceed with the fetch
    }

    if (cleanUsername) {
      fetchBrand();
    }
  }, [cleanUsername, user, location.pathname]); // Add user and location.pathname as dependencies

  useEffect(() => {
    if (cleanUsername) {
      fetchBrand();
    } else {
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
    try {
      setLoading(true);

      const apiEndpoint = `/brands/profile/username/${cleanUsername}`;

      const response = await axiosInstance.get(apiEndpoint);

      setBrand(response.data);
      if (user) {
        setIsFollowing(response.data.userStatus?.isFollowing || false);
        setIsMember(response.data.userStatus?.isMember || false);
        setIsFavorited(response.data.userStatus?.isFavorited || false);
      }
    } catch (error) {
      // Check for authentication error - redirect to login instead of showing toast
      if (error.response?.status === 401) {
        // Redirect to login page without showing error toast
        navigate("/login", {
          state: {
            from: location.pathname,
          },
        });
        return; // Exit early to prevent further error handling
      }

      // Handle 404 "Brand not found" error
      if (error.response?.status === 404) {
        // Redirect to login instead of showing toast
        navigate("/login");
        return;
      } else {
        toast.showError("Failed to load brand profile");
        // Don't redirect - just show error state
        setBrand(null);
        setLoading(false);
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
      toast.showError("Please log in to follow brands");
      return;
    }

    try {
      const endpoint = isFollowing ? "unfollow" : "follow";

      const response = await axiosInstance.post(
        `/brands/${brand._id}/${endpoint}`
      );

      if (response.status === 200) {
        const newFollowingState = !isFollowing;

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
          return updatedBrand;
        });
      }
    } catch (error) {
      if (error.response?.status === 400) {
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
        .catch(() => toast.showError("Failed to copy link"));
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

  // Dynamically load Meta Pixel script
  useEffect(() => {
    if (brand && brand.metaPixelId) {
      // Check if a pixel script with this ID already exists
      const existingPixelScript = document.querySelector(
        `script[data-pixel-id="${brand.metaPixelId}"]`
      );
      if (existingPixelScript) {
        return;
      }

      // Remove any previously injected pixel scripts (if navigating between brands)
      const previousPixelScripts = document.querySelectorAll(
        "script[data-pixel-id]"
      );
      if (previousPixelScripts.length > 0) {
        previousPixelScripts.forEach((script) => script.remove());
      }

      const script = document.createElement("script");
      script.innerHTML = `
        !(function (f, b, e, v, n, t, s) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod
              ? n.callMethod.apply(n, arguments)
              : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = "2.0";
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(
          window,
          document,
          'script',
          'https://connect.facebook.net/en_US/fbevents.js'
        );
        fbq('init', '${brand.metaPixelId}');
        fbq('track', 'PageView');
      `;
      // Add a data attribute to identify the script
      script.setAttribute("data-pixel-id", brand.metaPixelId);
      document.head.appendChild(script);

      // Optional: Cleanup function to remove the script when the component unmounts
      // or when the brand changes and a new pixel needs to be loaded.
      return () => {
        const currentPixelScript = document.querySelector(
          `script[data-pixel-id="${brand?.metaPixelId}"]`
        );
        if (currentPixelScript) {
          currentPixelScript.remove();
        }
      };
    }
  }, [brand?.metaPixelId]);

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
      toast.showError("Failed to leave brand");
    }
  };

  // Add ticket settings cache (same as UpcomingEvent)
  const [ticketSettingsCache, setTicketSettingsCache] = useState({});

  // Fetch ticket settings function (same logic as UpcomingEvent)
  const fetchTicketSettings = useCallback(
    async (eventId, currentEvent) => {
      if (!eventId) {
        return [];
      }

      try {
        // Check if we already have this event's ticket settings in cache
        if (ticketSettingsCache[eventId]) {
          return ticketSettingsCache[eventId];
        }

        // Try the event profile endpoint which has optional authentication
        const endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${eventId}`;
        const response = await axiosInstance.get(endpoint);

        let ticketSettings = [];

        if (
          response.data &&
          response.data.ticketSettings &&
          response.data.ticketSettings.length > 0
        ) {
          ticketSettings = response.data.ticketSettings;
        } else {
          // If this is a child event (has parentEventId) and no ticket settings were found,
          // try to get ticket settings from the parent event
          if (currentEvent?.parentEventId) {
            // Check if parent event ticket settings are in cache
            if (ticketSettingsCache[currentEvent.parentEventId]) {
              ticketSettings = ticketSettingsCache[currentEvent.parentEventId];
            } else {
              try {
                const parentEndpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${currentEvent.parentEventId}`;
                const parentResponse = await axiosInstance.get(parentEndpoint);

                if (
                  parentResponse.data &&
                  parentResponse.data.ticketSettings &&
                  parentResponse.data.ticketSettings.length > 0
                ) {
                  ticketSettings = parentResponse.data.ticketSettings;

                  // Cache the parent's ticket settings too
                  setTicketSettingsCache((prev) => ({
                    ...prev,
                    [currentEvent.parentEventId]: ticketSettings,
                  }));
                }
              } catch (parentError) {
                // Silent fail for parent event fetch
              }
            }
          }
        }

        // Cache the ticket settings for this event
        setTicketSettingsCache((prev) => ({
          ...prev,
          [eventId]: ticketSettings,
        }));

        return ticketSettings;
      } catch (error) {
        // Silent fail for ticket settings fetch
        return [];
      }
    },
    [ticketSettingsCache]
  );

  // Handler for when an event is selected from UpcomingEvent
  const handleEventChange = useCallback(
    async (event) => {
      if (!event) {
        setCurrentEvent(null);
        setTicketSettings([]);
        setCodeSettings([]);
        return;
      }

      // Initialize ticketsAvailable to true by default if not explicitly false (same as UpcomingEvent)
      const eventCopy = { ...event };
      if (eventCopy.ticketsAvailable === undefined) {
        eventCopy.ticketsAvailable = true;
      }

      setCurrentEvent(eventCopy);
      setLoadingEventData(true);

      try {
        // Use the same sophisticated ticket fetching logic as UpcomingEvent
        const fetchedTicketSettings = await fetchTicketSettings(
          event._id,
          eventCopy
        );

        // Use the same endpoint as UpcomingEvent for code settings
        const endpoint = `${process.env.REACT_APP_API_BASE_URL}/events/profile/${event._id}`;
        const response = await axiosInstance.get(endpoint);

        const codeSettings = response.data?.codeSettings || [];

        setTicketSettings(fetchedTicketSettings);
        setCodeSettings(codeSettings);

        // Data fetched successfully
      } catch (error) {
        // Silent fail - just set empty arrays
        setTicketSettings([]);
        setCodeSettings([]);
      } finally {
        setLoadingEventData(false);
      }
    },
    [fetchTicketSettings]
  );

  // Scroll handler functions for action buttons
  const scrollToTickets = useCallback((e) => {
    e.stopPropagation();
    const ticketsSection = document.querySelector(
      ".upcomingEvent-ticket-section"
    );
    if (ticketsSection) {
      ticketsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const scrollToGuestCode = useCallback((e) => {
    e.stopPropagation();
    const guestCodeSection = document.querySelector(
      ".upcomingEvent-guest-code-section"
    );
    if (guestCodeSection) {
      guestCodeSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const scrollToTableBooking = useCallback((e) => {
    e.stopPropagation();
    const tableSection = document.querySelector(
      ".upcomingEvent-table-booking-section"
    );
    if (tableSection) {
      tableSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Cache the sticky position calculation
  const [cachedStickyPos, setCachedStickyPos] = useState(0);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);

  // Throttled scroll handler for sticky action buttons
  const handleActionButtonsScroll = useCallback(() => {
    if (!actionButtonsRef.current || !actionButtonsStickyPosRef.current) return;

    const scrollY = window.scrollY || window.pageYOffset;

    // Only recalculate sticky position when necessary
    let stickyPos = cachedStickyPos;
    if (stickyPos === 0 && actionButtonsStickyPosRef.current) {
      const rect = actionButtonsStickyPosRef.current.getBoundingClientRect();
      stickyPos = rect.top + scrollY;
      setCachedStickyPos(stickyPos);
    }

    const navHeight = 56; // Navigation height
    const buffer = 20; // Increased buffer to prevent rapid state changes

    const shouldBeSticky = scrollY > stickyPos - navHeight - buffer;

    // Only update state if it actually changed and we've moved enough
    const scrollDelta = Math.abs(scrollY - lastScrollY.current);
    if (shouldBeSticky !== isActionButtonsSticky && scrollDelta > 5) {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = setTimeout(() => {
        setIsActionButtonsSticky(shouldBeSticky);
      }, 100); // Increased delay to prevent rapid changes
    }

    lastScrollY.current = scrollY;
  }, [isActionButtonsSticky, cachedStickyPos]);

  // Setup throttled scroll listener for sticky action buttons
  useEffect(() => {
    let ticking = false;

    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleActionButtonsScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", throttledScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [handleActionButtonsScroll]);

  // Recalculate sticky position when window resizes
  useEffect(() => {
    const handleResize = () => {
      setCachedStickyPos(0); // Reset cached position on resize
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderActions = () => {
    if (!user) {
      return null; // Don't render any actions for non-authenticated users
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

  // Function to check if event supports table booking
  const supportsTableBooking = useCallback((event) => {
    if (!event) return false;

    // Primary check: Does event have a table layout configured?
    if (event.tableLayout && event.tableLayout !== "") {
      return true;
    }

    // Exclude specific brand ID that should not show table bookings
    if (
      event.brand === "67d737d6e1299b18afabf4f4" ||
      (event.brand && event.brand._id === "67d737d6e1299b18afabf4f4")
    ) {
      return false;
    }

    // Legacy fallback: Check for supported brands/events
    return (
      event._id === "6807c197d4455638731dbda6" ||
      (event.brand && event.brand._id === "67ba051873bd89352d3ab6db") ||
      event.brand === "67ba051873bd89352d3ab6db"
    );
  }, []);

  // Function to render event action buttons
  const renderEventActionButtons = () => {
    if (!currentEvent || loadingEventData) return null;

    const supportsTableBookingForEvent = supportsTableBooking(currentEvent);

    // Use the EXACT SAME logic as UpcomingEvent:
    // {currentEvent && currentEvent.ticketsAvailable !== false && visibleTicketSettings.length > 0 && (...)}
    const ticketsAvailable =
      currentEvent &&
      currentEvent.ticketsAvailable !== false &&
      visibleTicketSettings.length > 0;

    // For guest code, check if it's enabled - always show it if event exists
    const showGuestCode = !!currentEvent;

    // Determine what actions to show based on event configuration

    // Only render if any action is available
    if (!supportsTableBookingForEvent && !ticketsAvailable && !showGuestCode) {
      return null;
    }

    return (
      <>
        {/* Sticky position marker */}
        <div
          ref={actionButtonsStickyPosRef}
          className="action-buttons-sticky-marker"
        ></div>

        <div
          ref={actionButtonsRef}
          className={`brand-event-actions ${
            isActionButtonsSticky ? "sticky" : ""
          }`}
        >
          {/* Tickets button */}
          {ticketsAvailable && (
            <motion.button
              className="event-action-button tickets-button"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              onClick={scrollToTickets}
            >
              <div className="button-content">
                <div className="button-icon">
                  <RiTicketLine />
                </div>
                <div className="button-text">
                  <span className="button-text-full">Tickets</span>
                  <span className="button-text-short">Tickets</span>
                  {!isActionButtonsSticky && <p>Buy tickets online</p>}
                </div>
                <div className="button-arrow">
                  <RiArrowRightSLine />
                </div>
              </div>
            </motion.button>
          )}

          {/* Guest Code button */}
          {showGuestCode && (
            <motion.button
              className="event-action-button guestcode-button"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              onClick={scrollToGuestCode}
            >
              <div className="button-content">
                <div className="button-icon">
                  <RiVipCrownLine />
                </div>
                <div className="button-text">
                  <span className="button-text-full">Guest Code</span>
                  <span className="button-text-short">Codes</span>
                  {!isActionButtonsSticky && <p>Free entry with code</p>}
                </div>
                <div className="button-arrow">
                  <RiArrowRightSLine />
                </div>
              </div>
            </motion.button>
          )}

          {/* Table booking button */}
          {supportsTableBookingForEvent && (
            <motion.button
              className="event-action-button table-button"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              onClick={scrollToTableBooking}
            >
              <div className="button-content">
                <div className="button-icon">
                  <RiTableLine />
                </div>
                <div className="button-text">
                  <span className="button-text-full">Book Table</span>
                  <span className="button-text-short">Tables</span>
                  {!isActionButtonsSticky && <p>Reserve your table now</p>}
                </div>
                <div className="button-arrow">
                  <RiArrowRightSLine />
                </div>
              </div>
            </motion.button>
          )}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navigation onBack={handleBack} />
        <div className="brand-profile loading">
          <div className="charming-loading">
            {/* Animated background elements */}
            <div className="loading-background">
              <div className="floating-orb orb-1"></div>
              <div className="floating-orb orb-2"></div>
              <div className="floating-orb orb-3"></div>
              <div className="shimmer-overlay"></div>
            </div>

            {/* Main loading content */}
            <div className="loading-content">
              {/* Logo area with pulse animation */}
              <div className="loading-logo">
                <div className="logo-container">
                  <div className="logo-ring"></div>
                  <div className="logo-center">
                    <div className="logo-placeholder">
                      {cleanUsername
                        ? cleanUsername.charAt(0).toUpperCase()
                        : "G"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Welcome text */}
              <div className="loading-text">
                <h1 className="welcome-title">
                  {cleanUsername ? `Welcome to @${cleanUsername}` : "Welcome"}
                </h1>
                <p className="loading-subtitle">
                  Preparing your exclusive experience...
                </p>
              </div>

              {/* Animated progress dots */}
              <div className="loading-dots">
                <div className="dot dot-1"></div>
                <div className="dot dot-2"></div>
                <div className="dot dot-3"></div>
                <div className="dot dot-4"></div>
                <div className="dot dot-5"></div>
              </div>

              {/* Loading bar */}
              <div className="loading-bar">
                <div className="loading-progress"></div>
              </div>
            </div>
          </div>
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
            <div>Session expired or invalid brand profile</div>
            <motion.button
              onClick={() => navigate("/login")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="login-button"
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                borderRadius: "8px",
                background: "#2196f3",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              Go to Login
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navigation onBack={handleBack} />
      <div className="brand-profile">
        <div className="brand-header brand-header--minimal">
          <div className="brand-info brand-info--minimal">
            <div className="brand-logo brand-logo--minimal">
              {brand.logo ? (
                <img src={brand.logo.thumbnail} alt={brand.name} />
              ) : (
                <div className="logo-placeholder">
                  {brand.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="brand-details brand-details--minimal">
              <h1>{brand.name}</h1>
              <span className="username">@{brand.username}</span>
            </div>

            {renderActions()}
          </div>

          {/* Event action buttons section */}
          {renderEventActionButtons()}

          {/* {user && (
            <div className="brand-stats">
              <div className="stat-item">
                <span className="stat-value">{brand.team?.length || 0}</span>
                <span className="stat-label">
                  {(brand.team?.length || 0) === 1 ? "Member" : "Members"}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {brand.followers?.length || 0}
                </span>
                <span className="stat-label">
                  {(brand.followers?.length || 0) === 1
                    ? "Follower"
                    : "Followers"}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{brand.events?.length || 0}</span>
                <span className="stat-label">
                  {(brand.events?.length || 0) === 1 ? "Event" : "Events"}
                </span>
              </div>
            </div>
          )} */}

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

        <BrandProfileFeed brand={brand} onEventChange={handleEventChange} />
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
    </div>
  );
};

export default BrandProfile;

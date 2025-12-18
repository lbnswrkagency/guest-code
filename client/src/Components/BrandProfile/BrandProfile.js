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
  RiSwordLine,
  RiImageLine,
  RiFilmLine,
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

  // State for current event and action buttons
  const [currentEvent, setCurrentEvent] = useState(null);
  const [ticketSettings, setTicketSettings] = useState([]);
  const [codeSettings, setCodeSettings] = useState([]);

  // Brand gallery state (photos)
  const [brandHasGalleries, setBrandHasGalleries] = useState(false);
  const [checkingGalleries, setCheckingGalleries] = useState(false);

  // Brand video gallery state
  const [brandHasVideoGalleries, setBrandHasVideoGalleries] = useState(false);
  const [checkingVideoGalleries, setCheckingVideoGalleries] = useState(false);

  // More granular loading progress tracking
  const [loadingProgress, setLoadingProgress] = useState({
    brand: 0,
    events: 0,
    tickets: 0,
  });

  // Calculate total progress percentage
  const totalProgress = useMemo(() => {
    const { brand, events, tickets } = loadingProgress;
    return Math.round((brand + events + tickets) / 3);
  }, [loadingProgress]);

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
  const brandProfileRef = useRef(null);

  // Handler for when events are loaded from UpcomingEvent - memoized to prevent re-renders
  const handleEventsLoaded = useCallback((count) => {
    setLoadingProgress((prev) => ({
      ...prev,
      events: 100,
      // If no events, also mark tickets as loaded since there's nothing to load
      tickets: count === 0 ? 100 : prev.tickets,
    }));
  }, []);

  // Check if all data is loaded
  const allDataLoaded = useMemo(() => {
    return totalProgress >= 100;
  }, [totalProgress]);

  // Function to check if brand has any galleries available
  const checkBrandGalleries = useCallback(async () => {
    if (!brand?._id) {
      return;
    }

    setCheckingGalleries(true);

    try {
      const endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brand._id}/galleries/check`;
      const response = await axiosInstance.get(endpoint);

      if (response.data && response.data.success) {
        setBrandHasGalleries(response.data.hasGalleries);
      } else {
        setBrandHasGalleries(false);
      }
    } catch (error) {
      console.error("❌ [BrandProfile] Error checking brand galleries:", error);
      setBrandHasGalleries(false);
    } finally {
      setCheckingGalleries(false);
    }
  }, [brand?._id]);

  // Function to check if brand has any video galleries available
  const checkBrandVideoGalleries = useCallback(async () => {
    if (!brand?._id) {
      console.log("🎬 [BrandProfile] No brand ID for video gallery check");
      return;
    }

    console.log("🚀 [BrandProfile] Starting video gallery check for brand:", brand._id);
    try {
      setCheckingVideoGalleries(true);
      const endpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brand._id}/videos/check`;
      console.log("🔍 [BrandProfile] Making video gallery check request to:", endpoint);
      
      const response = await axiosInstance.get(endpoint);
      console.log("✅ [BrandProfile] Video gallery response:", response.data);

      if (response.data && response.data.success) {
        console.log("📹 [BrandProfile] Setting brandHasVideoGalleries to:", response.data.hasVideoGalleries);
        setBrandHasVideoGalleries(response.data.hasVideoGalleries);
      } else {
        console.log("❌ [BrandProfile] Video gallery check failed - no success in response");
        setBrandHasVideoGalleries(false);
      }
    } catch (error) {
      console.error("❌ [BrandProfile] Error checking brand video galleries:", error);
      console.log("🔄 [BrandProfile] Trying fallback video gallery check method...");
      
      // Fallback: try to fetch latest videos to check if actual videos exist
      try {
        const fallbackEndpoint = `${process.env.REACT_APP_API_BASE_URL}/dropbox/brand/${brand._id}/videos/latest`;
        console.log("🔍 [BrandProfile] Fallback endpoint:", fallbackEndpoint);
        
        const fallbackResponse = await axiosInstance.get(fallbackEndpoint);
        // Check if there are actual videos, not just gallery options
        const hasActualVideos = fallbackResponse.data?.success && 
                                fallbackResponse.data?.media?.videos?.length > 0;
        console.log("📹 [BrandProfile] Fallback result - hasVideoGalleries:", hasActualVideos);
        setBrandHasVideoGalleries(hasActualVideos);
      } catch (fallbackError) {
        console.error("❌ [BrandProfile] Fallback video check also failed:", fallbackError);
        setBrandHasVideoGalleries(false);
      }
    } finally {
      setCheckingVideoGalleries(false);
      console.log("🏁 [BrandProfile] Video gallery check completed");
    }
  }, [brand?._id]);

  // Update main loading state - show feed after brand loads to allow events to load
  useEffect(() => {
    // Show the feed once brand is loaded (so events can start loading)
    if (loadingProgress.brand === 100 && loading) {
      setLoading(false);
    }
  }, [loadingProgress.brand, loading, totalProgress]);

  // Effect to check brand galleries when brand is loaded
  useEffect(() => {
    if (brand && brand._id && !checkingGalleries) {
      checkBrandGalleries();
    }
  }, [brand, checkBrandGalleries]);

  // Effect to check brand video galleries when brand is loaded
  useEffect(() => {
    if (brand && brand._id && !checkingVideoGalleries) {
      checkBrandVideoGalleries();
    }
  }, [brand, checkBrandVideoGalleries]);

  // Real loading progress tracking - no artificial simulation
  useEffect(() => {
    if (!loading) {
      // When loading is done, ensure all progress is 100
      setLoadingProgress({ brand: 100, events: 100, tickets: 100 });
    } else {
      // When loading starts, reset progress
      setLoadingProgress({ brand: 0, events: 0, tickets: 0 });
    }
  }, [loading]);

  // Removed fallback timeout - no longer needed with simplified loading

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

  // Extract date hint from URL (DDMMYY or DDMMYYYY format) - MEMOIZED
  const initialDateHint = useMemo(() => {
    if (location.pathname.includes("/@")) {
      const pathParts = location.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];

      // Check if last part is a date format (6 or 8 digits)
      const dateRegex = /^(\d{6}|\d{8})$/;
      if (dateRegex.test(lastPart)) {
        return lastPart;
      }
    }
    return null;
  }, [location.pathname]);

  // Single useEffect to handle brand fetching - with memoized dependencies
  // Define fetchBrand first before it's used
  const fetchBrand = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingProgress({ brand: 0, events: 0, tickets: 0 });

      // Use the original endpoint for now (more reliable)
      const apiEndpoint = `/brands/profile/username/${cleanUsername}`;

      const response = await axiosInstance.get(apiEndpoint);

      setBrand(response.data);
      if (user) {
        setIsFollowing(response.data.userStatus?.isFollowing || false);
        setIsMember(response.data.userStatus?.isMember || false);
        setIsFavorited(response.data.userStatus?.isFavorited || false);
      }

      setLoadingProgress((prev) => ({ ...prev, brand: 100 }));
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
    }
  }, [cleanUsername, user, toast, navigate, location.pathname]);

  const shouldSkipFetch = useMemo(() => {
    // Never skip fetching - always load brand profile data
    // This ensures both authenticated and unauthenticated users can view brand profiles
    return false;
  }, []);

  useEffect(() => {
    if (!cleanUsername) {
      toast.showError("Invalid brand profile");
      navigate("/");
      return;
    }

    if (shouldSkipFetch) {
      return; // Don't proceed with the fetch
    }

    fetchBrand();
  }, [cleanUsername, shouldSkipFetch, fetchBrand]);

  useEffect(() => {
    if (brand?.userStatus) {
      setIsFollowing(brand.userStatus.isFollowing || false);
      setIsMember(brand.userStatus.isMember || false);
      setIsFavorited(brand.userStatus.isFavorited || false);
      setJoinRequestStatus(brand.userStatus.joinRequestStatus || null);
    }
  }, [brand?.userStatus]);

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
        setLoadingProgress((prev) => ({ ...prev, tickets: 100 }));
        return;
      }

      // Initialize ticketsAvailable to true by default if not explicitly false (same as UpcomingEvent)
      const eventCopy = { ...event };
      if (eventCopy.ticketsAvailable === undefined) {
        eventCopy.ticketsAvailable = true;
      }

      setCurrentEvent(eventCopy);

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
        setLoadingProgress((prev) => ({ ...prev, tickets: 100 }));

        // Data fetched successfully
      } catch (error) {
        // Silent fail - just set empty arrays
        setTicketSettings([]);
        setCodeSettings([]);
        setLoadingProgress((prev) => ({ ...prev, tickets: 100 }));
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

  const scrollToGallery = useCallback((e) => {
    e?.stopPropagation(); // Use optional chaining to handle cases where no event is passed
    // Scroll to the gallery section in UpcomingEvent
    const gallerySection = document.querySelector(
      ".upcomingEvent-gallery-section"
    );
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const scrollToBattleSignup = useCallback((e) => {
    e.stopPropagation();

    // First trigger the battle signup to show (similar to handleBattleSignupClick in UpcomingEvent)
    // Find and click the battle meta-tag to trigger the form visibility
    const battleMetaTag = document.querySelector(".meta-tag.battle");
    if (battleMetaTag) {
      battleMetaTag.click();
    }

    // Then scroll to the section after a short delay
    setTimeout(() => {
      const battleSection = document.querySelector(
        ".upcomingEvent-battle-signup-section"
      );
      if (battleSection) {
        battleSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }, []);

  // Cache the sticky position calculation
  const [cachedStickyPos, setCachedStickyPos] = useState(0);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);

  // Throttled scroll handler for sticky action buttons
  const handleActionButtonsScroll = useCallback(() => {
    if (
      !actionButtonsRef.current ||
      !actionButtonsStickyPosRef.current ||
      !brandProfileRef.current
    )
      return;

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

  // Function to check if event supports battles
  const supportsBattles = useCallback((event) => {
    if (!event) return false;
    return event.battleConfig && event.battleConfig.isEnabled;
  }, []);

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
    if (!currentEvent) return null;

    const supportsTableBookingForEvent = supportsTableBooking(currentEvent);
    const supportsBattlesForEvent = supportsBattles(currentEvent);

    // Use the EXACT SAME logic as UpcomingEvent:
    // {currentEvent && currentEvent.ticketsAvailable !== false && visibleTicketSettings.length > 0 && (...)}
    const ticketsAvailable =
      currentEvent &&
      currentEvent.ticketsAvailable !== false &&
      visibleTicketSettings.length > 0;

    // For guest code, check if it's enabled - always show it if event exists
    const showGuestCode = !!currentEvent;

    // For gallery, check if event has dropboxFolderPath
    const showGallery = !!(currentEvent && currentEvent.dropboxFolderPath);

    // Determine what actions to show based on event configuration

    // Only render if any action is available
    if (
      !supportsTableBookingForEvent &&
      !ticketsAvailable &&
      !showGuestCode &&
      !supportsBattlesForEvent &&
      !showGallery
    ) {
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
                  {!isActionButtonsSticky && (
                    <p>
                      {codeSettings.find((setting) => setting.type === "guest")
                        ?.condition || "Free entry with code"}
                    </p>
                  )}
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

          {/* Battle signup button */}
          {supportsBattlesForEvent && (
            <motion.button
              className="event-action-button battle-button"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              onClick={scrollToBattleSignup}
            >
              <div className="button-content">
                <div className="button-icon">
                  <RiSwordLine />
                </div>
                <div className="button-text">
                  <span className="button-text-full">Join Battle</span>
                  <span className="button-text-short">Battle</span>
                  {!isActionButtonsSticky && <p>Sign up for battle</p>}
                </div>
                <div className="button-arrow">
                  <RiArrowRightSLine />
                </div>
              </div>
            </motion.button>
          )}

          {/* Photos button - only show if photos are available */}
          {!checkingGalleries && brandHasGalleries && (
            <motion.button
              className="event-action-button gallery-button photos-button"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              onClick={() => {
                // Scroll to photo gallery section
                const photoSection = document.querySelector(
                  ".upcomingEvent-gallery-section"
                );
                if (photoSection) {
                  photoSection.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              <div className="button-content">
                <div className="button-icon">
                  <RiImageLine />
                </div>
                <div className="button-text">
                  <span className="button-text-full">Photos</span>
                  <span className="button-text-short">Photos</span>
                  {!isActionButtonsSticky && <p>View photo gallery</p>}
                </div>
                <div className="button-arrow">
                  <RiArrowRightSLine />
                </div>
              </div>
            </motion.button>
          )}

          {/* Videos button - only show if videos are available */}
          {!checkingVideoGalleries && brandHasVideoGalleries && (
            <motion.button
              className="event-action-button gallery-button videos-button"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              onClick={() => {
                // Scroll to video gallery section
                const videoSection = document.querySelector(
                  ".upcomingEvent-video-section"
                );
                if (videoSection) {
                  videoSection.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              <div className="button-content">
                <div className="button-icon">
                  <RiFilmLine />
                </div>
                <div className="button-text">
                  <span className="button-text-full">Videos</span>
                  <span className="button-text-short">Videos</span>
                  {!isActionButtonsSticky && <p>Watch event videos</p>}
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

              {/* Loading bar with progress */}
              <div className="loading-bar">
                <div
                  className="loading-progress"
                  style={{
                    width: `${totalProgress}%`,
                  }}
                ></div>
              </div>

              {/* Loading steps */}
              <div className="loading-steps">
                <div
                  className={`loading-step ${
                    loadingProgress.brand >= 100
                      ? "completed"
                      : loadingProgress.brand > 0
                      ? "active"
                      : ""
                  }`}
                >
                  <div className="step-content">
                    <span className="step-indicator"></span>
                    <span className="step-text">Loading profile...</span>
                  </div>
                  <span className="step-progress">
                    {Math.round(loadingProgress.brand)}%
                  </span>
                </div>
                <div
                  className={`loading-step ${
                    loadingProgress.events >= 100
                      ? "completed"
                      : loadingProgress.events > 0
                      ? "active"
                      : ""
                  }`}
                >
                  <div className="step-content">
                    <span className="step-indicator"></span>
                    <span className="step-text">Loading events...</span>
                  </div>
                  <span className="step-progress">
                    {Math.round(loadingProgress.events)}%
                  </span>
                </div>
                <div
                  className={`loading-step ${
                    loadingProgress.tickets >= 100
                      ? "completed"
                      : loadingProgress.tickets > 0
                      ? "active"
                      : ""
                  }`}
                >
                  <div className="step-content">
                    <span className="step-indicator"></span>
                    <span className="step-text">Preparing experience...</span>
                  </div>
                  <span className="step-progress">
                    {Math.round(loadingProgress.tickets)}%
                  </span>
                </div>
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="error-content"
            style={{
              textAlign: "center",
              padding: "2rem",
              maxWidth: "400px",
              margin: "2rem auto",
              background: "rgba(21, 21, 21, 0.95)",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              className="error-icon"
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
                color: "#ffc807",
              }}
            >
              🔍
            </div>
            <h2
              style={{
                color: "#fff",
                marginBottom: "0.5rem",
                fontSize: "1.5rem",
                fontWeight: "600",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.7)",
                marginBottom: "1.5rem",
                lineHeight: "1.5",
              }}
            >
              We couldn't find this profile. It might be private or temporarily
              unavailable.
            </p>
            <motion.button
              onClick={() => navigate("/")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                marginTop: "20px",
                padding: "12px 24px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #ffc807, #ffb300)",
                color: "#000",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "600",
                boxShadow: "0 4px 12px rgba(255, 200, 7, 0.3)",
              }}
            >
              Go to Home
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navigation onBack={handleBack} />
      <div className="brand-profile" ref={brandProfileRef}>
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
                  brand.lineups
                    .filter((artist) => artist && artist.name) // Filter out null/undefined artists
                    .reduce((groups, artist) => {
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

        <BrandProfileFeed
          brand={brand}
          onEventChange={handleEventChange}
          onEventsLoaded={handleEventsLoaded}
          initialDateHint={initialDateHint}
          brandHasGalleries={brandHasGalleries}
        />
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

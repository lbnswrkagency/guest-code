import React, { useState, useEffect, useRef, useCallback } from "react";
import "./EventForm.scss";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCloseLine,
  RiUpload2Line,
  RiCalendarEventLine,
  RiTimeLine,
  RiMapPinLine,
  RiTeamLine,
  RiTicketLine,
  RiGroupLine,
  RiVipLine,
  RiMusicLine,
  RiDeleteBinLine,
  RiInformationLine,
  RiSearchLine,
  RiAddLine,
  RiEditLine,
  RiSwordLine,
  RiTrophyLine,
  RiCalendarCheckLine,
  RiMoneyEuroCircleLine,
  RiImageLine,
  RiRefreshLine,
} from "react-icons/ri";
import { useToast } from "../Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  processImage,
  generateBlurPlaceholder,
} from "../../utils/imageProcessor";
import ProgressiveImage from "../ProgressiveImage/ProgressiveImage";
import ErrorBoundary from "../ErrorBoundary/ErrorBoundary";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import { FaTimes, FaCheck } from "react-icons/fa";
import { BiTime } from "react-icons/bi";
import LineUp from "../LineUp/LineUp";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import GenreSelector from "../GenreSelector/GenreSelector";
import CoHost from "../CoHost/CoHost";
import DropboxFolderBrowser from "../DropboxFolderBrowser/DropboxFolderBrowser";
import {
  generateDropboxPath,
  generateSmartDropboxPath,
} from "../../utils/dropboxUtils";

const FLYER_TYPES = [
  {
    id: "portrait",
    ratio: "9:16",
    label: "Portrait",
    aspectRatio: 9 / 16,
    tolerance: 0.2,
  },
  {
    id: "square",
    ratio: "1:1",
    label: "Square",
    aspectRatio: 1,
    tolerance: 0.2,
  },
  {
    id: "landscape",
    ratio: "16:9",
    label: "Landscape",
    aspectRatio: 16 / 9,
    tolerance: 0.2,
  },
];

const validateImageAspectRatio = (file, targetRatio, tolerance) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      const minRatio = targetRatio * (1 - tolerance);
      const maxRatio = targetRatio * (1 + tolerance);

      if (ratio >= minRatio && ratio <= maxRatio) {
        resolve(true);
      } else {
        const ratioType =
          targetRatio === 1
            ? "square"
            : targetRatio > 1
            ? "landscape"
            : "portrait";
        reject(new Error(`Please use a ${ratioType} image for this format`));
      }
    };
    img.onerror = () =>
      reject(new Error("Unable to load image. Please try another file."));
    img.src = URL.createObjectURL(file);
  });
};

const EventForm = ({
  event,
  events = [],
  onClose,
  onSave,
  selectedBrand,
  weekNumber = 0,
  parentEventData,
  templateEvent, // For creating related events from template (non-weekly series)
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const isChildEvent =
    event?.parentEventId || (event?.isWeekly && weekNumber > 0) || event?.weekNumber > 0;
  const isNewChildEvent = !event?._id && isChildEvent && parentEventData;
  const isCreatingFromTemplate = !event && templateEvent && !parentEventData;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Parse event dates and times
  const parseEventDateTime = (eventData) => {
    if (!eventData) return { startDate: new Date(), endDate: new Date() };

    // If we have startDate and endDate, use them directly
    if (eventData.startDate && eventData.endDate) {
      return {
        startDate: new Date(eventData.startDate),
        endDate: new Date(eventData.endDate),
      };
    }

    // No legacy date field - use current date as fallback for new events
    const startDate = new Date();
    const endDate = new Date();

    return { startDate, endDate };
  };

  const { startDate, endDate } = parseEventDateTime(event);

  // Determine initial data based on whether it's a new child event or creating from template
  const getInitialData = () => {
    if (isNewChildEvent) {
      // Inherit from parent (for weekly child events)
      return {
        title: parentEventData?.title || "",
        subTitle: parentEventData?.subTitle || "",
        description: parentEventData?.description || "",
        startDate: startDate instanceof Date ? startDate : new Date(),
        endDate: endDate instanceof Date ? endDate : new Date(),
        location: parentEventData?.location || "",
        street: parentEventData?.street || "",
        postalCode: parentEventData?.postalCode || "",
        city: parentEventData?.city || "",
        music: parentEventData?.music || "",
        isWeekly: true, // It's a child of a weekly event
        flyer: null, // Don't inherit flyer initially
        tableLayout: parentEventData?.tableLayout || "",
        dropboxFolderPath: parentEventData?.dropboxFolderPath || "",
      };
    } else if (isCreatingFromTemplate) {
      // Inherit from template (for non-weekly event series)
      // Determine parentEventId: if template has a parent, use that; otherwise template is the parent
      const parentId =
        templateEvent?.parentEventId || templateEvent?._id || null;
      return {
        title: templateEvent?.title || "",
        subTitle: templateEvent?.subTitle || "",
        description: templateEvent?.description || "",
        startDate: new Date(), // Clear date - user must select new date
        endDate: new Date(), // Clear date - user must select new date
        location: templateEvent?.location || "",
        street: templateEvent?.street || "",
        postalCode: templateEvent?.postalCode || "",
        city: templateEvent?.city || "",
        music: templateEvent?.music || "",
        isWeekly: false, // Not a weekly event
        flyer: null, // Will inherit flyers in useEffect
        tableLayout: templateEvent?.tableLayout || "",
        parentEventId: parentId, // Link to parent for series navigation
      };
    } else {
      // Use existing event data or defaults
      return {
        title: event?.title || "",
        subTitle: event?.subTitle || "",
        description: event?.description || "",
        startDate: startDate instanceof Date ? startDate : new Date(),
        endDate: endDate instanceof Date ? endDate : new Date(),
        location: event?.location || "",
        street: event?.street || "",
        postalCode: event?.postalCode || "",
        city: event?.city || "",
        music: event?.music || "",
        isWeekly: event?.isWeekly || false,
        weeklyEnded: event?.weeklyEnded || false,
        flyer: null,
        tableLayout: event?.tableLayout || "",
        dropboxFolderPath: event?.dropboxFolderPath || "",
      };
    }
  };

  const initialData = getInitialData();

  const [formData, setFormData] = useState(initialData);

  const [processedFiles, setProcessedFiles] = useState({
    landscape: null,
    portrait: null,
    square: null,
  });

  const [previews, setPreviews] = useState(() => ({
    landscape: event?.flyer?.landscape || null,
    portrait: event?.flyer?.portrait || null,
    square: event?.flyer?.square || null,
  }));

  const [isUploading, setIsUploading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [blobUrls, setBlobUrls] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFlyerType, setSelectedFlyerType] = useState(
    event?.flyerType || "portrait"
  );

  const processQueue = useRef([]);
  const abortControllerRef = useRef(null);

  const [flyerFiles, setFlyerFiles] = useState({
    portrait: null,
    square: null,
    landscape: null,
  });
  const [flyerPreviews, setFlyerPreviews] = useState(() => {
    if (event?.flyer) {
      const previews = {};
      Object.entries(event.flyer).forEach(([format, urls]) => {
        if (urls) {
          previews[format] = {
            thumbnail: urls.thumbnail,
            medium: urls.medium,
            full: urls.full,
            blur: urls.blur || urls.thumbnail,
            isExisting: true,
          };
        }
      });
      return previews;
    }
    return {};
  });
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRefs = {
    portrait: useRef(),
    square: useRef(),
    landscape: useRef(),
  };

  // Add state for LineUp modal
  const [showLineUpModal, setShowLineUpModal] = useState(false);
  // Add state for selected lineups
  const [selectedLineups, setSelectedLineups] = useState([]);

  // Add state for GenreSelector modal
  const [showGenreModal, setShowGenreModal] = useState(false);

  // Add state for table layouts
  const [availableTableLayouts, setAvailableTableLayouts] = useState([]);

  // Add state for selected genres
  const [selectedGenres, setSelectedGenres] = useState([]);

  // Add state for search and filtered genres
  const [search, setSearch] = useState("");
  const [filteredGenres, setFilteredGenres] = useState([]);
  const [showNewGenreForm, setShowNewGenreForm] = useState(false);
  const [newGenre, setNewGenre] = useState("");

  // Add state for genres loading and management
  const [allGenres, setAllGenres] = useState([]);

  // Add state for genre editing
  const [editingGenre, setEditingGenre] = useState(null);
  const [editGenreName, setEditGenreName] = useState("");
  const [showDeleteGenreConfirm, setShowDeleteGenreConfirm] = useState(false);
  const [genreToDelete, setGenreToDelete] = useState(null);

  // Add a new state to track genre IDs that need to be selected
  const [genreIdsToSelect, setGenreIdsToSelect] = useState([]);

  // Add state for co-hosts
  const [selectedCoHosts, setSelectedCoHosts] = useState([]);

  // Battle configuration states
  const [battleConfig, setBattleConfig] = useState({
    isEnabled: false,
    title: "Dance Battle",
    subtitle: "1 vs 1 Dance Battles - The crowd picks the winner!",
    description: "",
    prizeMoney: 0,
    currency: "€",
    maxParticipantsPerCategory: 16,
    categories: [],
    registrationDeadline: null,
    isRegistrationOpen: true,
    battleRules: "",
    additionalInfo: "",
  });

  const [battleCategories, setBattleCategories] = useState([
    {
      name: "allStyles",
      displayName: "All Styles",
      prizeMoney: 0,
      maxParticipants: 16,
      participantsPerSignup: 1,
      signUpsDone: false,
    },
    {
      name: "afroStyles",
      displayName: "Afro Styles",
      prizeMoney: 0,
      maxParticipants: 16,
      participantsPerSignup: 1,
      signUpsDone: false,
    },
    {
      name: "dancehall",
      displayName: "Dancehall",
      prizeMoney: 0,
      maxParticipants: 16,
      participantsPerSignup: 1,
      signUpsDone: false,
    },
  ]);

  const [newBattleCategory, setNewBattleCategory] = useState({
    name: "",
    displayName: "",
    prizeMoney: 0,
    maxParticipants: 16,
    participantsPerSignup: 1,
    signUpsDone: false,
  });
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);

  // Dropbox auto-generation state
  const [isDropboxPathAutoGenerated, setIsDropboxPathAutoGenerated] =
    useState(false);
  const [dropboxPathSuggestion, setDropboxPathSuggestion] = useState("");

  // Fetch genres for the brand
  useEffect(() => {
    if (selectedBrand?._id) {
      fetchBrandGenres();
    }
  }, [selectedBrand]);

  const fetchBrandGenres = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        `/genres/brand/${selectedBrand._id}`
      );
      setAllGenres(response.data || []);
    } catch (error) {
      toast.showError("Failed to load music genres");
    } finally {
      setLoading(false);
    }
  };

  // Load existing genres if event exists
  useEffect(() => {
    if (event?._id) {
      // If event already has genres populated, use those
      if (event.genres && Array.isArray(event.genres)) {
        setSelectedGenres(event.genres);
      } else {
        // Otherwise, fetch genres from API
        const fetchEventGenres = async () => {
          try {
            const token = localStorage.getItem("token");
            const response = await axiosInstance.get(
              `/genres/event/${event._id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            setSelectedGenres(response.data);
          } catch (error) {}
        };

        fetchEventGenres();
      }
    }
  }, [event]);

  // Fetch available table layouts
  useEffect(() => {
    const fetchTableLayouts = async () => {
      try {
        const response = await axiosInstance.get("/table/layouts");
        if (response.data.success) {
          setAvailableTableLayouts(response.data.layouts);
        }
      } catch (error) {
        console.error("Failed to fetch table layouts:", error);
        // Fallback to default layouts if API fails
        setAvailableTableLayouts([
          {
            id: "studio",
            name: "Studio",
            description: "Professional studio layout",
          },
          {
            id: "bolivar",
            name: "Bolivar",
            description: "Classic club layout",
          },
          {
            id: "venti",
            name: "Venti",
            description: "Modern garden-themed layout",
          },
          { id: "harlem", name: "Harlem", description: "Urban upscale layout" },
          {
            id: "amano",
            name: "Amano",
            description: "Hotel bar lounge layout",
          },
        ]);
      }
    };

    fetchTableLayouts();
  }, []);

  // Handle saving selected lineups
  const handleSaveLineups = (lineups) => {
    setSelectedLineups(lineups);
  };

  // Handle saving selected genres
  const handleSaveGenres = (genres) => {
    setSelectedGenres(genres);
  };

  // Auto-generate Dropbox path when brand or start date changes
  useEffect(() => {
    if (
      selectedBrand?.dropboxBaseFolder &&
      formData.startDate &&
      !isDropboxPathAutoGenerated
    ) {
      const generatedPath = generateSmartDropboxPath(
        events, // Pass brand events for smart suggestion
        formData.startDate,
        selectedBrand.dropboxBaseFolder,
        selectedBrand.dropboxPathStructure,
        selectedBrand.dropboxDateFormat, // Pass the user's preferred date format
        selectedBrand.dropboxPhotoSubfolder // Pass the photo subfolder
      );
      if (generatedPath && generatedPath !== formData.dropboxFolderPath) {
        setDropboxPathSuggestion(generatedPath);
      }
    }
  }, [
    events,
    selectedBrand?.dropboxBaseFolder,
    selectedBrand?.dropboxPathStructure,
    selectedBrand?.dropboxDateFormat,
    selectedBrand?.dropboxPhotoSubfolder,
    formData.startDate,
    isDropboxPathAutoGenerated,
  ]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Cleanup blob URLs
      Object.values(previews).forEach((preview) => {
        if (preview?.urls) {
          Object.values(preview.urls).forEach((url) => {
            if (url && url.startsWith("blob:")) {
              URL.revokeObjectURL(url);
            }
          });
        }
      });
    };
  }, []);

  const createAndTrackBlobUrl = (blob) => {
    const url = URL.createObjectURL(blob);
    setBlobUrls((prev) => new Set([...prev, url]));
    return url;
  };

  // Validate form
  useEffect(() => {
    const isValid = formData.title && formData.location;
    setIsFormValid(isValid);
  }, [formData.title, formData.location]);

  const handleFlyerClick = (type) => {
    fileInputRefs[type].current?.click();
  };

  const handleDeleteFlyer = async (e, type) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // If it's an existing flyer (has isExisting flag), delete from server
      if (flyerPreviews[type]?.isExisting && event?._id) {
        const response = await axiosInstance.delete(
          `/events/${event._id}/flyer/${type}`
        );

        if (response.status === 200) {
          toast.showSuccess(
            `${
              type.charAt(0).toUpperCase() + type.slice(1)
            } flyer deleted successfully`
          );
        }
      }

      // Remove from local state
      setFlyerFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[type];
        return newFiles;
      });

      setFlyerPreviews((prev) => {
        const newPreviews = { ...prev };
        // Revoke blob URLs to prevent memory leaks
        if (newPreviews[type]) {
          Object.values(newPreviews[type]).forEach((url) => {
            if (typeof url === "string" && url.startsWith("blob:")) {
              URL.revokeObjectURL(url);
            }
          });
          delete newPreviews[type];
        }
        return newPreviews;
      });

      // Reset file input
      if (fileInputRefs[type]?.current) {
        fileInputRefs[type].current.value = "";
      }
    } catch (error) {
      toast.showError("Failed to delete flyer");
    }
  };

  const handleFlyerChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const flyerType = FLYER_TYPES.find((t) => t.id === type);
    const loadingToast = toast.showLoading(
      `Processing ${flyerType.label} flyer...`
    );

    try {
      // Validate file size
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("File size should be less than 20MB");
      }

      // Validate aspect ratio
      await validateImageAspectRatio(
        file,
        flyerType.aspectRatio,
        flyerType.tolerance
      );

      // Process image
      const processed = await processImage(file);
      const blurPlaceholder = await generateBlurPlaceholder(file);

      // Create preview URLs
      const previewUrls = {
        thumbnail: URL.createObjectURL(processed.thumbnail.file),
        medium: URL.createObjectURL(processed.medium.file),
        full: URL.createObjectURL(processed.full.file),
        blur: blurPlaceholder,
        isExisting: false,
      };

      // Update state with the processed files
      setFlyerFiles((prev) => ({
        ...prev,
        [type]: {
          full: { file: processed.full.file },
          medium: { file: processed.medium.file },
          thumbnail: { file: processed.thumbnail.file },
        },
      }));

      setFlyerPreviews((prev) => ({
        ...prev,
        [type]: previewUrls,
      }));

      toast.showSuccess(`${flyerType.label} flyer ready for upload`);
    } catch (error) {
      toast.showError(error.message);
      e.target.value = "";
    } finally {
      loadingToast.dismiss();
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Special handling for dropboxFolderPath - mark as manually modified if user types
    if (name === "dropboxFolderPath" && value !== formData.dropboxFolderPath) {
      setIsDropboxPathAutoGenerated(false);
      setDropboxPathSuggestion(""); // Clear suggestion when manually modified
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Function to accept the auto-generated photo suggestion
  const acceptDropboxSuggestion = () => {
    if (dropboxPathSuggestion) {
      setFormData((prev) => ({
        ...prev,
        dropboxFolderPath: dropboxPathSuggestion,
      }));
      setIsDropboxPathAutoGenerated(true);
      setDropboxPathSuggestion("");
    }
  };

  // Handle Dropbox folder selection from browser
  const handleDropboxFolderSelect = (path) => {
    setFormData((prev) => ({
      ...prev,
      dropboxFolderPath: path,
    }));
    setIsDropboxPathAutoGenerated(false);
    setDropboxPathSuggestion(""); // Clear suggestion when manually selected
  };

  // Function to clear dropbox paths
  const clearDropboxPath = () => {
    setFormData((prev) => ({ ...prev, dropboxFolderPath: "" }));
    setIsDropboxPathAutoGenerated(false);
    setDropboxPathSuggestion("");
  };

  // Function to regenerate path suggestion
  const regenerateDropboxPath = () => {
    if (selectedBrand?.dropboxBaseFolder && formData.startDate) {
      const generatedPath = generateSmartDropboxPath(
        events, // Pass brand events for smart suggestion
        formData.startDate,
        selectedBrand.dropboxBaseFolder,
        selectedBrand.dropboxPathStructure,
        selectedBrand.dropboxDateFormat, // Pass the user's preferred date format
        selectedBrand.dropboxPhotoSubfolder // Pass the photo subfolder
      );
      setDropboxPathSuggestion(generatedPath);
      setIsDropboxPathAutoGenerated(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create a new FormData object to handle file uploads
      const dataToSend = new FormData();

      // Format and append date fields properly
      let startDate, endDate, startTime, endTime;

      try {
        // Handle startDate - ensure it's a valid Date object
        if (typeof formData.startDate === "string") {
          startDate = new Date(formData.startDate);
        } else if (formData.startDate instanceof Date) {
          startDate = formData.startDate;
        } else {
          // Default to current date if invalid
          startDate = new Date();
        }

        // Handle endDate similarly
        if (typeof formData.endDate === "string") {
          endDate = new Date(formData.endDate);
        } else if (formData.endDate instanceof Date) {
          endDate = formData.endDate;
        } else {
          // Default to startDate + 2 hours if invalid
          endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
        }

        // Format times
        const startHours = startDate.getHours().toString().padStart(2, "0");
        const startMinutes = startDate.getMinutes().toString().padStart(2, "0");
        startTime = `${startHours}:${startMinutes}`;

        const endHours = endDate.getHours().toString().padStart(2, "0");
        const endMinutes = endDate.getMinutes().toString().padStart(2, "0");
        endTime = `${endHours}:${endMinutes}`;

        // Add the formatted date and times to FormData
        // Remove legacy date field - we now use startDate and endDate
        dataToSend.append("startDate", startDate.toISOString());
        dataToSend.append("endDate", endDate.toISOString());
        dataToSend.append("startTime", startTime);
        dataToSend.append("endTime", endTime);
      } catch (error) {
        toast.showError("Invalid date format");
        setIsSubmitting(false);
        return;
      }

      // Make sure required fields are set
      if (!formData.title) {
        toast.showError("Title is required");
        setIsSubmitting(false);
        return;
      }

      if (!formData.location) {
        toast.showError("Location is required");
        setIsSubmitting(false);
        return;
      }

      // Append other form fields
      Object.keys(formData).forEach((key) => {
        // Skip date fields as we've already handled them
        if (key === "startDate" || key === "endDate" || key === "date") {
          return;
        }
        // Skip time fields as we've already handled them
        else if (key === "startTime" || key === "endTime") {
          return;
        }
        // Skip flyer as we'll handle it separately
        else if (key === "flyer") {
          return;
        }
        // Handle arrays
        else if (Array.isArray(formData[key])) {
          dataToSend.append(key, JSON.stringify(formData[key]));
        }
        // Handle objects
        else if (
          typeof formData[key] === "object" &&
          formData[key] !== null &&
          !(formData[key] instanceof File)
        ) {
          dataToSend.append(key, JSON.stringify(formData[key]));
        }
        // Handle booleans
        else if (typeof formData[key] === "boolean") {
          dataToSend.append(key, formData[key].toString());
        }
        // Handle other values
        else if (formData[key] !== undefined && formData[key] !== null) {
          dataToSend.append(key, formData[key]);
        }
      });

      // Make sure we're sending the brand ID correctly
      if (!selectedBrand?._id) {
        toast.showError("Missing brand information");
        setIsSubmitting(false);
        return;
      }

      // Add selected lineups to the form data
      if (selectedLineups.length > 0) {
        dataToSend.append(
          "lineups",
          JSON.stringify(
            selectedLineups
              .filter((lineup) => lineup && lineup._id)
              .map((lineup) => lineup._id)
          )
        );
      }

      // Add selected genres to the form data
      if (selectedGenres.length > 0) {
        dataToSend.append(
          "genres",
          JSON.stringify(selectedGenres.map((genre) => genre._id))
        );
      }

      // Add selected co-hosts to the form data
      console.log("🔍 [EventForm] Current selectedCoHosts:", selectedCoHosts);
      const validCoHosts = selectedCoHosts.filter(
        (coHost) => coHost && coHost._id
      );
      if (validCoHosts.length > 0) {
        const coHostIds = validCoHosts.map((coHost) => coHost._id);
        console.log("✅ [EventForm] Adding coHosts to FormData:", coHostIds);
        dataToSend.append("coHosts", JSON.stringify(coHostIds));
      } else {
        console.log(
          "ℹ️ [EventForm] No coHosts to add to FormData - adding empty array"
        );
        dataToSend.append("coHosts", JSON.stringify([]));
      }

      // Add battle configuration
      if (battleConfig.isEnabled) {
        const battleData = {
          ...battleConfig,
          categories: battleConfig.categories
            .filter((cat) => battleCategories.some((bc) => bc.name === cat))
            .map((catName) => {
              const fullCat = battleCategories.find(
                (bc) => bc.name === catName
              );
              return {
                name: fullCat.name,
                displayName: fullCat.displayName,
                prizeMoney: fullCat.prizeMoney || battleConfig.prizeMoney,
                maxParticipants:
                  fullCat.maxParticipants ||
                  battleConfig.maxParticipantsPerCategory,
                participantsPerSignup: fullCat.participantsPerSignup || 1,
                signUpsDone: fullCat.signUpsDone || false,
              };
            }),
        };
        dataToSend.append("battleConfig", JSON.stringify(battleData));
      }

      let eventResponse;

      // Check if this is a calculated occurrence (temporary event that doesn't exist in DB yet)
      // Look both at event._id being null and checking if we're in a week > 0 for a weekly event
      const isCalculatedOccurrence =
        (!event?._id && event?.parentEventId && event?.weekNumber > 0) ||
        (!event?._id && isChildEvent && weekNumber > 0);

      if (isCalculatedOccurrence) {
        // Need to create the child event first by toggling it live (which creates it in the DB)
        try {
          // Create a loading toast
          const loadingToast = toast.showLoading("Creating child event...");

          // Get the correct parent ID
          const parentId = event.parentEventId || event.id;
          const weekToUse = event.weekNumber || weekNumber;

          if (!parentId) {
            throw new Error("Could not determine parent event ID");
          }

          // Call the API endpoint that creates child events (toggle-live with weekNumber)
          const createResponse = await axiosInstance.patch(
            `/events/${parentId}/toggle-live?weekNumber=${weekToUse}`
          );

          if (createResponse.data && createResponse.data.childEvent) {
            loadingToast.dismiss();
            toast.showSuccess("Child event created successfully");

            // Now we can proceed with the update using the newly created child event ID
            event._id = createResponse.data.childEvent._id;

            // Toggle it back to the original state if needed (it was automatically set to live)
            if (!formData.isLive && createResponse.data.isLive) {
              await axiosInstance.patch(`/events/${event._id}/toggle-live`);
            }
          } else {
            loadingToast.dismiss();
            throw new Error("Failed to create child event");
          }
        } catch (createError) {
          toast.showError(
            "Failed to create child event: " +
              (createError.message || "Unknown error")
          );
          setIsSubmitting(false);
          return;
        }
      }

      if (event?._id) {
        // Update event details first
        // For event update, we need to handle genres properly:
        // If using FormData, the backend needs special handling
        // If using a regular PUT request, we need to properly structure the body

        // Convert FormData to plain object for PUT request
        const updateData = {};
        for (const [key, value] of dataToSend.entries()) {
          // Skip legacy date field
          if (key === "date") {
            continue;
          } else if (value === "true" || value === "false") {
            updateData[key] = value === "true";
          } else {
            updateData[key] = value;
          }
        }

        // Add selected lineups to the update data
        if (selectedLineups.length > 0) {
          updateData.lineups = selectedLineups
            .filter((lineup) => lineup && lineup._id)
            .map((lineup) => lineup._id);
        }

        // Add selected genres to the update data (not as a stringified array)
        if (selectedGenres.length > 0) {
          updateData.genres = selectedGenres.map((genre) => genre._id);
        }

        // Add selected co-hosts to the update data
        const validCoHostsForUpdate = selectedCoHosts.filter(
          (coHost) => coHost && coHost._id
        );
        if (validCoHostsForUpdate.length > 0) {
          updateData.coHosts = validCoHostsForUpdate.map(
            (coHost) => coHost._id
          );
        } else {
          updateData.coHosts = []; // Explicitly set empty array if no valid co-hosts
        }

        // Add battle configuration for updates
        if (battleConfig.isEnabled) {
          const battleData = {
            ...battleConfig,
            categories: battleConfig.categories
              .filter((cat) => battleCategories.some((bc) => bc.name === cat))
              .map((catName) => {
                const fullCat = battleCategories.find(
                  (bc) => bc.name === catName
                );
                return {
                  name: fullCat.name,
                  displayName: fullCat.displayName,
                  prizeMoney: fullCat.prizeMoney || battleConfig.prizeMoney,
                  maxParticipants:
                    fullCat.maxParticipants ||
                    battleConfig.maxParticipantsPerCategory,
                  participantsPerSignup: fullCat.participantsPerSignup || 1,
                  signUpsDone: fullCat.signUpsDone || false,
                };
              }),
          };
          updateData.battleConfig = battleData;
        } else {
          // Explicitly disable battle if not enabled
          updateData.battleConfig = { isEnabled: false };
        }

        // Include the weekNumber in the URL if this is a child event or we're editing a specific week
        const weekParam =
          isChildEvent || weekNumber > 0 ? `?weekNumber=${weekNumber}` : "";

        eventResponse = await axiosInstance.put(
          `/events/${event._id}${weekParam}`,
          updateData
        );

        // Handle flyer uploads separately
        for (const [format, files] of Object.entries(flyerFiles)) {
          if (files?.full?.file) {
            const flyerFormData = new FormData();
            flyerFormData.append("flyer", files.full.file);

            try {
              const uploadUrl = `/events/${event._id}/flyer/${format}`;

              const response = await axiosInstance.put(
                uploadUrl,
                flyerFormData,
                {
                  headers: {
                    "Content-Type": "multipart/form-data",
                  },
                  onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                      (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress((prev) => ({
                      ...prev,
                      [format]: percentCompleted,
                    }));
                  },
                }
              );

              if (response.data?.flyer?.[format]) {
                setFlyerPreviews((prev) => ({
                  ...prev,
                  [format]: {
                    ...response.data.flyer[format],
                    blur: prev[format]?.blur,
                    isExisting: true,
                  },
                }));

                eventResponse = response;
              }
            } catch (uploadError) {
              throw uploadError; // Let parent handle the error
            }
          }
        }
      } else {
        // Handle flyer uploads as part of the event creation
        Object.entries(flyerFiles).forEach(([format, files]) => {
          if (files?.full?.file) {
            dataToSend.append(`flyer.${format}`, files.full.file);
          }
        });

        eventResponse = await axiosInstance.post(
          `/events/brand/${selectedBrand._id}`,
          dataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress((prev) => ({
                ...prev,
                overall: percentCompleted,
              }));
            },
          }
        );
      }

      await onSave(eventResponse.data);
      onClose();
    } catch (error) {
      console.error("Error submitting event:", error);
      toast.showError(error.response?.data?.message || "Failed to save event");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clean up debugging logs throughout the file
  useEffect(() => {
    if (event) {
      // Remove console.log for event debugging
    }
  }, [event]);

  // Check component mount
  useEffect(() => {
    // For calculated occurrences, make sure we have correct initialization
    if (!event?._id && event?.parentEventId && weekNumber > 0) {
      // Remove console.log for calculated occurrence
    }

    // Component cleanup
    return () => {
      // Clean up blob URLs when component unmounts
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  // Handle delete event
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      // Delete the event and all related data
      const response = await axiosInstance.delete(
        `/events/${event._id}?deleteRelated=true`
      );

      if (response.data.success) {
        toast.showSuccess("Event deleted successfully");
        onClose(true); // Pass true to indicate successful deletion
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.showError("Failed to delete event");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // Add state and functions for genre selection
  const [genreSelection, setGenreSelection] = useState([]);

  const handleAddNewGenre = () => {
    setShowNewGenreForm(true);
  };

  const handleCreateGenre = async () => {
    if (!newGenre.trim()) {
      toast.showError("Genre name cannot be empty");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post("/genres", {
        brandId: selectedBrand._id,
        name: newGenre.trim(),
        icon: "music",
      });

      // Add new genre to the list
      const newGenreObj = response.data;
      setAllGenres((prev) => [...prev, newGenreObj]);

      // Automatically select the new genre
      setSelectedGenres((prev) => [...prev, newGenreObj]);

      // Reset form but keep the create form open for easier multiple additions
      setNewGenre("");

      toast.showSuccess(`"${newGenreObj.name}" created and selected`);
    } catch (error) {
      console.error("Error creating genre:", error);
      toast.showError(
        error.response?.data?.message || "Failed to create genre"
      );
    } finally {
      setLoading(false);
    }
  };

  // Toggle genre selection
  const toggleGenreSelection = (genre) => {
    setSelectedGenres((prevGenres) => {
      const isSelected = prevGenres.some((g) => g._id === genre._id);

      if (isSelected) {
        return prevGenres.filter((g) => g._id !== genre._id);
      } else {
        return [...prevGenres, genre];
      }
    });
  };

  // Handle editing a genre
  const handleEditGenre = (genre, e) => {
    e.preventDefault(); // Add preventDefault
    e.stopPropagation(); // Prevent selection of the genre when clicking edit
    setEditingGenre(genre);
    setEditGenreName(genre.name);
    setShowNewGenreForm(false); // Close the new genre form if it's open
  };

  // Save edited genre
  const handleSaveGenreEdit = async (e) => {
    if (e) e.preventDefault(); // Add preventDefault

    if (!editGenreName.trim()) {
      toast.showError("Genre name cannot be empty");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.put(`/genres/${editingGenre._id}`, {
        name: editGenreName.trim(),
      });

      // Update the genre in allGenres list
      setAllGenres((prev) =>
        prev.map((g) =>
          g._id === editingGenre._id ? { ...g, name: editGenreName.trim() } : g
        )
      );

      // Update in selectedGenres if it's selected
      setSelectedGenres((prev) =>
        prev.map((g) =>
          g._id === editingGenre._id ? { ...g, name: editGenreName.trim() } : g
        )
      );

      toast.showSuccess("Genre updated successfully");
      setEditingGenre(null);
      setEditGenreName("");
    } catch (error) {
      console.error("Error updating genre:", error);
      toast.showError(
        error.response?.data?.message || "Failed to update genre"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a genre
  const handleDeleteGenre = (genre, e) => {
    e.preventDefault(); // Add preventDefault
    e.stopPropagation(); // Prevent selection of the genre when clicking delete
    setGenreToDelete(genre);
    setShowDeleteGenreConfirm(true);
  };

  // Confirm genre deletion
  const confirmDeleteGenre = async (e) => {
    if (e) e.preventDefault(); // Add preventDefault
    if (!genreToDelete) return;

    try {
      setLoading(true);
      await axiosInstance.delete(`/genres/${genreToDelete._id}`);

      // Remove from allGenres
      setAllGenres((prev) => prev.filter((g) => g._id !== genreToDelete._id));

      // Remove from selectedGenres if it's selected
      setSelectedGenres((prev) =>
        prev.filter((g) => g._id !== genreToDelete._id)
      );

      toast.showSuccess("Genre deleted successfully");
    } catch (error) {
      console.error("Error deleting genre:", error);
      toast.showError(
        error.response?.data?.message || "Failed to delete genre"
      );
    } finally {
      setLoading(false);
      setShowDeleteGenreConfirm(false);
      setGenreToDelete(null);
    }
  };

  // Update the GenreItem component to include edit and delete icons
  const GenreItem = ({ genre, isSelected, onSelect }) => (
    <div
      className={`genre-item ${isSelected ? "selected" : ""}`}
      onClick={(e) => {
        e.preventDefault(); // Add preventDefault
        onSelect();
      }}
    >
      <RiMusicLine className="genre-icon" />
      <span className="genre-name">{genre.name}</span>
      {isSelected ? (
        <div className="selected-indicator">
          <FaCheck className="check-icon" />
        </div>
      ) : (
        <div className="genre-actions" onClick={(e) => e.stopPropagation()}>
          <RiEditLine
            className="action-icon edit-icon"
            onClick={(e) => handleEditGenre(genre, e)}
          />
          <RiDeleteBinLine
            className="action-icon delete-icon"
            onClick={(e) => handleDeleteGenre(genre, e)}
          />
        </div>
      )}
    </div>
  );

  // Effect to initialize form when editing
  useEffect(() => {
    if (event?._id) {
      // IMPORTANT: Make sure we properly parse date fields
      const { startDate: parsedStartDate, endDate: parsedEndDate } =
        parseEventDateTime(event);

      setFormData({
        title: event.title || "",
        subTitle: event.subTitle || "",
        description: event.description || "",
        // Remove legacy date field - we now use startDate and endDate
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        location: event.location || "",
        street: event.street || "",
        postalCode: event.postalCode || "",
        city: event.city || "",
        music: event.music || "",
        isWeekly: event.isWeekly || false,
        weeklyEnded: event.weeklyEnded || false,
        isLive: event.isLive || false,
        flyer: event.flyer || null,
        tableLayout: event.tableLayout || "",
        dropboxFolderPath: event.dropboxFolderPath || "",
      });

      // Initialize battle configuration if event has battle config
      if (event.battleConfig) {
        setBattleConfig({
          isEnabled: event.battleConfig.isEnabled || false,
          title: event.battleConfig.title || "Dance Battle",
          subtitle:
            event.battleConfig.subtitle ||
            "1 vs 1 Dance Battles - The crowd picks the winner!",
          description: event.battleConfig.description || "",
          prizeMoney: event.battleConfig.prizeMoney || 0,
          currency: event.battleConfig.currency || "€",
          maxParticipantsPerCategory:
            event.battleConfig.maxParticipantsPerCategory || 16,
          categories:
            event.battleConfig.categories?.map((cat) => cat.name) || [],
          registrationDeadline: event.battleConfig.registrationDeadline
            ? new Date(event.battleConfig.registrationDeadline)
            : null,
          isRegistrationOpen:
            event.battleConfig.isRegistrationOpen !== undefined
              ? event.battleConfig.isRegistrationOpen
              : true,
          battleRules: event.battleConfig.battleRules || "",
          additionalInfo: event.battleConfig.additionalInfo || "",
        });

        // Update battle categories with event-specific data
        if (
          event.battleConfig.categories &&
          event.battleConfig.categories.length > 0
        ) {
          setBattleCategories(
            event.battleConfig.categories.map((cat) => ({
              name: cat.name,
              displayName: cat.displayName,
              prizeMoney: cat.prizeMoney || event.battleConfig.prizeMoney || 0,
              maxParticipants:
                cat.maxParticipants ||
                event.battleConfig.maxParticipantsPerCategory ||
                16,
              participantsPerSignup: cat.participantsPerSignup || 1,
              signUpsDone: cat.signUpsDone || false,
            }))
          );
        }
      }

      // Populate selected genres if available
      if (Array.isArray(event.genres) && event.genres.length > 0) {
        if (typeof event.genres[0] === "object") {
          setSelectedGenres(event.genres);
        } else {
          setGenreIdsToSelect(event.genres);
        }
      }

      // Populate selected lineups
      if (Array.isArray(event.lineups)) {
        setSelectedLineups(event.lineups);
      } else {
        setSelectedLineups([]);
      }

      // Populate selected co-hosts (filter out null values)
      console.log("🔍 [EventForm] Raw event.coHosts data:", event.coHosts);
      if (Array.isArray(event.coHosts)) {
        console.log(
          "🔍 [EventForm] Co-hosts details:",
          event.coHosts.map((ch, i) => ({
            index: i,
            isNull: ch === null,
            isUndefined: ch === undefined,
            hasId: ch && ch._id,
            hasName: ch && ch.name,
            fullObject: ch,
          }))
        );

        const validCoHosts = event.coHosts.filter(
          (coHost) => coHost && coHost._id
        );
        setSelectedCoHosts(validCoHosts);
        console.log(
          "✅ [EventForm] Loaded co-hosts with null filtering:",
          validCoHosts
        );
        console.log(
          "✅ [EventForm] Filtered out count:",
          event.coHosts.length - validCoHosts.length
        );
      } else {
        setSelectedCoHosts([]);
        console.log(
          "ℹ️ [EventForm] No co-hosts array found, setting empty array"
        );
      }
    }
    // For non-created child events - if event has no ID but we have parentEventData and it's a child/weekly event
    else if (
      !event?._id &&
      parentEventData &&
      (weekNumber > 0 || event?.weekNumber > 0)
    ) {
      // NEW CHILD EVENT being created - fetch sequential inheritance data instead of using parent directly
      const fetchSequentialInheritanceData = async () => {
        try {
          const weekNum = event?.weekNumber || weekNumber;

          // Fetch the sequential inheritance data from the API
          const response = await axiosInstance.get(
            `/events/${parentEventData._id}/weekly/${weekNum}`
          );

          const templateEvent = response.data;

          // Calculate child's actual start date and time based on parent timing but using template data
          const parentStartDateObj = new Date(
            parentEventData.startDate || parentEventData.date
          );
          const parentEndDateObj = new Date(
            parentEventData.endDate || parentEventData.date
          );

          let childEventStartDate = new Date(parentStartDateObj);
          // Use UTC methods to avoid timezone day-shift
          childEventStartDate.setUTCDate(
            parentStartDateObj.getUTCDate() + weekNum * 7
          );

          // Use template event times if available, otherwise calculate from parent
          let childEventEndDate;
          if (templateEvent.startTime && templateEvent.endTime) {
            // Apply template times to the child event date
            const [startHours, startMinutes] = templateEvent.startTime
              .split(":")
              .map(Number);
            const [endHours, endMinutes] = templateEvent.endTime
              .split(":")
              .map(Number);

            childEventStartDate.setHours(startHours, startMinutes, 0, 0);
            childEventEndDate = new Date(childEventStartDate);
            childEventEndDate.setHours(endHours, endMinutes, 0, 0);

            // Check if it spans midnight
            if (childEventEndDate.getTime() <= childEventStartDate.getTime()) {
              childEventEndDate.setDate(childEventEndDate.getDate() + 1);
            }
          } else {
            // Fallback to parent duration calculation
            const duration =
              parentEndDateObj.getTime() - parentStartDateObj.getTime();
            childEventEndDate = new Date(
              childEventStartDate.getTime() + duration
            );
          }

          // Set form data using template event (sequential inheritance) for content, but parent timing for dates
          setFormData({
            title: templateEvent.title || "",
            subTitle: templateEvent.subTitle || "",
            description: templateEvent.description || "",
            startDate: childEventStartDate,
            endDate: childEventEndDate,
            startTime: templateEvent.startTime || "", // From sequential template
            endTime: templateEvent.endTime || "", // From sequential template
            location: templateEvent.location || "",
            street: templateEvent.street || "",
            postalCode: templateEvent.postalCode || "",
            city: templateEvent.city || "",
            music: templateEvent.music || "",
            isWeekly: true,
            isLive: false,
            flyer: templateEvent.flyer || null,
            tableLayout: templateEvent.tableLayout || "",
          });

          // Copy template's lineups
          if (Array.isArray(templateEvent.lineups)) {
            setSelectedLineups(templateEvent.lineups);
          }

          // Copy template's genres
          if (
            Array.isArray(templateEvent.genres) &&
            templateEvent.genres.length > 0
          ) {
            if (typeof templateEvent.genres[0] === "object") {
              setSelectedGenres(templateEvent.genres);
            } else {
              setGenreIdsToSelect(templateEvent.genres);
            }
          }

          // Copy flyer previews from template
          if (templateEvent.flyer) {
            const previews = {};
            Object.entries(templateEvent.flyer).forEach(([format, urls]) => {
              if (urls) {
                previews[format] = {
                  thumbnail: urls.thumbnail,
                  medium: urls.medium,
                  full: urls.full,
                  blur: urls.blur || urls.thumbnail,
                  isExisting: true,
                };
              }
            });
            setFlyerPreviews(previews);
          }
        } catch (error) {
          // Fallback to parent event data if API call fails
          const weekNum = event?.weekNumber || weekNumber;

          const parentStartDateObj = new Date(
            parentEventData.startDate || parentEventData.date
          );
          const parentEndDateObj = new Date(
            parentEventData.endDate || parentEventData.date
          );

          let childEventStartDate = new Date(parentStartDateObj);
          // Use UTC methods to avoid timezone day-shift
          childEventStartDate.setUTCDate(
            parentStartDateObj.getUTCDate() + weekNum * 7
          );

          const duration =
            parentEndDateObj.getTime() - parentStartDateObj.getTime();
          let childEventEndDate = new Date(
            childEventStartDate.getTime() + duration
          );

          // Fallback to parent event data
          setFormData({
            title: parentEventData.title || "",
            subTitle: parentEventData.subTitle || "",
            description: parentEventData.description || "",
            startDate: childEventStartDate,
            endDate: childEventEndDate,
            startTime: parentEventData.startTime || "",
            endTime: parentEventData.endTime || "",
            location: parentEventData.location || "",
            street: parentEventData.street || "",
            postalCode: parentEventData.postalCode || "",
            city: parentEventData.city || "",
            music: parentEventData.music || "",
            isWeekly: true,
            isLive: false,
            flyer: parentEventData.flyer || null,
            tableLayout: parentEventData.tableLayout || "",
          });

          if (Array.isArray(parentEventData.lineups)) {
            setSelectedLineups(parentEventData.lineups);
          }

          if (
            Array.isArray(parentEventData.genres) &&
            parentEventData.genres.length > 0
          ) {
            if (typeof parentEventData.genres[0] === "object") {
              setSelectedGenres(parentEventData.genres);
            } else {
              setGenreIdsToSelect(parentEventData.genres);
            }
          }

          if (parentEventData.flyer) {
            const previews = {};
            Object.entries(parentEventData.flyer).forEach(([format, urls]) => {
              if (urls) {
                previews[format] = {
                  thumbnail: urls.thumbnail,
                  medium: urls.medium,
                  full: urls.full,
                  blur: urls.blur || urls.thumbnail,
                  isExisting: true,
                };
              }
            });
            setFlyerPreviews(previews);
          }
        }
      };

      // Call the async function
      fetchSequentialInheritanceData();
    } else if (!event?._id && parentEventData && !parentEventData.isWeekly) {
      // Non-weekly child event - inherit from parent (no API call needed, no date calculation)
      // Determine the ROOT parent: if parentEventData already has a parent, use that; otherwise use parentEventData's ID
      const parentId = parentEventData.parentEventId || parentEventData._id;

      setFormData({
        title: parentEventData.title || "",
        subTitle: parentEventData.subTitle || "",
        description: parentEventData.description || "",
        startDate: new Date(), // CLEAR - user picks new date
        endDate: new Date(),   // CLEAR - user picks new date
        startTime: parentEventData.startTime || "",
        endTime: parentEventData.endTime || "",
        location: parentEventData.location || "",
        street: parentEventData.street || "",
        postalCode: parentEventData.postalCode || "",
        city: parentEventData.city || "",
        music: parentEventData.music || "",
        isWeekly: false, // NOT weekly
        isLive: false,
        flyer: null, // DON'T inherit flyer
        tableLayout: parentEventData.tableLayout || "",
        parentEventId: parentId, // Link to parent for series navigation
      });

      // Copy lineups from parent
      if (Array.isArray(parentEventData.lineups)) {
        setSelectedLineups(parentEventData.lineups);
      } else {
        setSelectedLineups([]);
      }

      // Copy genres from parent
      if (Array.isArray(parentEventData.genres) && parentEventData.genres.length > 0) {
        if (typeof parentEventData.genres[0] === "object") {
          setSelectedGenres(parentEventData.genres);
        } else {
          setGenreIdsToSelect(parentEventData.genres);
        }
      } else {
        setSelectedGenres([]);
      }

      // Copy co-hosts from parent
      if (Array.isArray(parentEventData.coHosts)) {
        const validCoHosts = parentEventData.coHosts.filter(c => c != null);
        setSelectedCoHosts(validCoHosts);
      } else {
        setSelectedCoHosts([]);
      }
    } else if (isCreatingFromTemplate && templateEvent) {
      // Creating a related event from template (non-weekly series)
      // Determine the parent: if templateEvent has a parent, use that; otherwise templateEvent is the parent
      const parentId = templateEvent.parentEventId || templateEvent._id;

      setFormData({
        title: templateEvent.title || "",
        subTitle: templateEvent.subTitle || "",
        description: templateEvent.description || "",
        startDate: new Date(), // User must select new date
        endDate: new Date(), // User must select new date
        startTime: templateEvent.startTime || "",
        endTime: templateEvent.endTime || "",
        location: templateEvent.location || "",
        street: templateEvent.street || "",
        postalCode: templateEvent.postalCode || "",
        city: templateEvent.city || "",
        music: templateEvent.music || "",
        isWeekly: false, // Not a weekly event but still a child
        isLive: false,
        flyer: templateEvent.flyer || null,
        tableLayout: templateEvent.tableLayout || "",
        parentEventId: parentId, // Make it a child event for navigation
      });

      // Copy template's lineups
      if (Array.isArray(templateEvent.lineups)) {
        setSelectedLineups(templateEvent.lineups);
      } else {
        setSelectedLineups([]);
      }

      // Copy template's genres
      if (
        Array.isArray(templateEvent.genres) &&
        templateEvent.genres.length > 0
      ) {
        if (typeof templateEvent.genres[0] === "object") {
          setSelectedGenres(templateEvent.genres);
        } else {
          setGenreIdsToSelect(templateEvent.genres);
        }
      } else {
        setSelectedGenres([]);
      }

      // Copy template's co-hosts
      if (Array.isArray(templateEvent.coHosts)) {
        const validCoHosts = templateEvent.coHosts.filter(
          (coHost) => coHost && coHost._id
        );
        setSelectedCoHosts(validCoHosts);
      } else {
        setSelectedCoHosts([]);
      }

      // Copy flyer previews from template
      if (templateEvent.flyer) {
        const previews = {};
        Object.entries(templateEvent.flyer).forEach(([format, urls]) => {
          if (urls) {
            previews[format] = {
              thumbnail: urls.thumbnail,
              medium: urls.medium,
              full: urls.full,
              blur: urls.blur || urls.thumbnail,
              isExisting: true,
            };
          }
        });
        setFlyerPreviews(previews);
      }
    } else {
      // Reset form for new events (non-child, non-template)
      setFormData({
        title: "",
        subTitle: "",
        description: "",
        startDate: null,
        endDate: null,
        startTime: "",
        endTime: "",
        location: "",
        street: "",
        postalCode: "",
        city: "",
        music: "",
        isWeekly: false,
        isLive: false,
        flyer: null,
      });
      setSelectedLineups([]);
      setSelectedGenres([]);
      setSelectedCoHosts([]);
      setFlyerPreviews({});
    }
  }, [
    event,
    parentEventData,
    weekNumber,
    templateEvent,
    isCreatingFromTemplate,
  ]); // Add templateEvent to dependencies

  // Add effect to match genre IDs with full genre objects when allGenres changes
  useEffect(() => {
    if (genreIdsToSelect.length > 0 && allGenres.length > 0) {
      const matchedGenres = allGenres.filter((genre) =>
        genreIdsToSelect.includes(genre._id)
      );

      if (matchedGenres.length > 0) {
        setSelectedGenres(matchedGenres);
        setGenreIdsToSelect([]); // Clear the IDs after matching
      }
    }
  }, [genreIdsToSelect, allGenres]);

  // Battle category management functions
  const handleBattleConfigChange = (field, value) => {
    setBattleConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCategoryToggle = (categoryName) => {
    setBattleConfig((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryName)
        ? prev.categories.filter((cat) => cat !== categoryName)
        : [...prev.categories, categoryName],
    }));
  };

  const handleCategoryUpdate = (categoryName, field, value) => {
    setBattleCategories((prev) =>
      prev.map((cat) =>
        cat.name === categoryName ? { ...cat, [field]: value } : cat
      )
    );
  };

  const addBattleCategory = () => {
    if (
      !newBattleCategory.name.trim() ||
      !newBattleCategory.displayName.trim()
    ) {
      toast.showError("Category name and display name are required");
      return;
    }

    if (battleCategories.some((cat) => cat.name === newBattleCategory.name)) {
      toast.showError("Category with this name already exists");
      return;
    }

    setBattleCategories((prev) => [...prev, { ...newBattleCategory }]);
    setNewBattleCategory({
      name: "",
      displayName: "",
      prizeMoney: 0,
      maxParticipants: 16,
      participantsPerSignup: 1,
      signUpsDone: false,
    });
    setShowAddCategoryForm(false);
    toast.showSuccess("Battle category added");
  };

  const removeBattleCategory = (categoryName) => {
    setBattleCategories((prev) =>
      prev.filter((cat) => cat.name !== categoryName)
    );
    setBattleConfig((prev) => ({
      ...prev,
      categories: prev.categories.filter((cat) => cat !== categoryName),
    }));
    toast.showSuccess("Battle category removed");
  };

  return (
    <AnimatePresence>
      <motion.div
        className="event-form-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="event-form"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <h2>
            <RiCloseLine className="close-button" onClick={onClose} />
            {event ? "Edit Event" : "Create Event"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Event Details</h3>
              <div className="form-group required">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  name="title"
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Subtitle</label>
                <input
                  type="text"
                  value={formData.subTitle}
                  onChange={handleInputChange}
                  name="subTitle"
                  placeholder="Enter event subtitle"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={handleInputChange}
                  name="description"
                  placeholder="Enter event description"
                  rows="3"
                />
              </div>
            </div>

            {/* Co-Hosts section */}
            <div className="form-section">
              <h3>Co-Hosts</h3>
              <p className="form-section-description">
                Add other brands as co-hosts for this event
              </p>
              <CoHost
                selectedCoHosts={selectedCoHosts}
                onUpdate={setSelectedCoHosts}
                currentBrandId={selectedBrand?._id}
                eventId={event?.parentEventId || event?._id}
                eventCodeSettings={[]}
              />
            </div>

            <div className="form-section">
              <h3>{isChildEvent ? "Time" : "Date & Time"}</h3>

              {/* For parent events, show date and time pickers */}
              <div className="date-time-container">
                <div className="date-time-column">
                  <div className="form-group required">
                    <label>Start Date</label>
                    <div className="date-picker-container">
                      <DatePicker
                        selected={
                          formData.startDate instanceof Date
                            ? formData.startDate
                            : new Date()
                        }
                        onChange={(date) => {
                          if (isChildEvent) return; // Do nothing if it's a child event
                          // Handle null date case
                          if (!date) {
                            console.warn(
                              "Selected start date is null, using current date as fallback"
                            );
                            date = new Date();
                          }

                          // Keep the time from the current startDate
                          const newDate = new Date(date);
                          // Make sure formData.startDate exists before accessing its methods
                          if (formData.startDate instanceof Date) {
                            newDate.setHours(
                              formData.startDate.getHours(),
                              formData.startDate.getMinutes(),
                              0,
                              0
                            );
                          }

                          // If the new start date is after the end date, update end date too
                          const newFormData = {
                            ...formData,
                            startDate: newDate,
                          };
                          if (
                            formData.endDate instanceof Date &&
                            newDate > formData.endDate
                          ) {
                            // Set end date to same day but keep the end time
                            const newEndDate = new Date(newDate);
                            if (formData.endDate instanceof Date) {
                              newEndDate.setHours(
                                formData.endDate.getHours(),
                                formData.endDate.getMinutes(),
                                0,
                                0
                              );
                            }
                            newFormData.endDate = newEndDate;
                          }
                          setFormData(newFormData);
                        }}
                        showTimeSelect={false}
                        dateFormat="MMMM d, yyyy"
                        className="date-picker"
                        popperPlacement="bottom-start"
                        disabled={isChildEvent} // Disable Date part for child events
                      />
                      <RiCalendarEventLine className="date-icon" />
                    </div>
                  </div>

                  <div className="form-group required">
                    <label>Start Time</label>
                    <div className="date-picker-container">
                      <DatePicker
                        selected={
                          formData.startDate instanceof Date
                            ? formData.startDate
                            : new Date()
                        }
                        onChange={(date) => {
                          // Handle null date case
                          if (!date) {
                            console.warn(
                              "Selected start time is null, using current time as fallback"
                            );
                            date = new Date();
                          }

                          // Keep the date from the current startDate
                          const newDate =
                            formData.startDate instanceof Date
                              ? new Date(formData.startDate)
                              : new Date();
                          newDate.setHours(
                            date.getHours(),
                            date.getMinutes(),
                            0,
                            0
                          );

                          // If the new start time makes it later than end time on the same day, update end time
                          const newFormData = {
                            ...formData,
                            startDate: newDate,
                          };
                          if (
                            formData.endDate instanceof Date &&
                            formData.startDate instanceof Date &&
                            formData.startDate.toDateString() ===
                              formData.endDate.toDateString() &&
                            newDate > formData.endDate
                          ) {
                            // Set end time to 1 hour later
                            const newEndDate = new Date(newDate);
                            newEndDate.setHours(
                              newDate.getHours() + 1,
                              newDate.getMinutes(),
                              0,
                              0
                            );
                            newFormData.endDate = newEndDate;
                          }
                          setFormData(newFormData);
                        }}
                        showTimeSelect
                        showTimeSelectOnly
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="h:mm aa"
                        className="date-picker"
                        popperPlacement="bottom-start"
                      />
                      <RiTimeLine className="date-icon" />
                    </div>
                  </div>
                </div>

                <div className="date-time-column">
                  <div className="form-group required">
                    <label>End Date</label>
                    <div className="date-picker-container">
                      <DatePicker
                        selected={
                          formData.endDate instanceof Date
                            ? formData.endDate
                            : new Date()
                        }
                        onChange={(date) => {
                          if (isChildEvent) return; // Do nothing if it's a child event
                          // Handle null date case
                          if (!date) {
                            console.warn(
                              "Selected end date is null, using current date as fallback"
                            );
                            date = new Date();
                          }

                          // Keep the time from the current endDate
                          const newDate = new Date(date);
                          if (formData.endDate instanceof Date) {
                            newDate.setHours(
                              formData.endDate.getHours(),
                              formData.endDate.getMinutes(),
                              0,
                              0
                            );
                          }
                          setFormData({ ...formData, endDate: newDate });
                        }}
                        showTimeSelect={false}
                        dateFormat="MMMM d, yyyy"
                        className="date-picker"
                        minDate={
                          formData.startDate instanceof Date
                            ? formData.startDate
                            : new Date()
                        }
                        popperPlacement="bottom-start"
                        disabled={isChildEvent} // Disable Date part for child events
                      />
                      <RiCalendarEventLine className="date-icon" />
                    </div>
                  </div>

                  <div className="form-group required">
                    <label>End Time</label>
                    <div className="date-picker-container">
                      <DatePicker
                        selected={
                          formData.endDate instanceof Date
                            ? formData.endDate
                            : new Date()
                        }
                        onChange={(date) => {
                          // Handle null date case
                          if (!date) {
                            console.warn(
                              "Selected end time is null, using current time as fallback"
                            );
                            date = new Date();
                          }

                          // Keep the date from the current endDate
                          const newDate =
                            formData.endDate instanceof Date
                              ? new Date(formData.endDate)
                              : new Date();
                          newDate.setHours(
                            date.getHours(),
                            date.getMinutes(),
                            0,
                            0
                          );
                          setFormData({ ...formData, endDate: newDate });
                        }}
                        showTimeSelect
                        showTimeSelectOnly
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        timeCaption="Time"
                        dateFormat="h:mm aa"
                        className="date-picker"
                        popperPlacement="bottom-start"
                      />
                      <BiTime className="date-icon" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Only show weekly toggle for parent events */}
              {!isChildEvent && (
                <div className="form-group weekly-event-toggle">
                  <label className="toggle-container">
                    <input
                      type="checkbox"
                      name="isWeekly"
                      checked={formData.isWeekly}
                      onChange={handleInputChange}
                    />
                    <span className="toggle-label">Weekly Event</span>
                  </label>
                </div>
              )}

              {/* Show "Last Event" checkbox only for child events of weekly series */}
              {isChildEvent && (
                <div className="form-group weekly-event-toggle">
                  <label className="toggle-container">
                    <input
                      type="checkbox"
                      name="weeklyEnded"
                      checked={formData.weeklyEnded || false}
                      onChange={handleInputChange}
                    />
                    <span className="toggle-label">This is the last event</span>
                  </label>
                </div>
              )}

              <div className="form-group required">
                <label>Location</label>
                <div className="input-with-icon">
                  <RiMapPinLine />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Enter venue name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Street</label>
                <div className="input-with-icon">
                  <RiMapPinLine />
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="Enter street address"
                  />
                </div>
              </div>

              <div className="location-details">
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    placeholder="Enter postal code"
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                  />
                </div>
              </div>
            </div>

            {/* Photo Gallery Folder */}
            <div className="form-section photo-gallery-section">
              <h3>
                <RiImageLine /> Photo Gallery Folder
              </h3>

              {/* Show suggestion banner if there's a suggestion */}
              {dropboxPathSuggestion && (
                <div className="dropbox-suggestion-banner">
                  <div className="suggestion-content">
                    <span className="suggestion-text">
                      💡 Suggested: <code>{dropboxPathSuggestion}</code>
                    </span>
                    <div className="suggestion-actions">
                      <button
                        type="button"
                        className="suggestion-btn accept"
                        onClick={acceptDropboxSuggestion}
                        title="Use this path"
                      >
                        <FaCheck /> Use
                      </button>
                      <button
                        type="button"
                        className="suggestion-btn reject"
                        onClick={() => setDropboxPathSuggestion("")}
                        title="Dismiss"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="folder-path-input">
                <div className="input-with-icon">
                  <RiImageLine />
                  <input
                    type="text"
                    name="dropboxFolderPath"
                    value={formData.dropboxFolderPath || ""}
                    onChange={handleInputChange}
                    placeholder="Select or enter folder path"
                  />
                </div>
                <div className="path-actions">
                  {selectedBrand?.dropboxBaseFolder && formData.startDate && (
                    <button
                      type="button"
                      className="action-btn regenerate"
                      onClick={regenerateDropboxPath}
                      title="Auto-generate path"
                    >
                      <RiRefreshLine />
                    </button>
                  )}
                  {formData.dropboxFolderPath && (
                    <button
                      type="button"
                      className="action-btn clear"
                      onClick={clearDropboxPath}
                      title="Clear path"
                    >
                      <RiCloseLine />
                    </button>
                  )}
                </div>
              </div>

              <DropboxFolderBrowser
                selectedPath={formData.dropboxFolderPath || ""}
                onSelectPath={handleDropboxFolderSelect}
                placeholder="Browse Dropbox folders"
                eventDate={formData.startDate}
                brandDropboxBaseFolder={selectedBrand?.dropboxBaseFolder || ""}
                autoSuggest={true}
              />
            </div>

            {/* Line Up section - moved before Event Media */}
            <div className="form-section">
              <h3>Line Up</h3>

              {/* Display selected lineups grouped by category */}
              {selectedLineups.length > 0 && (
                <div className="selected-lineups-container">
                  {(() => {
                    // Group lineups by category
                    const groupedByCategory = selectedLineups
                      .filter((lineup) => lineup && lineup.name) // Filter out null/undefined lineups
                      .reduce((groups, lineup) => {
                        const category = lineup.category || "Uncategorized";
                        if (!groups[category]) {
                          groups[category] = [];
                        }
                        groups[category].push(lineup);
                        return groups;
                      }, {});

                    // Create an array of JSX elements for each category
                    return Object.entries(groupedByCategory).map(
                      ([category, lineups]) => (
                        <div key={category} className="lineup-category-section">
                          <div className="category-header">
                            {/* Pluralize category name if more than one artist */}
                            <h4 className="category-title">
                              {category}
                              {lineups.length > 1 &&
                                (category === "DJ"
                                  ? "s"
                                  : category === "MC"
                                  ? "s"
                                  : category.endsWith("er")
                                  ? "s"
                                  : category.endsWith("y")
                                  ? "ies"
                                  : "s")}
                              <span className="artist-count">
                                ({lineups.length})
                              </span>
                            </h4>
                          </div>
                          <div className="selected-lineups">
                            {lineups.map((lineup) => (
                              <div
                                key={lineup._id}
                                className="selected-lineup-item"
                              >
                                <div className="lineup-avatar">
                                  {lineup.avatar ? (
                                    <img
                                      src={
                                        typeof lineup.avatar === "string"
                                          ? lineup.avatar
                                          : lineup.avatar.medium ||
                                            lineup.avatar.thumbnail
                                      }
                                      alt={lineup.name}
                                    />
                                  ) : (
                                    <div className="avatar-placeholder"></div>
                                  )}
                                </div>
                                <div className="lineup-info">
                                  <span className="lineup-name">
                                    {lineup.name}
                                  </span>
                                  {lineup.subtitle && (
                                    <span className="lineup-subtitle">
                                      {lineup.subtitle}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    );
                  })()}
                </div>
              )}

              {/* Moved button below the selected lineups */}
              <div className="lineup-button-container">
                <button
                  type="button"
                  className="lineup-button"
                  onClick={() => setShowLineUpModal(true)}
                >
                  <RiMusicLine />
                  <span>EDIT LINE UP</span>
                </button>
              </div>
            </div>
            {/* Event Media section - moved after Line Up */}
            <div className="form-section">
              <h3>Event Media</h3>
              <div
                className="flyer-options"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                {FLYER_TYPES.map((type) => (
                  <div
                    key={type.id}
                    className={`flyer-option ${type.id} ${
                      flyerFiles[type.id] || flyerPreviews[type.id]
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => handleFlyerClick(type.id)}
                  >
                    <input
                      type="file"
                      ref={fileInputRefs[type.id]}
                      onChange={(e) => handleFlyerChange(e, type.id)}
                      accept="image/*"
                      style={{ display: "none" }}
                    />
                    <div className={`ratio-preview ratio-${type.id}`}>
                      {flyerPreviews[type.id] ? (
                        <ProgressiveImage
                          thumbnailSrc={flyerPreviews[type.id].thumbnail}
                          mediumSrc={flyerPreviews[type.id].medium}
                          fullSrc={flyerPreviews[type.id].full}
                          blurDataURL={flyerPreviews[type.id].blur}
                          alt={`${type.label} flyer preview`}
                        />
                      ) : (
                        <div className="ratio-placeholder"></div>
                      )}
                    </div>
                    <span className="ratio-text">{type.ratio}</span>
                    {(flyerFiles[type.id] || flyerPreviews[type.id]) && (
                      <>
                        <span className="check-icon">
                          <FaCheck />
                        </span>
                        <button
                          type="button"
                          className="flyer-delete-button"
                          onClick={(e) => handleDeleteFlyer(e, type.id)}
                          title="Delete flyer"
                        >
                          <RiCloseLine />
                        </button>
                      </>
                    )}
                    {uploadProgress[type.id] > 0 &&
                      uploadProgress[type.id] < 100 && (
                        <div className="upload-progress">
                          <div
                            className="progress-bar"
                            style={{ width: `${uploadProgress[type.id]}%` }}
                          />
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </div>

            {/* Music section */}
            <div className="form-section">
              <h3>Music</h3>

              {/* Direct genre selection with minimal design */}
              <div className="genre-selection">
                {loading ? (
                  <div className="loading-message">Loading genres...</div>
                ) : (
                  <>
                    {/* Selected genres */}
                    {selectedGenres.length > 0 && (
                      <div className="selected-genres">
                        {selectedGenres.map((genre) => (
                          <div key={genre._id} className="genre-tag">
                            <RiMusicLine className="icon" />
                            <span>{genre.name}</span>
                            <RiCloseLine
                              className="remove-icon"
                              onClick={() => toggleGenreSelection(genre)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="genre-grid">
                      {allGenres
                        .filter(
                          (genre) =>
                            !selectedGenres.some((g) => g._id === genre._id)
                        )
                        .map((genre) => (
                          <GenreItem
                            key={genre._id}
                            genre={genre}
                            isSelected={false}
                            onSelect={() => toggleGenreSelection(genre)}
                          />
                        ))}

                      {/* Add new genre button */}
                      <div
                        className="genre-item add-new"
                        onClick={() => setShowNewGenreForm(true)}
                      >
                        <RiAddLine className="genre-icon" />
                        <span className="genre-name">Add New</span>
                      </div>
                    </div>
                  </>
                )}

                {/* New genre form */}
                {showNewGenreForm && (
                  <div className="new-genre-form">
                    <input
                      type="text"
                      placeholder="Enter genre name..."
                      value={newGenre || ""}
                      onChange={(e) => setNewGenre(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCreateGenre();
                        }
                      }}
                    />
                    <div className="form-actions">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => {
                          setShowNewGenreForm(false);
                          setNewGenre("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="create-button"
                        onClick={handleCreateGenre}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}

                {/* Edit genre form */}
                {editingGenre && (
                  <div className="new-genre-form">
                    <input
                      type="text"
                      placeholder="Edit genre name..."
                      value={editGenreName || ""}
                      onChange={(e) => setEditGenreName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSaveGenreEdit();
                        }
                      }}
                    />
                    <div className="form-actions">
                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => {
                          setEditingGenre(null);
                          setEditGenreName("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="create-button"
                        onClick={handleSaveGenreEdit}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table Layout section */}
            <div className="form-section">
              <h3>Table Layout</h3>
              <div className="table-layout-selection">
                <label>Choose Table Layout (Optional):</label>
                <div className="layout-cards">
                  {availableTableLayouts.map((layout) => (
                    <div
                      key={layout.id}
                      className={`layout-card ${
                        formData.tableLayout === layout.id ? "selected" : ""
                      }`}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          tableLayout:
                            prev.tableLayout === layout.id ? "" : layout.id,
                        }));
                      }}
                    >
                      <div className="layout-preview">
                        <div className={`layout-mini-map ${layout.id}`}>
                          {layout.id === "studio" && (
                            <>
                              {/* DJ Area */}
                              <div className="mini-section dj-section">
                                <div className="mini-table dj-table"></div>
                                <div className="mini-table dj-table"></div>
                                <div className="mini-table dj-table"></div>
                              </div>
                              {/* VIP Area */}
                              <div className="mini-section vip-section">
                                <div className="mini-table vip-table"></div>
                                <div className="mini-table vip-table"></div>
                              </div>
                              {/* Backstage Area */}
                              <div className="mini-section backstage-section">
                                <div className="mini-table backstage-table"></div>
                                <div className="mini-table backstage-table"></div>
                              </div>
                              {/* Main Floor */}
                              <div className="mini-floor main-floor"></div>
                            </>
                          )}
                          {layout.id === "bolivar" && (
                            <>
                              {/* Main Dance Floor */}
                              <div className="mini-section main-section">
                                <div className="mini-floor dance-floor"></div>
                              </div>
                              {/* VIP Tables */}
                              <div className="mini-section vip-section-left">
                                <div className="mini-table vip-table"></div>
                                <div className="mini-table vip-table"></div>
                              </div>
                              <div className="mini-section vip-section-right">
                                <div className="mini-table vip-table"></div>
                                <div className="mini-table vip-table"></div>
                              </div>
                              {/* DJ Area */}
                              <div className="mini-section dj-section-bottom">
                                <div className="mini-table dj-table"></div>
                                <div className="mini-table dj-table"></div>
                              </div>
                              {/* Bar Area */}
                              <div className="mini-section bar-section">
                                <div className="mini-bar"></div>
                              </div>
                            </>
                          )}
                          {layout.id === "venti" && (
                            <>
                              {/* DJ Area (Red) */}
                              <div className="mini-section dj-section-red">
                                <div className="mini-table dj-table"></div>
                                <div className="mini-table dj-table"></div>
                                <div className="mini-table dj-table"></div>
                                <div className="mini-columns"></div>
                              </div>
                              {/* Dance Floor */}
                              <div className="mini-section dance-section">
                                <div className="mini-floor dance-floor"></div>
                              </div>
                              {/* VIP Area (Green) */}
                              <div className="mini-section vip-section-green">
                                <div className="mini-table vip-table"></div>
                                <div className="mini-table vip-table"></div>
                              </div>
                              {/* Stairs */}
                              <div className="mini-section stairs-section">
                                <div className="mini-stairs"></div>
                              </div>
                              {/* Upstairs (Purple) */}
                              <div className="mini-section upstairs-section">
                                <div className="mini-table upstairs-table"></div>
                                <div className="mini-table upstairs-table"></div>
                                <div className="mini-columns upstairs-columns"></div>
                              </div>
                            </>
                          )}
                          {layout.id === "harlem" && (
                            <>
                              {/* DJ Area (Red) */}
                              <div className="mini-section dj-section-red">
                                <div className="mini-table dj-table"></div>
                                <div className="mini-table dj-table"></div>
                                <div className="mini-table dj-table"></div>
                                <div className="mini-columns"></div>
                              </div>
                              {/* Dance Floor */}
                              <div className="mini-section dance-section">
                                <div className="mini-floor dance-floor"></div>
                              </div>
                              {/* VIP Area (Green) */}
                              <div className="mini-section vip-section-green">
                                <div className="mini-table vip-table"></div>
                                <div className="mini-table vip-table"></div>
                              </div>
                              {/* Stairs */}
                              <div className="mini-section stairs-section">
                                <div className="mini-stairs"></div>
                              </div>
                              {/* Upstairs (Purple) */}
                              <div className="mini-section upstairs-section">
                                <div className="mini-table upstairs-table"></div>
                                <div className="mini-table upstairs-table"></div>
                                <div className="mini-columns upstairs-columns"></div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="layout-info">
                        <h4>{layout.name}</h4>
                        <p>{layout.totalTables}</p>
                      </div>
                      <div
                        className={`selected-indicator ${
                          formData.tableLayout === layout.id ? "visible" : ""
                        }`}
                      >
                        ✓
                      </div>
                    </div>
                  ))}
                </div>
                {formData.tableLayout && (
                  <div className="layout-preview-info">
                    {availableTableLayouts.find(
                      (layout) => layout.id === formData.tableLayout
                    )?.areas && (
                      <div className="layout-areas">
                        <span>Areas: </span>
                        {availableTableLayouts
                          .find((layout) => layout.id === formData.tableLayout)
                          .areas.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Battle Configuration section */}
            <div className="form-section">
              <h3>
                <RiSwordLine /> Battle Configuration
              </h3>

              <div className="battle-toggle">
                <label className="toggle-container">
                  <input
                    type="checkbox"
                    checked={battleConfig.isEnabled}
                    onChange={(e) =>
                      handleBattleConfigChange("isEnabled", e.target.checked)
                    }
                  />
                  <span className="toggle-label">
                    Enable Battle for this Event
                  </span>
                </label>
              </div>

              {battleConfig.isEnabled && (
                <div className="battle-configuration">
                  {/* Basic Info */}
                  <div className="battle-section">
                    <div className="battle-info-grid">
                      <div className="form-group">
                        <label>Battle Title</label>
                        <input
                          type="text"
                          value={battleConfig.title}
                          onChange={(e) =>
                            handleBattleConfigChange("title", e.target.value)
                          }
                          placeholder="Dance Battle"
                        />
                      </div>
                      <div className="form-group">
                        <label>Battle Subtitle</label>
                        <input
                          type="text"
                          value={battleConfig.subtitle}
                          onChange={(e) =>
                            handleBattleConfigChange("subtitle", e.target.value)
                          }
                          placeholder="1 vs 1 Dance Battles"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Battle Description</label>
                      <textarea
                        value={battleConfig.description}
                        onChange={(e) =>
                          handleBattleConfigChange(
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Describe the battle event..."
                        rows="2"
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="battle-section">
                    <h4>
                      <RiTrophyLine /> Battle Categories
                    </h4>
                    <div className="battle-categories">
                      {battleCategories.map((category) => (
                        <div key={category.name} className="battle-category">
                          <div className="category-main">
                            <label className="category-checkbox">
                              <input
                                type="checkbox"
                                checked={battleConfig.categories.includes(
                                  category.name
                                )}
                                onChange={() =>
                                  handleCategoryToggle(category.name)
                                }
                              />
                              <span className="category-name">
                                {category.displayName}
                              </span>
                            </label>
                            <button
                              type="button"
                              className="remove-category"
                              onClick={() =>
                                removeBattleCategory(category.name)
                              }
                              title="Remove category"
                            >
                              <RiCloseLine />
                            </button>
                          </div>

                          {battleConfig.categories.includes(category.name) && (
                            <div className="category-details">
                              <div className="detail-inputs">
                                <div className="input-group">
                                  <label>Prize</label>
                                  <div className="prize-input">
                                    <input
                                      type="number"
                                      value={
                                        category.prizeMoney ||
                                        battleConfig.prizeMoney
                                      }
                                      onChange={(e) =>
                                        handleCategoryUpdate(
                                          category.name,
                                          "prizeMoney",
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      placeholder={battleConfig.prizeMoney.toString()}
                                      min="0"
                                    />
                                    <span className="currency">
                                      {battleConfig.currency}
                                    </span>
                                  </div>
                                </div>
                                <div className="input-group">
                                  <label>Max Participants</label>
                                  <input
                                    type="number"
                                    value={
                                      category.maxParticipants ||
                                      battleConfig.maxParticipantsPerCategory
                                    }
                                    onChange={(e) =>
                                      handleCategoryUpdate(
                                        category.name,
                                        "maxParticipants",
                                        parseInt(e.target.value) || 16
                                      )
                                    }
                                    placeholder={battleConfig.maxParticipantsPerCategory.toString()}
                                    min="1"
                                    max="32"
                                  />
                                </div>
                                <div className="input-group">
                                  <label>Participants Per Signup</label>
                                  <input
                                    type="number"
                                    value={category.participantsPerSignup || 1}
                                    onChange={(e) =>
                                      handleCategoryUpdate(
                                        category.name,
                                        "participantsPerSignup",
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    placeholder="1"
                                    min="1"
                                    max="4"
                                  />
                                  <small>
                                    How many people per registration (e.g., 2
                                    for 2vs2)
                                  </small>
                                </div>
                                <div className="input-group">
                                  <label className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={category.signUpsDone || false}
                                      onChange={(e) =>
                                        handleCategoryUpdate(
                                          category.name,
                                          "signUpsDone",
                                          e.target.checked
                                        )
                                      }
                                    />
                                    <span>Sign Ups Done</span>
                                  </label>
                                  <small>
                                    Check this to close registrations for this
                                    category
                                  </small>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="add-category">
                        {!showAddCategoryForm ? (
                          <button
                            type="button"
                            className="add-category-btn"
                            onClick={() => setShowAddCategoryForm(true)}
                          >
                            <RiAddLine /> Add Category
                          </button>
                        ) : (
                          <div className="add-category-form">
                            <input
                              type="text"
                              placeholder="Display Name (e.g., Hip Hop)"
                              value={newBattleCategory.displayName}
                              onChange={(e) =>
                                setNewBattleCategory((prev) => ({
                                  ...prev,
                                  displayName: e.target.value,
                                  name: e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]/g, ""),
                                }))
                              }
                            />
                            <div className="form-actions">
                              <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => {
                                  setShowAddCategoryForm(false);
                                  setNewBattleCategory({
                                    name: "",
                                    displayName: "",
                                    prizeMoney: 0,
                                    maxParticipants: 16,
                                    participantsPerSignup: 1,
                                  });
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="add-btn"
                                onClick={addBattleCategory}
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div className="battle-section">
                    <h4>
                      <RiCalendarCheckLine /> Registration & Rules
                    </h4>

                    <div className="battle-settings-grid">
                      <div className="form-group">
                        <label>Registration Deadline</label>
                        <DatePicker
                          selected={battleConfig.registrationDeadline}
                          onChange={(date) =>
                            handleBattleConfigChange(
                              "registrationDeadline",
                              date
                            )
                          }
                          showTimeSelect
                          dateFormat="MMM d, yyyy h:mm aa"
                          className="date-picker"
                          placeholderText="No deadline set"
                          isClearable
                        />
                      </div>

                      <div className="form-group">
                        <label className="toggle-container">
                          <input
                            type="checkbox"
                            checked={battleConfig.isRegistrationOpen}
                            onChange={(e) =>
                              handleBattleConfigChange(
                                "isRegistrationOpen",
                                e.target.checked
                              )
                            }
                          />
                          <span className="toggle-label">
                            Registration Open
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Battle Rules</label>
                      <textarea
                        value={battleConfig.battleRules}
                        onChange={(e) =>
                          handleBattleConfigChange(
                            "battleRules",
                            e.target.value
                          )
                        }
                        placeholder="Enter battle rules and regulations..."
                        rows="3"
                      />
                    </div>

                    <div className="form-group">
                      <label>Additional Information</label>
                      <textarea
                        value={battleConfig.additionalInfo}
                        onChange={(e) =>
                          handleBattleConfigChange(
                            "additionalInfo",
                            e.target.value
                          )
                        }
                        placeholder="Any additional information for participants..."
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <LoadingSpinner size="small" />
                ) : event ? (
                  "Update Event"
                ) : (
                  "Create Event"
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>

      {/* LineUp Modal */}
      {showLineUpModal && (
        <LineUp
          key="event-lineup-modal"
          event={event}
          onClose={() => setShowLineUpModal(false)}
          selectedBrand={selectedBrand}
          onSave={handleSaveLineups}
          initialSelectedLineups={selectedLineups}
        />
      )}

      {/* GenreSelector Modal */}
      {showGenreModal && (
        <GenreSelector
          key="event-genre-modal"
          event={event}
          onClose={() => setShowGenreModal(false)}
          selectedBrand={selectedBrand}
          onSave={handleSaveGenres}
          initialSelectedGenres={selectedGenres}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
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
            <h3>Delete Event</h3>
            <p>
              Are you sure you want to delete this event? This will also delete
              all related media and code settings. This action cannot be undone.
            </p>
            <div className="confirmation-actions">
              <motion.button
                className="cancel-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                className="confirm-delete-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  confirmDelete();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Delete Genre Confirmation Dialog */}
      {showDeleteGenreConfirm && genreToDelete && (
        <motion.div
          className="delete-confirmation-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDeleteGenreConfirm(false);
          }}
        >
          <motion.div
            className="delete-confirmation"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => {
              e.preventDefault(); // Add preventDefault
              e.stopPropagation();
            }}
          >
            <h3>Delete Genre</h3>
            <p>
              Are you sure you want to delete the genre "{genreToDelete.name}"?
              This cannot be undone.
            </p>
            <div className="confirmation-actions">
              <motion.button
                className="cancel-btn"
                onClick={(e) => {
                  e.preventDefault(); // Add preventDefault
                  e.stopPropagation();
                  setShowDeleteGenreConfirm(false);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                className="confirm-delete-btn"
                onClick={(e) => {
                  e.preventDefault(); // Add preventDefault
                  e.stopPropagation();
                  confirmDeleteGenre();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EventForm;

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
  onClose,
  onSave,
  selectedBrand,
  weekNumber = 0,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const isChildEvent =
    event?.parentEventId || (event?.isWeekly && weekNumber > 0);
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

    // For backward compatibility: Create start date from event date and start time
    const startDate = eventData.date ? new Date(eventData.date) : new Date();
    if (eventData.startTime) {
      const [startHours, startMinutes] = eventData.startTime
        .split(":")
        .map(Number);
      startDate.setHours(startHours, startMinutes, 0);
    }

    // For backward compatibility: Create end date from event date and end time
    const endDate = eventData.date ? new Date(eventData.date) : new Date();
    if (eventData.endTime) {
      const [endHours, endMinutes] = eventData.endTime.split(":").map(Number);
      // If end time is earlier than start time, it means it's the next day
      endDate.setHours(endHours, endMinutes, 0);
      if (
        endHours < startDate.getHours() ||
        (endHours === startDate.getHours() &&
          endMinutes < startDate.getMinutes())
      ) {
        endDate.setDate(endDate.getDate() + 1);
      }
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = parseEventDateTime(event);

  const [formData, setFormData] = useState({
    title: event?.title || "",
    subTitle: event?.subTitle || "",
    description: event?.description || "",
    startDate: startDate,
    endDate: endDate,
    location: event?.location || "",
    street: event?.street || "",
    postalCode: event?.postalCode || "",
    city: event?.city || "",
    music: event?.music || "",
    isWeekly: event?.isWeekly || false,
    flyer: null,
    guestCode: event?.guestCode || false,
    friendsCode: event?.friendsCode || false,
    ticketCode: event?.ticketCode || false,
    tableCode: event?.tableCode || false,
  });

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

  // Load existing lineups if event exists
  useEffect(() => {
    if (event?._id) {
      // If event already has lineups populated, use those
      if (event.lineups && Array.isArray(event.lineups)) {
        console.log("Using lineups from event object:", event.lineups);
        setSelectedLineups(event.lineups);
      } else {
        // Otherwise, fetch lineups from API
        const fetchEventLineups = async () => {
          try {
            const token = localStorage.getItem("token");
            const response = await axiosInstance.get(
              `/lineup/event/${event._id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            console.log("Fetched lineups from API:", response.data);
            setSelectedLineups(response.data);
          } catch (error) {
            console.error("Error fetching event lineups:", error);
          }
        };

        fetchEventLineups();
      }
    }
  }, [event]);

  // Handle saving selected lineups
  const handleSaveLineups = (lineups) => {
    setSelectedLineups(lineups);
  };

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
      console.error(`Error processing ${type} flyer:`, error);
      toast.showError(error.message);
      e.target.value = "";
    } finally {
      loadingToast.dismiss();
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for event details
      const formDataToSend = new FormData();

      // Format date and times for API
      const date = formData.startDate.toISOString();
      const startDate = formData.startDate.toISOString();
      const endDate = formData.endDate.toISOString();

      // Extract hours and minutes for startTime and endTime
      const startHours = formData.startDate
        .getHours()
        .toString()
        .padStart(2, "0");
      const startMinutes = formData.startDate
        .getMinutes()
        .toString()
        .padStart(2, "0");
      const startTime = `${startHours}:${startMinutes}`;

      const endHours = formData.endDate.getHours().toString().padStart(2, "0");
      const endMinutes = formData.endDate
        .getMinutes()
        .toString()
        .padStart(2, "0");
      const endTime = `${endHours}:${endMinutes}`;

      // Add all the regular form data
      Object.keys(formData).forEach((key) => {
        if (key !== "flyer" && key !== "startDate" && key !== "endDate") {
          if (typeof formData[key] === "boolean") {
            formDataToSend.append(key, formData[key].toString());
          } else {
            formDataToSend.append(key, formData[key]);
          }
        }
      });

      // Add the formatted date and times
      formDataToSend.append("date", date); // For backward compatibility
      formDataToSend.append("startDate", startDate);
      formDataToSend.append("endDate", endDate);
      formDataToSend.append("startTime", startTime);
      formDataToSend.append("endTime", endTime);

      // Add selected lineups to the form data
      if (selectedLineups.length > 0) {
        formDataToSend.append(
          "lineups",
          JSON.stringify(selectedLineups.map((lineup) => lineup._id))
        );
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
        // Convert FormData to plain object for PUT request
        const updateData = {};
        for (const [key, value] of formDataToSend.entries()) {
          if (key === "date") {
            updateData[key] = new Date(value).toISOString();
          } else if (value === "true" || value === "false") {
            updateData[key] = value === "true";
          } else {
            updateData[key] = value;
          }
        }

        // Add selected lineups to the update data
        if (selectedLineups.length > 0) {
          updateData.lineups = selectedLineups.map((lineup) => lineup._id);
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
        // For new events, include flyer files in initial creation
        Object.entries(flyerFiles).forEach(([format, files]) => {
          if (files?.full?.file) {
            formDataToSend.append(`flyer.${format}`, files.full.file);
          }
        });

        eventResponse = await axiosInstance.post(
          `/events/brand/${selectedBrand._id}`,
          formDataToSend,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      await onSave(eventResponse.data);
      onClose();
    } catch (error) {
      throw error; // Let parent handle the error
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

  // Add some additional logging at initialization
  console.log("EventForm received event:", {
    event,
    id: event?._id,
    parentId: event?.parentEventId,
    weekNumber,
    isChildEvent,
    isCalculatedOccurrence:
      !event?._id && event?.parentEventId && weekNumber > 0,
  });

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
          <button className="close-button" onClick={onClose}>
            <RiCloseLine />
          </button>

          <h2>{event ? "Edit Event" : "Create Event"}</h2>

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
            <div className="form-section">
              <h3>{isChildEvent ? "Time" : "Date & Time"}</h3>

              {/* For parent events, show date and time pickers */}
              {!isChildEvent && (
                <>
                  <div className="date-time-container">
                    <div className="date-time-column">
                      <div className="form-group required">
                        <label>Start Date</label>
                        <div className="date-picker-container">
                          <DatePicker
                            selected={formData.startDate}
                            onChange={(date) => {
                              // Keep the time from the current startDate
                              const newDate = new Date(date);
                              newDate.setHours(
                                formData.startDate.getHours(),
                                formData.startDate.getMinutes(),
                                0,
                                0
                              );

                              // If the new start date is after the end date, update end date too
                              const newFormData = {
                                ...formData,
                                startDate: newDate,
                              };
                              if (newDate > formData.endDate) {
                                // Set end date to same day but keep the end time
                                const newEndDate = new Date(newDate);
                                newEndDate.setHours(
                                  formData.endDate.getHours(),
                                  formData.endDate.getMinutes(),
                                  0,
                                  0
                                );
                                newFormData.endDate = newEndDate;
                              }
                              setFormData(newFormData);
                            }}
                            showTimeSelect={false}
                            dateFormat="MMMM d, yyyy"
                            className="date-picker"
                            popperPlacement="bottom-start"
                          />
                          <RiCalendarEventLine className="date-icon" />
                        </div>
                      </div>

                      <div className="form-group required">
                        <label>Start Time</label>
                        <div className="date-picker-container">
                          <DatePicker
                            selected={formData.startDate}
                            onChange={(date) => {
                              // Keep the date from the current startDate
                              const newDate = new Date(formData.startDate);
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
                            selected={formData.endDate}
                            onChange={(date) => {
                              // Keep the time from the current endDate
                              const newDate = new Date(date);
                              newDate.setHours(
                                formData.endDate.getHours(),
                                formData.endDate.getMinutes(),
                                0,
                                0
                              );
                              setFormData({ ...formData, endDate: newDate });
                            }}
                            showTimeSelect={false}
                            dateFormat="MMMM d, yyyy"
                            className="date-picker"
                            minDate={formData.startDate}
                            popperPlacement="bottom-start"
                          />
                          <RiCalendarEventLine className="date-icon" />
                        </div>
                      </div>

                      <div className="form-group required">
                        <label>End Time</label>
                        <div className="date-picker-container">
                          <DatePicker
                            selected={formData.endDate}
                            onChange={(date) => {
                              // Keep the date from the current endDate
                              const newDate = new Date(formData.endDate);
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
                          <RiTimeLine className="date-icon" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {formData.endDate < formData.startDate && (
                    <div className="error-message">
                      End date/time must be after start date/time
                    </div>
                  )}
                </>
              )}

              {/* For child events, only show time pickers */}
              {isChildEvent && (
                <>
                  <div className="form-group required">
                    <label>Start Time</label>
                    <div className="date-picker-container">
                      <DatePicker
                        selected={formData.startDate}
                        onChange={(date) => {
                          // If the new start time is after the end time, update end time too
                          const newFormData = { ...formData, startDate: date };

                          // Compare only hours and minutes
                          const startHours = date.getHours();
                          const startMinutes = date.getMinutes();
                          const endHours = formData.endDate.getHours();
                          const endMinutes = formData.endDate.getMinutes();

                          if (
                            startHours > endHours ||
                            (startHours === endHours &&
                              startMinutes >= endMinutes)
                          ) {
                            // Set end time to 1 hour later
                            const newEndDate = new Date(date);
                            newEndDate.setHours(date.getHours() + 1);
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
                      <BiTime className="date-icon" />
                    </div>
                  </div>

                  <div className="form-group required">
                    <label>End Time</label>
                    <div className="date-picker-container">
                      <DatePicker
                        selected={formData.endDate}
                        onChange={(date) => {
                          setFormData({ ...formData, endDate: date });
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
                </>
              )}

              {/* Only show weekly toggle for parent events */}
              {!isChildEvent && (
                <div className="form-group weekly-event-toggle">
                  <div className="toggle-container">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        name="isWeekly"
                        checked={formData.isWeekly}
                        onChange={handleInputChange}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">Weekly Event</span>
                  </div>
                  {formData.isWeekly && (
                    <p className="toggle-hint">
                      This event will repeat every week
                    </p>
                  )}
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
            {/* Line Up section - moved before Event Media */}
            <div className="form-section">
              <h3>Line Up</h3>

              {/* Display selected lineups */}
              {selectedLineups.length > 0 && (
                <div className="selected-lineups">
                  {selectedLineups.map((lineup) => (
                    <div key={lineup._id} className="selected-lineup-item">
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
                        <span className="lineup-category">
                          {lineup.category}
                        </span>
                        <span className="lineup-name">{lineup.name}</span>
                      </div>
                    </div>
                  ))}
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
              <div className="flyer-options">
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
                    <div className="ratio-preview">
                      {flyerPreviews[type.id] && (
                        <ProgressiveImage
                          thumbnailSrc={flyerPreviews[type.id].thumbnail}
                          mediumSrc={flyerPreviews[type.id].medium}
                          fullSrc={flyerPreviews[type.id].full}
                          blurDataURL={flyerPreviews[type.id].blur}
                          alt={`${type.label} flyer preview`}
                        />
                      )}
                    </div>
                    <span className="ratio-text">{type.ratio}</span>
                    {(flyerFiles[type.id] || flyerPreviews[type.id]) && (
                      <span className="check-icon">
                        <FaCheck />
                      </span>
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
              <div className="form-group">
                <label>Music Genres</label>
                <textarea
                  value={formData.music}
                  onChange={handleInputChange}
                  name="music"
                  placeholder="Enter music genres (e.g., Afrobeats, Amapiano, Dancehall)"
                  rows="3"
                />
              </div>
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
    </AnimatePresence>
  );
};

export default EventForm;

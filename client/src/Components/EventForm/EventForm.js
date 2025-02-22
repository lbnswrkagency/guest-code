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

const EventForm = ({ event, onClose, onSave, selectedBrand }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: event?.title || "",
    subTitle: event?.subTitle || "",
    description: event?.description || "",
    date: event ? new Date(event.date) : new Date(),
    startTime: event?.startTime || "20:00",
    endTime: event?.endTime || "04:00",
    location: event?.location || "",
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
    const loadingToast = toast.showLoading(
      event ? "Updating event..." : "Creating event..."
    );

    try {
      // Create FormData to send files
      const formDataToSend = new FormData();

      // Add all the regular form data
      Object.keys(formData).forEach((key) => {
        if (key !== "flyer") {
          if (key === "date") {
            formDataToSend.append(key, formData[key].toISOString());
          } else {
            formDataToSend.append(key, formData[key]);
          }
        }
      });

      if (event?._id) {
        // If editing, first update the event details
        const updatedEvent = await onSave(formDataToSend);

        // Then upload any new flyers
        for (const [format, files] of Object.entries(flyerFiles)) {
          if (files?.full?.file) {
            const flyerFormData = new FormData();
            flyerFormData.append("flyer", files.full.file);

            console.log(`[EventForm] Attempting to upload ${format} flyer:`, {
              url: `/events/${event._id}/flyer/${format}`,
              fileSize: files.full.file.size,
              fileType: files.full.file.type,
            });

            try {
              const response = await axiosInstance.put(
                `/events/${event._id}/flyer/${format}`,
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

              console.log(
                `[EventForm] ${format} flyer upload response:`,
                response.data
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
              }
            } catch (uploadError) {
              console.error(
                `[EventForm] Error uploading ${format} flyer:`,
                uploadError
              );
              toast.showError(`Failed to upload ${format} flyer`);
            }
          }
        }
      } else {
        // If creating new event, include all flyer files
        Object.entries(flyerFiles).forEach(([format, processedFiles]) => {
          if (processedFiles?.full?.file) {
            formDataToSend.append(
              `flyer.${format}`,
              processedFiles.full.file,
              `${format}.jpg`
            );
          }
        });
        await onSave(formDataToSend);
      }

      toast.showSuccess(
        event ? "Event updated successfully" : "Event created successfully"
      );
      onClose();
    } catch (error) {
      console.error("[EventForm] Error submitting form:", error);
      toast.showError(error.response?.data?.message || "Failed to save event");
    } finally {
      setIsSubmitting(false);
      loadingToast.dismiss();
    }
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
              <h3>Date & Time</h3>
              <div className="form-group required">
                <label>Date</label>
                <div className="input-with-icon">
                  <RiCalendarEventLine />
                  <DatePicker
                    selected={formData.date}
                    onChange={(date) =>
                      setFormData((prev) => ({ ...prev, date }))
                    }
                    dateFormat="MMMM d, yyyy"
                    minDate={new Date()}
                    placeholderText="Select event date"
                    required
                  />
                </div>
              </div>

              <div className="time-inputs">
                <div className="form-group required">
                  <label>Start Time</label>
                  <div className="input-with-icon">
                    <RiTimeLine />
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group required">
                  <label>End Time</label>
                  <div className="input-with-icon">
                    <RiTimeLine />
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group required">
                <label>Location</label>
                <div className="input-with-icon">
                  <RiMapPinLine />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Enter event location"
                    required
                  />
                </div>
              </div>
            </div>

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
    </AnimatePresence>
  );
};

export default EventForm;

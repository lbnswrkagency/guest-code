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

const EventForm = ({ event, onClose, onSave }) => {
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

  const processQueue = useRef([]);
  const abortControllerRef = useRef(null);

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

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const loadingToast = toast.showLoading("Processing...");

    try {
      // Validate file size
      if (file.size > 20 * 1024 * 1024) {
        throw new Error("Max: 20MB");
      }

      const blurPlaceholder = await generateBlurPlaceholder(file);
      const processed = await processImage(file);

      // Create and track blob URLs
      const previewUrls = {
        thumbnail: createAndTrackBlobUrl(processed.thumbnail.file),
        medium: createAndTrackBlobUrl(processed.medium.file),
        full: createAndTrackBlobUrl(processed.full.file),
        blur: createAndTrackBlobUrl(new Blob([blurPlaceholder])),
      };

      // Update state
      setProcessedFiles((prev) => ({
        ...prev,
        [type]: processed,
      }));

      setPreviews((prev) => ({
        ...prev,
        [type]: previewUrls,
      }));

      toast.showSuccess("Done");
    } catch (error) {
      let errorMsg = error.message;
      if (errorMsg.includes("dimensions")) {
        errorMsg = errorMsg.replace(/.*dimensions/i, "Min dimensions:");
      }
      toast.showError(errorMsg);
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
      toast.showError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.showLoading("Saving event...");

    try {
      let updatedFormData = { ...formData };
      const token = localStorage.getItem("token");

      let eventResponse;
      if (event?._id) {
        // Update existing event
        eventResponse = await axiosInstance.put(
          `/events/${event._id}`,
          updatedFormData
        );
      } else {
        // Create new event
        eventResponse = await axiosInstance.post("/events", updatedFormData);
      }

      // Upload flyer images if they exist
      if (Object.values(processedFiles).some((file) => file !== null)) {
        for (const [type, processed] of Object.entries(processedFiles)) {
          if (processed) {
            const formData = new FormData();
            formData.append("flyer", processed.full.file, `${type}.jpg`);
            formData.append("type", type);

            await axiosInstance.put(
              `/events/${eventResponse.data.event._id}/flyer`,
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                  Authorization: `Bearer ${token}`,
                },
              }
            );
          }
        }
      }

      toast.showSuccess(`Event ${event ? "updated" : "created"} successfully!`);
      onSave(eventResponse.data.event);
    } catch (error) {
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
          <div className="form-header">
            <h2>{event ? "Edit Event" : "Create New Event"}</h2>
            <button className="close-button" onClick={onClose}>
              <RiCloseLine />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-section">
                <h3>Event Details</h3>

                <div className="form-group">
                  <label htmlFor="title">Event Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter event title"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subTitle">Subtitle (Optional)</label>
                  <input
                    type="text"
                    id="subTitle"
                    name="subTitle"
                    value={formData.subTitle}
                    onChange={handleInputChange}
                    placeholder="Enter event subtitle"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter event description"
                    rows="4"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="date">Date</label>
                    <div className="input-with-icon">
                      <RiCalendarEventLine />
                      <DatePicker
                        selected={formData.date}
                        onChange={(date) =>
                          setFormData((prev) => ({ ...prev, date }))
                        }
                        dateFormat="MMMM d, yyyy"
                        minDate={new Date()}
                        className="date-picker"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="startTime">Start Time</label>
                    <div className="input-with-icon">
                      <RiTimeLine />
                      <input
                        type="time"
                        id="startTime"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="endTime">End Time</label>
                    <div className="input-with-icon">
                      <RiTimeLine />
                      <input
                        type="time"
                        id="endTime"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="location">Location</label>
                  <div className="input-with-icon">
                    <RiMapPinLine />
                    <input
                      type="text"
                      id="location"
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
                <div className="image-upload-grid">
                  <div className="image-upload-item">
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "landscape")}
                        style={{ display: "none" }}
                      />
                      <div className="upload-preview">
                        {previews.landscape ? (
                          <ProgressiveImage
                            thumbnailSrc={previews.landscape.thumbnail}
                            mediumSrc={previews.landscape.medium}
                            fullSrc={previews.landscape.full}
                            blurDataURL={previews.landscape.blur}
                            alt="Landscape flyer"
                          />
                        ) : (
                          <div className="upload-placeholder">
                            <RiUpload2Line />
                            <span>Landscape Flyer</span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="image-upload-item">
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "portrait")}
                        style={{ display: "none" }}
                      />
                      <div className="upload-preview">
                        {previews.portrait ? (
                          <ProgressiveImage
                            thumbnailSrc={previews.portrait.thumbnail}
                            mediumSrc={previews.portrait.medium}
                            fullSrc={previews.portrait.full}
                            blurDataURL={previews.portrait.blur}
                            alt="Portrait flyer"
                          />
                        ) : (
                          <div className="upload-placeholder">
                            <RiUpload2Line />
                            <span>Portrait Flyer</span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="image-upload-item">
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "square")}
                        style={{ display: "none" }}
                      />
                      <div className="upload-preview">
                        {previews.square ? (
                          <ProgressiveImage
                            thumbnailSrc={previews.square.thumbnail}
                            mediumSrc={previews.square.medium}
                            fullSrc={previews.square.full}
                            blurDataURL={previews.square.blur}
                            alt="Square flyer"
                          />
                        ) : (
                          <div className="upload-placeholder">
                            <RiUpload2Line />
                            <span>Square Flyer</span>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                <h3>Access Control</h3>
                <div className="checkbox-grid">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="guestCode"
                      checked={formData.guestCode}
                      onChange={handleInputChange}
                    />
                    <RiGroupLine /> Guest Code
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="friendsCode"
                      checked={formData.friendsCode}
                      onChange={handleInputChange}
                    />
                    <RiTeamLine /> Friends Code
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="ticketCode"
                      checked={formData.ticketCode}
                      onChange={handleInputChange}
                    />
                    <RiTicketLine /> Ticket Code
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="tableCode"
                      checked={formData.tableCode}
                      onChange={handleInputChange}
                    />
                    <RiVipLine /> Table Code
                  </label>
                </div>
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

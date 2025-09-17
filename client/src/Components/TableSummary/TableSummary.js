import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../../utils/axiosConfig";
import { useToast } from "../Toast/ToastContext";
import "./TableSummary.scss";

function TableSummary({ isOpen, onClose, selectedEvent, selectedBrand }) {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && selectedBrand) {
      fetchBrandEvents();
    }
  }, [isOpen, selectedBrand]);

  const fetchBrandEvents = async () => {
    setIsLoading(true);
    try {
      let eventsToShow = [];
      
      // First, check if selectedEvent has a parentEventId (it's a child event)
      if (selectedEvent?.parentEventId) {
        // This is a child event, fetch all sibling events
        const response = await axiosInstance.get(
          `/events/children/${selectedEvent.parentEventId}`
        );
        
        // Also fetch the parent event
        const parentResponse = await axiosInstance.get(
          `/events/${selectedEvent.parentEventId}`
        );
        
        // Extract parent event data - handle API response format
        const parentEventData = parentResponse.data.success ? parentResponse.data.event : parentResponse.data;
        
        // Combine parent and children
        eventsToShow = [parentEventData, ...response.data];
      } else if (selectedEvent?.isWeekly) {
        // This is a parent weekly event, fetch all its children
        const response = await axiosInstance.get(
          `/events/children/${selectedEvent._id}`
        );
        
        // Combine current event with its children
        eventsToShow = [selectedEvent, ...response.data];
      } else {
        // This is a regular event or we don't have selectedEvent, fetch all brand events
        const response = await axiosInstance.get(
          `/events/brand/${selectedBrand._id}`
        );
        eventsToShow = response.data;
      }
      
      // Sort events by weekNumber for weekly events, then by date
      const sortedEvents = eventsToShow.sort((a, b) => {
        // If both events have weekNumber, sort by weekNumber (most current week first, week 0 last)
        if (a.weekNumber !== undefined && b.weekNumber !== undefined) {
          // If one is week 0 (parent), put it at the end
          if (a.weekNumber === 0 && b.weekNumber !== 0) return 1;
          if (b.weekNumber === 0 && a.weekNumber !== 0) return -1;
          if (a.weekNumber === 0 && b.weekNumber === 0) return 0;
          
          // For non-zero weeks, sort in descending order (highest week first)
          return b.weekNumber - a.weekNumber;
        }
        
        // Otherwise sort by date (newest first)
        const dateA = new Date(a.startDate || a.date);
        const dateB = new Date(b.startDate || b.date);
        return dateB - dateA;
      });
      
      setEvents(sortedEvents);
      
      // Pre-select current event if available
      if (selectedEvent) {
        setSelectedEventIds([selectedEvent._id]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.showError("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const formatEventDate = (event) => {
    // Try startDate first, then date as fallback
    const dateValue = event.startDate || event.date;
    
    if (!dateValue) {
      return "No Date";
    }
    
    // Create date object and check if it's valid
    const date = new Date(dateValue);
    
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    const options = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    };
    
    const formattedDate = date.toLocaleDateString('en-US', options);
    
    // Add week number for weekly events
    if (event.weekNumber !== undefined && event.weekNumber !== null) {
      return `Week ${event.weekNumber}: ${formattedDate}`;
    }
    
    return formattedDate;
  };

  const toggleEventSelection = (eventId) => {
    setSelectedEventIds(prev => {
      if (prev.includes(eventId)) {
        return prev.filter(id => id !== eventId);
      } else {
        return [...prev, eventId];
      }
    });
  };

  const handleGenerateSummary = async () => {
    if (selectedEventIds.length === 0) {
      toast.showError("Please select at least one event");
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.showLoading("Generating table summary PDF...");

    try {
      const response = await axiosInstance.post(
        '/table/summary/generate-pdf',
        { eventIds: selectedEventIds },
        { responseType: 'blob' }
      );

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with brand name and date
      const brandName = selectedBrand?.name || 'Brand';
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `${brandName}_Table_Summary_${date}.pdf`);
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

      loadingToast.dismiss();
      toast.showSuccess("Table summary PDF generated successfully!");
      onClose();
    } catch (error) {
      loadingToast.dismiss();
      console.error("Error generating summary:", error);
      toast.showError("Failed to generate table summary");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="table-summary-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="table-summary-modal"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>Table Summary Analysis</h2>
            <button className="close-btn" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="modal-content">
            {isLoading ? (
              <div className="loading-state">
                <p>Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="empty-state">
                <p>No events found for this brand</p>
              </div>
            ) : (
              <>
                <p className="instructions">
                  Select the events you want to include in the table summary report:
                </p>
                
                <div className="top-controls">
                  <button 
                    className="select-all-btn-top"
                    onClick={() => {
                      if (selectedEventIds.length === events.length) {
                        // If all selected, deselect all
                        setSelectedEventIds([]);
                      } else {
                        // Select all events
                        setSelectedEventIds(events.map(event => event._id));
                      }
                    }}
                    disabled={events.length === 0}
                  >
                    {selectedEventIds.length === events.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="events-grid">
                  {events.map((event) => {
                    const isSelected = selectedEventIds.includes(event._id);
                    const hasWeeklyEvents = event.isWeekly;
                    
                    return (
                      <motion.button
                        key={event._id}
                        className={`event-button ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleEventSelection(event._id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="event-date">
                          {formatEventDate(event)}
                        </div>
                        <div className="event-title">
                          {event.title}
                        </div>
                        {hasWeeklyEvents && (
                          <div className="weekly-badge">
                            Weekly Series
                          </div>
                        )}
                        {isSelected && (
                          <div className="check-mark">
                            ✓
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="selection-info">
                  <p>{selectedEventIds.length} event{selectedEventIds.length !== 1 ? 's' : ''} selected</p>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button 
              className="cancel-btn" 
              onClick={onClose}
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button 
              className="generate-btn"
              onClick={handleGenerateSummary}
              disabled={isLoading || selectedEventIds.length === 0 || isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate PDF"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TableSummary;
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiEditLine,
  RiTicketLine,
  RiPaletteLine,
  RiTimeLine,
  RiCalendarEventLine,
  RiPriceTag3Line,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiInformationLine,
  RiImageLine,
  RiLockLine,
  RiLockUnlockLine,
  RiUserLine,
  RiGroupLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiSaveLine,
  RiAlarmLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDragMove2Line,
  RiWalletLine,
  RiDoorLine,
  RiSettings4Line,
  RiEyeLine,
  RiEyeOffLine,
} from "react-icons/ri";
import "./TicketCodeSettings.scss";
import { useToast } from "../Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import CreateTicketDialog from "../CreateTicketDialog/CreateTicketDialog";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { FaUserFriends } from "react-icons/fa";

// A better implementation of StrictModeDroppable that avoids React warnings
const StrictModeDroppable = ({ children, droppableId }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to delay enabling the droppable
    // This works around the issue with React.StrictMode
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  // Don't render anything until after the first animation frame
  if (!enabled) {
    return null;
  }

  // Only pass the required props to Droppable to avoid issues with defaultProps
  return (
    <Droppable droppableId={droppableId}>
      {(provided, snapshot) => children(provided, snapshot)}
    </Droppable>
  );
};

const TicketCodeSettings = ({ event, codeSetting, onSave, onCancel }) => {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketToEdit, setTicketToEdit] = useState(null);
  const [expandedTickets, setExpandedTickets] = useState({});
  const [globalPaymentMethod, setGlobalPaymentMethod] = useState("online"); // Default to online
  const [globalDoorPrice, setGlobalDoorPrice] = useState(""); // Add global door price state
  const [parentTickets, setParentTickets] = useState([]); // Store parent event tickets
  const [showCopyFromParent, setShowCopyFromParent] = useState(false); // Show copy button

  useEffect(() => {
    fetchTickets();
    // If this is a child event, also fetch parent tickets to offer as a template
    if (event.parentEventId || event.sourceEventId) {
      fetchParentTickets();
    }
  }, [event._id, codeSetting._id]);

  const fetchTickets = async () => {
    try {
      const response = await axiosInstance.get(
        `/ticket-settings/events/${event._id}`
      );
      let fetchedTickets = response.data.ticketSettings || [];

      // Sort tickets by sortOrder if available, otherwise use the order from the API
      fetchedTickets = fetchedTickets.sort((a, b) =>
        a.sortOrder !== undefined && b.sortOrder !== undefined
          ? a.sortOrder - b.sortOrder
          : 0
      );

      setTickets(fetchedTickets);
      
      // Show copy from parent button if this is a child event with no tickets
      if ((event.parentEventId || event.sourceEventId) && fetchedTickets.length === 0) {
        setShowCopyFromParent(true);
      }

      // If any tickets exist, get the payment method from the first ticket
      // as it should be the same for all tickets
      if (fetchedTickets.length > 0 && fetchedTickets[0].paymentMethod) {
        setGlobalPaymentMethod(fetchedTickets[0].paymentMethod);
      }

      // Get the global door price if any ticket has a doorPrice set
      if (fetchedTickets.length > 0 && fetchedTickets[0].doorPrice) {
        setGlobalDoorPrice(fetchedTickets[0].doorPrice.toString());
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.showError("Failed to load tickets");
    }
  };

  const fetchParentTickets = async () => {
    try {
      const parentId = event.parentEventId || event.sourceEventId;
      if (!parentId) return;

      const response = await axiosInstance.get(
        `/ticket-settings/events/${parentId}`
      );
      const parentTicketData = response.data.ticketSettings || [];
      setParentTickets(parentTicketData);
    } catch (error) {
      console.error("Error fetching parent tickets:", error);
      // Silently fail - this is just a convenience feature
    }
  };

  const handleAddTicket = () => {
    setTicketToEdit(null);
    setShowCreateDialog(true);
  };

  const handleCopyFromParent = async () => {
    if (!parentTickets || parentTickets.length === 0) {
      toast.showError("No parent tickets available to copy");
      return;
    }

    try {
      // Copy each parent ticket to this event
      const copyPromises = parentTickets.map(async (parentTicket, index) => {
        const { _id, eventId, createdAt, updatedAt, __v, ...ticketData } = parentTicket;
        
        // Set sortOrder based on index
        ticketData.sortOrder = index;
        
        return axiosInstance.post(
          `/ticket-settings/events/${event._id}`,
          ticketData
        );
      });

      await Promise.all(copyPromises);
      
      // Refresh tickets
      await fetchTickets();
      setShowCopyFromParent(false);
      
      toast.showSuccess(`Copied ${parentTickets.length} ticket${parentTickets.length > 1 ? 's' : ''} from parent event`);
    } catch (error) {
      console.error("Error copying parent tickets:", error);
      toast.showError("Failed to copy tickets from parent event");
    }
  };

  const handleEditTicket = (ticket) => {
    setTicketToEdit(ticket);
    setShowCreateDialog(true);
  };

  const handleDeleteTicket = (ticket) => {
    setActiveTicket(ticket._id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTicket = async () => {
    try {
      const response = await axiosInstance.delete(
        `/ticket-settings/events/${event._id}/${activeTicket}`
      );

      if (response.data.ticketSettings) {
        setTickets(response.data.ticketSettings);
      } else {
        setTickets(tickets.filter((ticket) => ticket._id !== activeTicket));
      }

      setShowDeleteDialog(false);
      setActiveTicket(null);
      toast.showSuccess("Ticket deleted successfully");
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast.showError("Failed to delete ticket");
    }
  };

  const handleSaveTicket = async (ticketData) => {
    try {
      let response;

      // Combine date and time for endDate if hasCountdown is true
      if (ticketData.hasCountdown && ticketData.endDate && ticketData.endTime) {
        const [year, month, day] = (
          ticketData.endDate instanceof Date
            ? ticketData.endDate.toISOString().split("T")[0]
            : ticketData.endDate
        ).split("-");
        const [hours, minutes] = ticketData.endTime.split(":");

        const combinedDate = new Date(year, month - 1, day, hours, minutes);
        ticketData.endDate = combinedDate.toISOString();
      }

      // Remove endTime as it's not in the backend model
      const { endTime, ...dataToSend } = ticketData;

      // Set sortOrder for new tickets
      if (!ticketToEdit) {
        // Find the highest sortOrder and add 1
        const maxSortOrder = Math.max(
          0,
          ...tickets.map((t) => t.sortOrder || 0)
        );
        dataToSend.sortOrder = maxSortOrder + 1;
      }

      // Always use the global payment method
      dataToSend.paymentMethod = globalPaymentMethod;

      // Always use the global door price if it exists
      if (globalDoorPrice) {
        dataToSend.doorPrice = parseFloat(globalDoorPrice);
      }

      if (ticketToEdit) {
        // Update existing ticket
        response = await axiosInstance.put(
          `/ticket-settings/events/${event._id}/${ticketToEdit._id}`,
          dataToSend
        );
      } else {
        // Create new ticket
        response = await axiosInstance.post(
          `/ticket-settings/events/${event._id}`,
          dataToSend
        );
      }

      if (response.data.ticketSettings) {
        setTickets(response.data.ticketSettings);
        toast.showSuccess(
          ticketToEdit
            ? "Ticket updated successfully"
            : "Ticket added successfully"
        );
      }

      setShowCreateDialog(false);
      setTicketToEdit(null);
    } catch (error) {
      console.error("Error saving ticket:", error);
      toast.showError(error.response?.data?.message || "Failed to save ticket");
    }
  };

  // Update payment method for all tickets
  const updateAllTicketsPaymentMethod = async (method) => {
    try {
      setGlobalPaymentMethod(method);

      // If no tickets exist yet, no need to update
      if (tickets.length === 0) return;

      // Update each ticket with the new payment method
      const updatePromises = tickets.map((ticket) =>
        axiosInstance.put(
          `/ticket-settings/events/${event._id}/${ticket._id}`,
          {
            paymentMethod: method,
          }
        )
      );

      await Promise.all(updatePromises);

      // Refresh tickets
      fetchTickets();

      toast.showSuccess("Payment method updated for all tickets");
    } catch (error) {
      console.error("Error updating payment method:", error);
      toast.showError("Failed to update payment method");
    }
  };

  // New function to update door price for all tickets
  const updateAllTicketsDoorPrice = async (doorPrice) => {
    try {
      setGlobalDoorPrice(doorPrice);

      // If no tickets exist yet, no need to update
      if (tickets.length === 0) return;

      // Update each ticket with the new door price
      const updatePromises = tickets.map((ticket) =>
        axiosInstance.put(
          `/ticket-settings/events/${event._id}/${ticket._id}`,
          {
            doorPrice: doorPrice === "" ? null : parseFloat(doorPrice),
          }
        )
      );

      await Promise.all(updatePromises);

      // Refresh tickets
      fetchTickets();

      toast.showSuccess("Door price updated for all tickets");
    } catch (error) {
      console.error("Error updating door price:", error);
      toast.showError("Failed to update door price");
    }
  };

  // Handle drag end for reordering tickets
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(tickets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the sortOrder of all items
    const updatedItems = items.map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    // Update state optimistically
    setTickets(updatedItems);

    // Save the new order to the backend
    try {
      // Use query parameter ?action=reorder instead of a path parameter
      const response = await axiosInstance.put(
        `/ticket-settings/events/${event._id}?action=reorder`,
        {
          tickets: updatedItems.map((ticket) => ({
            _id: ticket._id,
            sortOrder: ticket.sortOrder,
          })),
        }
      );

      if (!response.data.success && response.status !== 200) {
        toast.showError("Failed to save ticket order");
        fetchTickets(); // Refresh if failed
      }
    } catch (error) {
      console.error("Error saving ticket order:", error);
      toast.showError("Failed to save ticket order");
      // Don't refetch immediately to avoid UI disruption
    }
  };

  const toggleTicketDetails = (ticketId) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  // Add handler for toggling visibility
  const handleToggleVisibility = async (ticketId, currentVisibility) => {
    try {
      const response = await axiosInstance.patch(
        `/ticket-settings/events/${event._id}/${ticketId}/toggle-visibility`
      );

      if (response.data.ticketSetting) {
        // Update the state locally for immediate feedback
        setTickets((prevTickets) =>
          prevTickets.map((t) =>
            t._id === ticketId
              ? { ...t, isVisible: response.data.ticketSetting.isVisible }
              : t
          )
        );
        toast.showSuccess(response.data.message);
      } else {
        toast.showError("Failed to update visibility status.");
      }
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast.showError(
        error.response?.data?.message || "Failed to toggle visibility."
      );
    }
  };

  const renderGlobalSettings = () => {
    return (
      <div className="global-settings-section">
        <div className="global-settings-title">
          <RiSettings4Line />
          <span>Payment Methods</span>
        </div>

        <div>
          <label>Available payment options for this event:</label>
          <div className="payment-method-selector">
            <div
              className={`payment-option ${
                globalPaymentMethod === "online" ? "selected" : ""
              }`}
              onClick={() => updateAllTicketsPaymentMethod("online")}
            >
              <RiWalletLine />
              <span>Online Payment</span>
            </div>
            <div
              className={`payment-option ${
                globalPaymentMethod === "atEntrance" ? "selected" : ""
              }`}
              onClick={() => updateAllTicketsPaymentMethod("atEntrance")}
            >
              <RiDoorLine />
              <span>Pay at Entrance</span>
            </div>
          </div>
          <small className="help-text">
            Select the payment method for all tickets in this event.
          </small>

          <div className="door-price-input">
            <label>
              Door Price (€) <small>(Abendkasse)</small>
            </label>
            <div className="input-with-icon">
              <RiMoneyDollarCircleLine />
              <input
                type="number"
                value={globalDoorPrice}
                onChange={(e) => setGlobalDoorPrice(e.target.value)}
                onBlur={() => updateAllTicketsDoorPrice(globalDoorPrice)}
                placeholder="35.00"
                min="0"
                step="0.01"
              />
            </div>
            <small className="help-text">
              Set a price for customers who pay at the door. This encourages early online purchases.
            </small>
          </div>
          <div className="door-price-note">
            <RiInformationLine />
            <span>
              This door price will be shown to customers to encourage online ticket purchases.
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderTicketList = () => {
    return (
      <div className="ticketCodeSettings-list">
        {/* Show copy from parent button if available */}
        {showCopyFromParent && parentTickets.length > 0 && tickets.length === 0 && (
          <div className="copy-from-parent-section">
            <div className="copy-from-parent-info">
              <RiInformationLine />
              <p>This event has no tickets yet. You can copy tickets from the parent event as a starting point.</p>
            </div>
            <button 
              className="copy-from-parent-button"
              onClick={handleCopyFromParent}
            >
              <RiTicketLine />
              <span>Copy {parentTickets.length} ticket{parentTickets.length > 1 ? 's' : ''} from parent event</span>
            </button>
          </div>
        )}
        
        <DragDropContext onDragEnd={handleDragEnd}>
          <StrictModeDroppable droppableId="tickets">
            {(provided, snapshot) => (
              <div
                className="ticketCodeSettings-container"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {tickets.map((ticket, index) => (
                  <Draggable
                    key={ticket._id.toString()}
                    draggableId={ticket._id.toString()}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`ticketCodeSettings-item ${
                          snapshot.isDragging ? "is-dragging" : ""
                        } ${!ticket.isVisible ? "not-visible" : ""}`}
                        style={{
                          ...provided.draggableProps.style,
                          "--ticket-color": ticket.color || "#2196F3",
                        }}
                      >
                        <div
                          className="ticketCodeSettings-drag-handle"
                          {...provided.dragHandleProps}
                        >
                          <RiDragMove2Line />
                        </div>

                        <div className="ticketCodeSettings-content">
                          <div className="ticket-main-info">
                            <div className="ticket-title-section">
                              <h4>{ticket.name}</h4>

                              {ticket.paxPerTicket > 1 && (
                                <div className="ticket-group-badge">
                                  <FaUserFriends />
                                  <span>{ticket.paxPerTicket} people</span>
                                </div>
                              )}
                            </div>

                            <div className="ticket-price-section">
                              <div className="current-price">
                                {parseFloat(ticket.price).toFixed(2)}€
                              </div>
                              {ticket.originalPrice &&
                                ticket.originalPrice > ticket.price && (
                                  <div className="original-price">
                                    {parseFloat(ticket.originalPrice).toFixed(
                                      2
                                    )}
                                    €
                                  </div>
                                )}
                              {ticket.doorPrice &&
                                ticket.doorPrice > ticket.price && (
                                  <div className="door-price">
                                    At door:{" "}
                                    {parseFloat(ticket.doorPrice).toFixed(2)}€
                                  </div>
                                )}
                            </div>
                          </div>

                          <div className="ticketCodeSettings-actions">
                            <button
                              className={`visibility-button ${
                                ticket.isVisible ? "visible" : "hidden"
                              }`}
                              onClick={() =>
                                handleToggleVisibility(
                                  ticket._id,
                                  ticket.isVisible
                                )
                              }
                              aria-label={
                                ticket.isVisible ? "Hide ticket" : "Show ticket"
                              }
                            >
                              {ticket.isVisible ? (
                                <RiEyeLine />
                              ) : (
                                <RiEyeOffLine />
                              )}
                            </button>
                            <button
                              className="edit-button"
                              onClick={() => handleEditTicket(ticket)}
                              aria-label="Edit ticket"
                            >
                              <RiEditLine />
                            </button>
                            <button
                              className="delete-button"
                              onClick={() => handleDeleteTicket(ticket)}
                              aria-label="Delete ticket"
                            >
                              <RiDeleteBinLine />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}

                <div className="add-ticket-button-container">
                  <button
                    className="add-ticket-button"
                    onClick={handleAddTicket}
                  >
                    <RiAddLine />
                    <span>Add Ticket</span>
                  </button>
                </div>
              </div>
            )}
          </StrictModeDroppable>
        </DragDropContext>
      </div>
    );
  };

  return (
    <div className="ticket-code-settings">
      {renderGlobalSettings()}
      {renderTicketList()}

      {showCreateDialog && (
        <CreateTicketDialog
          onClose={() => setShowCreateDialog(false)}
          onSave={handleSaveTicket}
          initialData={ticketToEdit || {}}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Ticket"
          message="Are you sure you want to delete this ticket? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDeleteTicket}
          onCancel={() => setShowDeleteDialog(false)}
          isDangerous={true}
        />
      )}
    </div>
  );
};

export default TicketCodeSettings;

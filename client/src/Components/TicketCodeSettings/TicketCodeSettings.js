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
} from "react-icons/ri";
import "./TicketCodeSettings.scss";
import { useToast } from "../Toast/ToastContext";
import axiosInstance from "../../utils/axiosConfig";
import ConfirmDialog from "../ConfirmDialog/ConfirmDialog";
import CreateTicketDialog from "../CreateTicketDialog/CreateTicketDialog";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Fix StrictMode issue with react-beautiful-dnd
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};

const TicketCodeSettings = ({ event, codeSetting, onSave, onCancel }) => {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketToEdit, setTicketToEdit] = useState(null);
  const [expandedTickets, setExpandedTickets] = useState({});

  useEffect(() => {
    fetchTickets();
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
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.showError("Failed to load tickets");
    }
  };

  const handleAddTicket = () => {
    setTicketToEdit(null);
    setShowCreateDialog(true);
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
      const response = await axiosInstance.put(
        `/ticket-settings/events/${event._id}/reorder`,
        {
          tickets: updatedItems.map((item) => ({
            _id: item._id,
            sortOrder: item.sortOrder,
          })),
        }
      );

      if (!response.data.success) {
        toast.showError("Failed to save ticket order");
        fetchTickets(); // Refresh if failed
      }
    } catch (error) {
      console.error("Error saving ticket order:", error);
      toast.showError("Failed to save ticket order");
      fetchTickets(); // Refresh from server on error
    }
  };

  const toggleTicketDetails = (ticketId) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  const renderTicketList = () => {
    return (
      <div className="ticketCodeSettings-list">
        <DragDropContext onDragEnd={handleDragEnd}>
          <StrictModeDroppable droppableId="tickets">
            {(provided) => (
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
                        }`}
                        style={{
                          ...provided.draggableProps.style,
                          "--ticket-color": ticket.color || "#2196F3",
                        }}
                      >
                        <div className="ticketCodeSettings-header">
                          <div
                            className="ticketCodeSettings-drag-handle"
                            {...provided.dragHandleProps}
                            title="Drag to reorder"
                          >
                            <RiDragMove2Line />
                          </div>

                          <div
                            className="ticketCodeSettings-icon"
                            style={{
                              backgroundColor: `${ticket.color}15`,
                            }}
                            onClick={() => toggleTicketDetails(ticket._id)}
                          >
                            <RiTicketLine />
                          </div>

                          <div
                            className="ticketCodeSettings-content"
                            onClick={() => toggleTicketDetails(ticket._id)}
                          >
                            <div className="ticketCodeSettings-title-container">
                              <div className="ticketCodeSettings-title">
                                <h4>{ticket.name}</h4>
                                {ticket.paxPerTicket > 1 && (
                                  <div className="ticketCodeSettings-group-badge">
                                    <RiGroupLine /> {ticket.paxPerTicket} people
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="ticketCodeSettings-price">
                              <span
                                className="ticketCodeSettings-current-price"
                                style={{ color: ticket.color || "#2196F3" }}
                              >
                                {typeof ticket.price === "number"
                                  ? ticket.price.toFixed(2)
                                  : parseFloat(ticket.price).toFixed(2)}
                                €
                              </span>
                              {ticket.originalPrice && (
                                <span className="ticketCodeSettings-original-price">
                                  {typeof ticket.originalPrice === "number"
                                    ? ticket.originalPrice.toFixed(2)
                                    : parseFloat(ticket.originalPrice).toFixed(
                                        2
                                      )}
                                  €
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="ticketCodeSettings-actions">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTicket(ticket);
                              }}
                              title="Edit Ticket"
                            >
                              <RiEditLine />
                            </button>
                            <button
                              className="ticketCodeSettings-delete-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTicket(ticket);
                              }}
                              title="Delete Ticket"
                            >
                              <RiDeleteBinLine />
                            </button>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedTickets[ticket._id] && (
                            <motion.div
                              className="ticketCodeSettings-details"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              {ticket.description && (
                                <div className="ticketCodeSettings-detail-item">
                                  <RiInformationLine />
                                  <div className="ticketCodeSettings-detail-content">
                                    <div className="ticketCodeSettings-label">
                                      Description
                                    </div>
                                    <div
                                      className="ticketCodeSettings-value"
                                      style={{ whiteSpace: "pre-wrap" }}
                                    >
                                      {ticket.description}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {ticket.hasCountdown && ticket.endDate && (
                                <div className="ticketCodeSettings-detail-item">
                                  <RiTimeLine />
                                  <div className="ticketCodeSettings-detail-content">
                                    <div className="ticketCodeSettings-label">
                                      Ends
                                    </div>
                                    <div className="ticketCodeSettings-value">
                                      {new Date(
                                        ticket.endDate
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {ticket.isLimited && (
                                <div className="ticketCodeSettings-detail-item">
                                  <RiGroupLine />
                                  <div className="ticketCodeSettings-detail-content">
                                    <div className="ticketCodeSettings-label">
                                      Availability
                                    </div>
                                    <div className="ticketCodeSettings-value">
                                      {ticket.soldCount}/{ticket.maxTickets}{" "}
                                      sold
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="ticketCodeSettings-detail-item">
                                <RiUserLine />
                                <div className="ticketCodeSettings-detail-content">
                                  <div className="ticketCodeSettings-label">
                                    Purchase Limits
                                  </div>
                                  <div className="ticketCodeSettings-value">
                                    {ticket.minPurchase} - {ticket.maxPurchase}{" "}
                                    per order
                                  </div>
                                </div>
                              </div>
                              <div className="ticketCodeSettings-detail-item">
                                <RiGroupLine />
                                <div className="ticketCodeSettings-detail-content">
                                  <div className="ticketCodeSettings-label">
                                    Group Ticket
                                  </div>
                                  <div className="ticketCodeSettings-value">
                                    {ticket.paxPerTicket || 1}{" "}
                                    {ticket.paxPerTicket > 1
                                      ? "people"
                                      : "person"}{" "}
                                    per ticket
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </StrictModeDroppable>
        </DragDropContext>

        <div className="ticketCodeSettings-btn-container">
          <button
            className="ticketCodeSettings-add-btn"
            onClick={handleAddTicket}
          >
            <RiAddLine /> Add Ticket
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="ticket-code-settings">
      {renderTicketList()}

      <AnimatePresence>
        {showCreateDialog && (
          <CreateTicketDialog
            onClose={() => setShowCreateDialog(false)}
            onSave={handleSaveTicket}
            initialData={ticketToEdit || {}}
          />
        )}
      </AnimatePresence>

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
